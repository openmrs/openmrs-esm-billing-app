import { expect } from '@playwright/test';
import { test } from '../core/test';
import { deleteBill, extractNumericValue, ensureServiceHasPrices, waitForSuccessNotification } from '../commands';
import { BillingFormPage, InvoicePage, PaymentPage } from '../pages';

test.describe('Billing and payment operations', () => {
  // Run tests serially to avoid race conditions when setting up service prices
  test.describe.configure({ mode: 'serial' });

  let billUuid: string;
  let testServiceName: string;
  let expectedServicePrice: number;

  test.beforeAll(async ({ api }) => {
    // Get the configured test service details
    const serviceUuid = process.env.E2E_TEST_SERVICE_UUID;
    if (!serviceUuid) {
      throw new Error('E2E_TEST_SERVICE_UUID must be configured in .env file');
    }

    // Ensure the test service has prices configured (required for billing tests)
    // If prices already exist, this will skip; otherwise it adds a default Cash price of 30.00
    const service = await ensureServiceHasPrices(api, serviceUuid, 30.0);

    testServiceName = service.name;

    // Extract the Cash price for use in assertions
    const cashPrice = service.servicePrices.find((sp) => sp.name === 'Cash');
    if (!cashPrice) {
      throw new Error('Cash price not found for test service');
    }
    expectedServicePrice = parseFloat(cashPrice.price);
  });

  test.afterEach(async ({ api }) => {
    if (billUuid) {
      await deleteBill(api, billUuid);
    }
  });

  test('Create bill, verify receipt number, and process full payment', async ({ page, api, patient }) => {
    const billingFormPage = new BillingFormPage(page);
    const invoicePage = new InvoicePage(page);
    const paymentPage = new PaymentPage(page);
    const patientUuid = patient.uuid;

    await test.step('When I navigate to the Billing history page', async () => {
      await page.goto(`patient/${patientUuid}/chart/Billing history`);
    });

    await test.step('And I launch the Create Bill form', async () => {
      const createBillButton = page.getByRole('button', { name: /launch bill form|add bill/i });
      await createBillButton.click();
    });

    await test.step('And I search for and select a billable service', async () => {
      await billingFormPage.searchAndSelectBillableService(testServiceName);
      await expect(billingFormPage.billableServicesCombobox()).toBeVisible();
      await expect(page.getByText(testServiceName, { exact: false })).toBeVisible();
      await billingFormPage.selectPaymentMethodIfVisible();
    });

    await test.step('Then I should see the calculated grand total for the selected items', async () => {
      const grandTotal = await billingFormPage.getGrandTotal();
      expect(grandTotal).toBeTruthy();
      const grandTotalValue = extractNumericValue(grandTotal);
      // Use toBeCloseTo for decimal comparison (2 decimal places for currency)
      expect(grandTotalValue).toBeCloseTo(expectedServicePrice, 2);
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

    await test.step('Then I should see the invoice details with correct initial state', async () => {
      // Verify status is PENDING
      const invoiceStatus = await invoicePage.getInvoiceStatus();
      expect(invoiceStatus).toBe('PENDING');

      // Verify amounts are correct for new bill
      const totalAmount = await invoicePage.getTotalAmount();
      const amountDue = await invoicePage.getAmountDue();
      expect(totalAmount).toBeTruthy();
      expect(amountDue).toEqual(totalAmount);

      // Verify bill total matches the expected service price
      const totalValue = extractNumericValue(totalAmount);
      expect(totalValue).toBeCloseTo(expectedServicePrice, 2);

      // Verify invoice number is displayed
      const receiptNumber = await invoicePage.getInvoiceNumber();
      expect(receiptNumber).toBeTruthy();
      await expect(invoicePage.invoiceNumberLabel()).toBeVisible();
    });

    await test.step('When I process the full amount due', async () => {
      await paymentPage.waitForPaymentForm();
      const amountDue = await invoicePage.getAmountDue();
      const amountDueValue = extractNumericValue(amountDue);
      await paymentPage.addPayment('Cash', amountDueValue);
      await expect(paymentPage.amountInput()).toHaveValue(amountDueValue.toString());
      await paymentPage.processPayment();
      await waitForSuccessNotification(page, 'Payment processed successfully');
    });

    await test.step('Then the bill should be marked as paid', async () => {
      await page.reload();
      await invoicePage.waitForInvoiceToLoad();

      // Verify UI shows PAID status
      const updatedStatus = await invoicePage.getInvoiceStatus();
      expect(updatedStatus).toBe('PAID');

      // Verify backend also updated to PAID
      const billResponse = await api.get(`billing/bill/${billUuid}`);
      const billData = await billResponse.json();
      expect(billData.status).toBe('PAID');

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

    await test.step('And I search for and select a billable service and update quantity to 2', async () => {
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

      // Verify total amount is quantity * unit price
      const totalAmount = await invoicePage.getTotalAmount();
      const totalValue = extractNumericValue(totalAmount);
      expect(totalValue).toBeCloseTo(expectedServicePrice * 2, 2);
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

    await test.step('And I search for and select a billable service', async () => {
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

    await test.step('And I search for and select a billable service', async () => {
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

      // Wait for the item count to decrease to 0
      await expect.poll(async () => await billingFormPage.getLineItemsCount()).toBe(0);
    });

    await test.step('Then the save button should be disabled', async () => {
      await expect(billingFormPage.saveButton()).toBeDisabled();
    });

    await test.step('When I discard the form', async () => {
      await billingFormPage.discardBill();
      await expect(billingFormPage.discardButton()).toBeHidden();
    });
  });

  test('Process partial payment and then complete payment', async ({ page, api, patient }) => {
    const billingFormPage = new BillingFormPage(page);
    const invoicePage = new InvoicePage(page);
    const paymentPage = new PaymentPage(page);
    const patientUuid = patient.uuid;
    let partialAmount: number;

    await test.step('Given I have created and saved a bill', async () => {
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

    await test.step('And I make a partial payment (50% of amount due)', async () => {
      await paymentPage.waitForPaymentForm();

      const amountDue = await invoicePage.getAmountDue();
      const amountDueValue = extractNumericValue(amountDue);

      // Round to currency precision (2 decimals)
      partialAmount = Math.round((amountDueValue / 2) * 100) / 100;

      await paymentPage.addPayment('Cash', partialAmount);

      // Verify amount entered correctly
      await expect(paymentPage.amountInput()).toHaveValue(partialAmount.toString());

      await paymentPage.processPayment();
      await waitForSuccessNotification(page, 'Payment processed successfully');

      // Verify payment was actually recorded
      await expect
        .poll(async () => {
          const history = await paymentPage.getPaymentHistory();
          return history.length;
        })
        .toBeGreaterThan(0);
    });

    await test.step('Then the bill status should remain PENDING after partial payment', async () => {
      await page.reload();
      await invoicePage.waitForInvoiceToLoad();
      const status = await invoicePage.getInvoiceStatus();
      expect(status).toBe('PENDING');
    });

    await test.step('And the tendered amount should equal the partial payment', async () => {
      const tenderedAmount = await invoicePage.getAmountTendered();
      const tenderedValue = extractNumericValue(tenderedAmount);
      expect(tenderedValue).toBeCloseTo(partialAmount, 2);
    });

    await test.step('And the amount due should be reduced accordingly', async () => {
      const totalAmount = await invoicePage.getTotalAmount();
      const totalValue = extractNumericValue(totalAmount);
      const amountDue = await invoicePage.getAmountDue();
      const amountDueValue = extractNumericValue(amountDue);

      // Verify amount due = total - tendered
      expect(amountDueValue).toBeCloseTo(totalValue - partialAmount, 2);
    });

    await test.step('When I complete the remaining payment', async () => {
      await paymentPage.waitForPaymentForm();
      const amountDue = await invoicePage.getAmountDue();
      const remainingAmount = extractNumericValue(amountDue);

      await paymentPage.addPayment('Cash', remainingAmount);
      await expect(paymentPage.amountInput()).toHaveValue(remainingAmount.toString());
      await paymentPage.processPayment();
      await waitForSuccessNotification(page, 'Payment processed successfully');
    });

    await test.step('Then the bill should be marked as PAID', async () => {
      await page.reload();
      await invoicePage.waitForInvoiceToLoad();

      // Verify UI shows PAID status
      const status = await invoicePage.getInvoiceStatus();
      expect(status).toBe('PAID');

      // Verify backend also updated to PAID
      const billResponse = await api.get(`billing/bill/${billUuid}`);
      const billData = await billResponse.json();
      expect(billData.status).toBe('PAID');
    });

    await test.step('And the amount due should be zero', async () => {
      const amountDue = await invoicePage.getAmountDue();
      const amountDueValue = extractNumericValue(amountDue);
      expect(amountDueValue).toBe(0);

      // Verify total amount equals tendered amount
      const totalAmount = await invoicePage.getTotalAmount();
      const totalValue = extractNumericValue(totalAmount);
      const tenderedAmount = await invoicePage.getAmountTendered();
      const tenderedValue = extractNumericValue(tenderedAmount);
      expect(tenderedValue).toBeCloseTo(totalValue, 2);
    });
  });
});
