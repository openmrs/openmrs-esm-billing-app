import { expect } from '@playwright/test';
import { test } from '../core/test';
import { BillingFormPage, InvoicePage, PaymentPage } from '../pages';
import { deleteBill, waitForSuccessNotification, extractNumericValue, getBillableService } from '../commands';

test.describe('Create and Pay Bill', () => {
  let billUuid: string;
  let testServiceName: string;

  test.beforeAll(async ({ api }) => {
    // Get the configured test service details
    const serviceUuid = process.env.E2E_TEST_SERVICE_UUID;
    if (!serviceUuid) {
      throw new Error('E2E_TEST_SERVICE_UUID must be configured in .env file');
    }
    const service = await getBillableService(api, serviceUuid);
    testServiceName = service.name;
  });

  test.afterEach(async ({ api }) => {
    // Cleanup: delete the bill if it was created
    if (billUuid) {
      await deleteBill(api, billUuid);
    }
  });

  test('Create a bill with single line item and process full payment', async ({ page, api, patient }) => {
    const billingFormPage = new BillingFormPage(page);
    const invoicePage = new InvoicePage(page);
    const paymentPage = new PaymentPage(page);
    const patientUuid = patient.uuid;

    await test.step('When I navigate to the Billing history page', async () => {
      await page.goto(`patient/${patientUuid}/chart/Billing history`);
    });

    await test.step('And I click the Launch bill form button', async () => {
      const createBillButton = page.getByRole('button', { name: /launch bill form|add bill/i });
      await createBillButton.click();
    });

    await test.step('And I add a billable service', async () => {
      await billingFormPage.searchAndSelectBillableService(testServiceName);
      await expect(billingFormPage.billableServicesCombobox()).toBeVisible();
      await expect(page.getByText(testServiceName, { exact: false })).toBeVisible();
      await billingFormPage.selectPaymentMethodIfVisible();
    });

    await test.step('Then I should see the grand total', async () => {
      const grandTotal = await billingFormPage.getGrandTotal();
      expect(grandTotal).toBeTruthy();
    });

    await test.step('When I save the bill', async () => {
      await billingFormPage.saveBill();
      await waitForSuccessNotification(page, 'Bill processed successfully');
    });

    await test.step('Then the bill should be created', async () => {
      const billsResponse = await api.get(`billing/bill?patient=${patientUuid}&v=full`);
      expect(billsResponse.ok()).toBeTruthy();
      const billsData = await billsResponse.json();
      expect(billsData.results.length).toBeGreaterThan(0);

      const bill = billsData.results[0];
      billUuid = bill.uuid;
    });

    await test.step('When I navigate to the invoice page', async () => {
      await invoicePage.goto(patientUuid, billUuid);
      await invoicePage.waitForInvoiceToLoad();
    });

    await test.step('Then I should see the invoice details', async () => {
      const invoiceStatus = await invoicePage.getInvoiceStatus();
      expect(invoiceStatus).toBe('PENDING');

      const totalAmount = await invoicePage.getTotalAmount();
      expect(totalAmount).toBeTruthy();

      const amountDue = await invoicePage.getAmountDue();
      expect(amountDue).toEqual(totalAmount);
    });

    await test.step('When I process full payment', async () => {
      const totalAmount = await invoicePage.getTotalAmount();
      const totalValue = extractNumericValue(totalAmount);
      await paymentPage.addPayment('Cash', totalValue);
      await expect(paymentPage.processPaymentButton()).toBeEnabled();
      await paymentPage.processPayment();
      await waitForSuccessNotification(page, 'Payment processed successfully');
    });

    await test.step('Then the bill should be marked as paid', async () => {
      await page.reload();
      await invoicePage.waitForInvoiceToLoad();

      const updatedStatus = await invoicePage.getInvoiceStatus();
      expect(updatedStatus).toBe('PAID');

      const totalAmount = await invoicePage.getTotalAmount();
      const updatedAmountTendered = await invoicePage.getAmountTendered();
      expect(updatedAmountTendered).toEqual(totalAmount);

      const updatedAmountDue = await invoicePage.getAmountDue();
      expect(extractNumericValue(updatedAmountDue)).toBe(0);
    });

    await test.step('And the payment should appear in history', async () => {
      const paymentHistory = await paymentPage.getPaymentHistory();
      expect(paymentHistory.length).toBeGreaterThan(0);
      expect(paymentHistory[0].method).toContain('Cash');
    });
  });

  test('Create a bill with quantity update', async ({ page, api, patient }) => {
    const billingFormPage = new BillingFormPage(page);
    const invoicePage = new InvoicePage(page);
    const patientUuid = patient.uuid;

    await test.step('When I navigate to the patient billing history', async () => {
      await page.goto(`patient/${patientUuid}/chart/Billing history`);
    });

    await test.step('And I click the Launch bill form button', async () => {
      const createBillButton = page.getByRole('button', { name: /launch bill form|add bill/i });
      await createBillButton.click();
    });

    await test.step('And I add a billable service and update quantity to 2', async () => {
      await billingFormPage.searchAndSelectBillableService(testServiceName);
      await expect(page.getByText(testServiceName, { exact: false })).toBeVisible();
      await billingFormPage.selectPaymentMethodIfVisible();

      // Update quantity to 2
      const quantityInput = page.locator('input[type="number"]').first();
      await expect(quantityInput).toHaveValue('1');
      await quantityInput.fill('2');
      await expect(quantityInput).toHaveValue('2');
    });

    await test.step('When I save the bill', async () => {
      await billingFormPage.saveBill();
      await waitForSuccessNotification(page, 'Bill processed successfully');
    });

    await test.step('Then the bill should be created with quantity 2', async () => {
      const billsResponse = await api.get(`billing/bill?patient=${patientUuid}&v=full`);
      const billsData = await billsResponse.json();
      billUuid = billsData.results[0].uuid;

      await invoicePage.goto(patientUuid, billUuid);
      await invoicePage.waitForInvoiceToLoad();

      const lineItems = await invoicePage.getLineItems();
      expect(lineItems.length).toBe(1);
      expect(lineItems[0].quantity).toBe('2');
    });
  });

  test('Discard bill without saving', async ({ page, api, patient }) => {
    const billingFormPage = new BillingFormPage(page);
    const patientUuid = patient.uuid;
    let initialBillCount: number;

    await test.step('Given I check the initial bill count', async () => {
      const billsResponse = await api.get(`billing/bill?patient=${patientUuid}&v=full`);
      const billsData = await billsResponse.json();
      initialBillCount = billsData.results.length;
    });

    await test.step('When I navigate to the patient billing history', async () => {
      await page.goto(`patient/${patientUuid}/chart/Billing history`);
    });

    await test.step('And I click the Launch bill form button', async () => {
      const createBillButton = page.getByRole('button', { name: /launch bill form|add bill/i });
      await createBillButton.click();
    });

    await test.step('And I add a billable service', async () => {
      await billingFormPage.searchAndSelectBillableService(testServiceName);
      await expect(page.getByText(testServiceName, { exact: false })).toBeVisible();
      await billingFormPage.selectPaymentMethodIfVisible();
    });

    await test.step('When I discard the bill', async () => {
      await billingFormPage.discardBill();
      // Wait for the form to close by checking the discard button is hidden
      await expect(billingFormPage.discardButton()).toBeHidden();
    });

    await test.step('Then the bill should not be created', async () => {
      const billsResponse = await api.get(`billing/bill?patient=${patientUuid}&v=full`);
      expect(billsResponse.ok()).toBeTruthy();
      const billsData = await billsResponse.json();
      // Bill count should remain the same (no new bill created)
      expect(billsData.results.length).toBe(initialBillCount);
    });
  });

  test('Remove line item from bill', async ({ page, patient }) => {
    const billingFormPage = new BillingFormPage(page);
    const patientUuid = patient.uuid;

    await test.step('When I navigate to the patient billing history', async () => {
      await page.goto(`patient/${patientUuid}/chart/Billing history`);
    });

    await test.step('And I click the Launch bill form button', async () => {
      const createBillButton = page.getByRole('button', { name: /launch bill form|add bill/i });
      await createBillButton.click();
    });

    await test.step('And I add a billable service', async () => {
      await billingFormPage.searchAndSelectBillableService(testServiceName);
      await expect(page.getByText(testServiceName, { exact: false })).toBeVisible();
      await billingFormPage.selectPaymentMethodIfVisible();
    });

    await test.step('Then I should see one line item', async () => {
      // Wait for the item card to be visible (indicates item is rendered)
      await expect(billingFormPage.selectedItemCards().first()).toBeVisible();
      const itemCount = await billingFormPage.getLineItemsCount();
      expect(itemCount).toBe(1);
      await expect(billingFormPage.saveButton()).toBeEnabled();
    });

    await test.step('When I remove the line item', async () => {
      await billingFormPage.removeItem(0);
    });

    await test.step('Then the line item should be removed and save button disabled', async () => {
      const itemCount = await billingFormPage.getLineItemsCount();
      expect(itemCount).toBe(0);
      await expect(billingFormPage.saveButton()).toBeDisabled();
    });

    await test.step('When I discard the form', async () => {
      await billingFormPage.discardBill();
    });
  });

  test('Process partial payment and then complete payment', async ({ page, api, patient }) => {
    const billingFormPage = new BillingFormPage(page);
    const invoicePage = new InvoicePage(page);
    const paymentPage = new PaymentPage(page);
    const patientUuid = patient.uuid;

    await test.step('Given I have created a bill', async () => {
      await page.goto(`patient/${patientUuid}/chart/Billing history`);

      const createBillButton = page.getByRole('button', { name: /launch bill form|add bill/i });
      await createBillButton.click();

      await billingFormPage.searchAndSelectBillableService(testServiceName);
      await billingFormPage.selectPaymentMethodIfVisible();
      await billingFormPage.saveBill();
      await waitForSuccessNotification(page, 'Bill processed successfully');

      const billsResponse = await api.get(`billing/bill?patient=${patientUuid}&v=full`);
      const billsData = await billsResponse.json();
      billUuid = billsData.results[0].uuid;
    });

    await test.step('When I navigate to the invoice page', async () => {
      await invoicePage.goto(patientUuid, billUuid);
      await invoicePage.waitForInvoiceToLoad();
    });

    await test.step('And I make a partial payment (50% of total)', async () => {
      const totalAmount = await invoicePage.getTotalAmount();
      const totalValue = extractNumericValue(totalAmount);
      const partialAmount = totalValue / 2;

      await paymentPage.addPayment('Cash', partialAmount);
      await paymentPage.processPayment();
      await waitForSuccessNotification(page, 'Payment processed successfully');
    });

    await test.step('Then the bill status should be POSTED', async () => {
      await page.reload();
      await invoicePage.waitForInvoiceToLoad();
      const status = await invoicePage.getInvoiceStatus();
      expect(status).toBe('POSTED');
    });

    await test.step('And the amount due should be reduced by half', async () => {
      const totalAmount = await invoicePage.getTotalAmount();
      const totalValue = extractNumericValue(totalAmount);
      const partialAmount = totalValue / 2;

      const amountDue = await invoicePage.getAmountDue();
      const amountDueValue = extractNumericValue(amountDue);
      expect(amountDueValue).toBeCloseTo(partialAmount, 0);
    });

    await test.step('When I complete the remaining payment', async () => {
      const amountDue = await invoicePage.getAmountDue();
      const remainingAmount = extractNumericValue(amountDue);

      await paymentPage.addPayment('Cash', remainingAmount);
      await paymentPage.processPayment();
      await waitForSuccessNotification(page, 'Payment processed successfully');
    });

    await test.step('Then the bill should be marked as PAID', async () => {
      await page.reload();
      await invoicePage.waitForInvoiceToLoad();
      const status = await invoicePage.getInvoiceStatus();
      expect(status).toBe('PAID');
    });

    await test.step('And the amount due should be zero', async () => {
      const amountDue = await invoicePage.getAmountDue();
      const amountDueValue = extractNumericValue(amountDue);
      expect(amountDueValue).toBe(0);
    });
  });
});
