import { expect } from '@playwright/test';
import { test } from '../core/test';
import { deleteBill, extractNumericValue, ensureServiceHasPrices, waitForSuccessNotification } from '../commands';
import { BillingFormPage, InvoicePage, PaymentPage } from '../pages';

test.describe('Billing: Patient Chart workflow', () => {
  // Run tests serially to avoid race conditions when setting up service prices
  test.describe.configure({ mode: 'serial' });

  let testServiceName: string;
  let expectedServicePrice: number;
  const billsToCleanup = new Set<string>();

  test.beforeAll(async ({ api }) => {
    const serviceUuid = process.env.E2E_TEST_SERVICE_UUID;
    if (!serviceUuid) {
      throw new Error('E2E_TEST_SERVICE_UUID must be configured in .env file');
    }

    // Ensure the test service has prices configured (required for billing tests)
    // If prices already exist, this will skip; otherwise it adds a default Cash price of 30.00
    const service = await ensureServiceHasPrices(api, serviceUuid, 30.0);

    testServiceName = service.name;

    const cashPrice = service.servicePrices.find((sp) => sp.name === 'Cash');
    if (!cashPrice) {
      throw new Error('Cash price not found for test service');
    }
    expectedServicePrice = parseFloat(cashPrice.price);
  });

  test.afterEach(async ({ api }) => {
    // Cleanup: delete all bills created during tests
    for (const billUuid of billsToCleanup) {
      try {
        await deleteBill(api, billUuid);
      } catch (error) {
        // Log but don't fail test if cleanup fails
        console.error(`Failed to delete bill ${billUuid}:`, error);
      }
    }
    billsToCleanup.clear();
  });

  test('Create bill, verify receipt number, and process full payment', async ({ page, api, patient }) => {
    const billingFormPage = new BillingFormPage(page);
    const invoicePage = new InvoicePage(page);
    const paymentPage = new PaymentPage(page);
    const patientUuid = patient.uuid;
    let billUuid: string;

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
      billsToCleanup.add(billUuid);
    });

    await test.step('When I navigate to the invoice page', async () => {
      await invoicePage.goto(patientUuid, billUuid);
      await invoicePage.waitForInvoiceToLoad();
    });

    await test.step('Then I should see the invoice details with correct initial state', async () => {
      const invoiceStatus = await invoicePage.getInvoiceStatus();
      expect(invoiceStatus).toBe('PENDING');

      const totalAmount = await invoicePage.getTotalAmount();
      const amountDue = await invoicePage.getAmountDue();
      expect(totalAmount).toBeTruthy();
      expect(amountDue).toEqual(totalAmount);

      const totalValue = extractNumericValue(totalAmount);
      expect(totalValue).toBeCloseTo(expectedServicePrice, 2);

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

      const updatedStatus = await invoicePage.getInvoiceStatus();
      expect(updatedStatus).toBe('PAID');

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
    let billUuid: string;

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
      billsToCleanup.add(billUuid);

      await invoicePage.goto(patientUuid, billUuid);
      await invoicePage.waitForInvoiceToLoad();

      const lineItems = await invoicePage.getLineItems();
      expect(lineItems.length).toBe(1);
      expect(lineItems[0].quantity).toBe('2');

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
      await expect(billingFormPage.discardButton()).toBeHidden();
    });

    await test.step('Then the bill should not be created', async () => {
      const billsResponse = await api.get(`billing/bill?patient=${patientUuid}&v=full`);
      expect(billsResponse.ok()).toBeTruthy();
      const billsData = await billsResponse.json();
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
      await expect(billingFormPage.selectedItemCards().first()).toBeVisible();
      const itemCount = await billingFormPage.getLineItemsCount();
      expect(itemCount).toBe(1);
      await expect(billingFormPage.saveButton()).toBeEnabled();
    });

    await test.step('When I remove the line item', async () => {
      await billingFormPage.removeItem(0);

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
    let billUuid: string;
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
      billsToCleanup.add(billUuid);
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

      await expect(paymentPage.amountInput()).toHaveValue(partialAmount.toString());

      await paymentPage.processPayment();
      await waitForSuccessNotification(page, 'Payment processed successfully');

      await expect
        .poll(async () => {
          const history = await paymentPage.getPaymentHistory();
          return history.length;
        })
        .toBeGreaterThan(0);
    });

    await test.step('Then the bill status should be POSTED after partial payment', async () => {
      await page.reload();
      await invoicePage.waitForInvoiceToLoad();
      const status = await invoicePage.getInvoiceStatus();
      expect(status).toBe('POSTED');
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

      const status = await invoicePage.getInvoiceStatus();
      expect(status).toBe('PAID');

      const billResponse = await api.get(`billing/bill/${billUuid}`);
      const billData = await billResponse.json();
      expect(billData.status).toBe('PAID');
    });

    await test.step('And the amount due should be zero', async () => {
      const amountDue = await invoicePage.getAmountDue();
      const amountDueValue = extractNumericValue(amountDue);
      expect(amountDueValue).toBe(0);

      const totalAmount = await invoicePage.getTotalAmount();
      const totalValue = extractNumericValue(totalAmount);
      const tenderedAmount = await invoicePage.getAmountTendered();
      const tenderedValue = extractNumericValue(tenderedAmount);
      expect(tenderedValue).toBeCloseTo(totalValue, 2);
    });
  });

  test('Create bill with increased service quantity and verify totals', async ({ page, api, patient }) => {
    const billingFormPage = new BillingFormPage(page);
    const invoicePage = new InvoicePage(page);
    const paymentPage = new PaymentPage(page);
    const patientUuid = patient.uuid;
    let billUuid: string;

    // Note: Selecting the same service multiple times increments quantity (doesn't create multiple line items)
    // This test verifies quantity increment and total calculation
    const quantity = 3;
    const expectedTotal = expectedServicePrice * quantity;

    await test.step('When I navigate to the Billing history page', async () => {
      await page.goto(`patient/${patientUuid}/chart/Billing history`);
    });

    await test.step('And I launch the Create Bill form', async () => {
      const createBillButton = page.getByRole('button', { name: /launch bill form|add bill/i });
      await createBillButton.click();
    });

    await test.step('And I add the same service multiple times to increment quantity', async () => {
      await billingFormPage.searchAndSelectBillableService(testServiceName);
      await billingFormPage.selectPaymentMethodIfVisible();
      await expect(page.getByText(testServiceName, { exact: false })).toBeVisible();

      const quantityInput = page.locator('input[type="number"]').first();
      await expect(quantityInput).toHaveValue('1');

      for (let i = 1; i < quantity; i++) {
        await billingFormPage.clearBillableServiceCombobox();
        await billingFormPage.searchAndSelectBillableService(testServiceName);
        await expect
          .poll(
            async () => {
              const value = await quantityInput.inputValue();
              return value;
            },
            { timeout: 5000 },
          )
          .toBe((i + 1).toString());
      }

      await expect(quantityInput).toHaveValue(quantity.toString());
    });

    await test.step('Then the grand total should equal price times quantity', async () => {
      await billingFormPage.verifyGrandTotal(expectedTotal);
    });

    await test.step('When I save the bill', async () => {
      await billingFormPage.saveBill();
      await waitForSuccessNotification(page, 'Bill processed successfully');
    });

    await test.step('Then the bill should be created with correct line item', async () => {
      const billsResponse = await api.get(`billing/bill?patient=${patientUuid}&v=full`);
      expect(billsResponse.ok()).toBeTruthy();
      const billsData = await billsResponse.json();
      expect(billsData.results.length).toBeGreaterThan(0);

      const bill = billsData.results[0];
      billUuid = bill.uuid;
      billsToCleanup.add(billUuid);

      expect(bill.lineItems.length).toBe(1);
      const lineItem = bill.lineItems[0];
      expect(lineItem.billableService).toBeTruthy();
      expect(lineItem.quantity).toBe(quantity);
      expect(lineItem.price).toBeCloseTo(expectedServicePrice, 2);

      const backendTotal = bill.lineItems.reduce(
        (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity,
        0,
      );
      expect(backendTotal).toBeCloseTo(expectedTotal, 2);
    });

    await test.step('When I navigate to the invoice page', async () => {
      await invoicePage.goto(patientUuid, billUuid);
      await invoicePage.waitForInvoiceToLoad();
    });

    await test.step('Then the invoice should display the line item correctly', async () => {
      const lineItems = await invoicePage.getLineItems();
      expect(lineItems.length).toBe(1);
      expect(lineItems[0].quantity).toBe(quantity.toString());
    });

    await test.step('And the total amount should match the calculated total', async () => {
      const totalAmount = await invoicePage.getTotalAmount();
      const totalValue = extractNumericValue(totalAmount);
      expect(totalValue).toBeCloseTo(expectedTotal, 2);

      const billResponse = await api.get(`billing/bill/${billUuid}?v=full`);
      const billData = await billResponse.json();
      const backendTotal = billData.lineItems.reduce(
        (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity,
        0,
      );
      expect(backendTotal).toBeCloseTo(totalValue, 2);
    });

    await test.step('When I process payment for the full amount', async () => {
      await paymentPage.waitForPaymentForm();
      const amountDue = await invoicePage.getAmountDue();
      const amountDueValue = extractNumericValue(amountDue);

      await paymentPage.addPayment('Cash', amountDueValue);
      await paymentPage.processPayment();
      await waitForSuccessNotification(page, 'Payment processed successfully');
    });

    await test.step('Then the line item should be marked as PAID', async () => {
      await page.reload();
      await invoicePage.waitForInvoiceToLoad();

      const lineItems = await invoicePage.getLineItems();
      lineItems.forEach((lineItem) => {
        expect(lineItem.status).toBe('PAID');
      });

      // Verify backend state
      const billResponse = await api.get(`billing/bill/${billUuid}?v=full`);
      const billData = await billResponse.json();
      billData.lineItems.forEach((lineItem: { paymentStatus: string }) => {
        expect(lineItem.paymentStatus).toBe('PAID');
      });
    });
  });

  test('Process payment with multiple payment methods', async ({ page, api, patient }) => {
    const billingFormPage = new BillingFormPage(page);
    const invoicePage = new InvoicePage(page);
    const paymentPage = new PaymentPage(page);
    const patientUuid = patient.uuid;
    let billUuid: string;
    let amountDue: string;
    let paymentAmount1: number;
    let paymentAmount2: number;

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
      billsToCleanup.add(billUuid);
    });

    await test.step('When I navigate to the invoice page', async () => {
      await invoicePage.goto(patientUuid, billUuid);
      await invoicePage.waitForInvoiceToLoad();
    });

    await test.step('And I record the first payment (60% Cash)', async () => {
      await paymentPage.waitForPaymentForm();

      amountDue = await invoicePage.getAmountDue();
      paymentAmount1 = Math.round(extractNumericValue(amountDue) * 0.6 * 100) / 100;
      paymentAmount2 = extractNumericValue(amountDue) - paymentAmount1;

      await paymentPage.addPayment('Cash', paymentAmount1);
      await paymentPage.processPayment();
      await waitForSuccessNotification(page, 'Payment processed successfully');
    });

    await test.step('And I record the second payment (40% Cash)', async () => {
      await paymentPage.waitForPaymentForm();

      await paymentPage.addPayment('Cash', paymentAmount2);
      await paymentPage.processPayment();
      await waitForSuccessNotification(page, 'Payment processed successfully');
    });

    await test.step('Then the bill should be marked as PAID', async () => {
      await page.reload();
      await invoicePage.waitForInvoiceToLoad();

      const status = await invoicePage.getInvoiceStatus();
      expect(status).toBe('PAID');

      const billResponse = await api.get(`billing/bill/${billUuid}`);
      const billData = await billResponse.json();
      expect(billData.status).toBe('PAID');
    });

    await test.step('And the payment history should show multiple payments', async () => {
      const paymentHistory = await paymentPage.getPaymentHistory();
      expect(paymentHistory.length).toBeGreaterThanOrEqual(2);
    });

    await test.step('And the backend should store payment methods correctly', async () => {
      const billResponse = await api.get(`billing/bill/${billUuid}?v=full`);
      const billData = await billResponse.json();
      const payments = billData.payments;

      expect(payments.length).toBeGreaterThanOrEqual(2);

      // Verify each payment has instanceType (payment method)
      payments.forEach((payment: { instanceType: { name: string }; amountTendered: number }) => {
        expect(payment.instanceType).toBeTruthy();
        expect(payment.instanceType.name).toBeTruthy();
        expect(payment.amountTendered).toBeGreaterThan(0);
      });
    });

    await test.step('And the amount tendered should equal the total amount', async () => {
      const totalAmount = await invoicePage.getTotalAmount();
      const tenderedAmount = await invoicePage.getAmountTendered();

      const totalValue = extractNumericValue(totalAmount);
      const tenderedValue = extractNumericValue(tenderedAmount);

      expect(tenderedValue).toBeCloseTo(totalValue, 2);

      // Verify backend
      const billResponse = await api.get(`billing/bill/${billUuid}`);
      const billData = await billResponse.json();
      const backendTendered = billData.payments.reduce(
        (sum: number, p: { amountTendered: number }) => sum + p.amountTendered,
        0,
      );
      expect(backendTendered).toBeCloseTo(totalValue, 2);
    });
  });

  test('Create bill with quantity increase and process split payment', async ({ page, api, patient }) => {
    const billingFormPage = new BillingFormPage(page);
    const invoicePage = new InvoicePage(page);
    const paymentPage = new PaymentPage(page);
    const patientUuid = patient.uuid;
    let billUuid: string;

    // Note: Selecting same service twice increments quantity to 2
    const quantity = 2;
    const expectedTotal = expectedServicePrice * quantity;

    await test.step('Given I create a bill with a service quantity of 2', async () => {
      await page.goto(`patient/${patientUuid}/chart/Billing history`);

      const createBillButton = page.getByRole('button', { name: /launch bill form|add bill/i });
      await createBillButton.click();

      await billingFormPage.searchAndSelectBillableService(testServiceName);
      await billingFormPage.selectPaymentMethodIfVisible();
      await expect(page.getByText(testServiceName, { exact: false })).toBeVisible();

      await billingFormPage.clearBillableServiceCombobox();
      await billingFormPage.searchAndSelectBillableService(testServiceName);

      const quantityInput = page.locator('input[type="number"]').first();
      await expect
        .poll(
          async () => {
            const value = await quantityInput.inputValue();
            return value;
          },
          { timeout: 5000 },
        )
        .toBe('2');

      await billingFormPage.verifyGrandTotal(expectedTotal);
      await billingFormPage.saveBill();
      await waitForSuccessNotification(page, 'Bill processed successfully');

      const billsResponse = await api.get(`billing/bill?patient=${patientUuid}&v=full`);
      const billsData = await billsResponse.json();
      billUuid = billsData.results[0].uuid;
      billsToCleanup.add(billUuid);

      const bill = billsData.results[0];
      expect(bill.lineItems.length).toBe(1);
      expect(bill.lineItems[0].quantity).toBe(quantity);
    });

    await test.step('When I navigate to the invoice page', async () => {
      await invoicePage.goto(patientUuid, billUuid);
      await invoicePage.waitForInvoiceToLoad();
    });

    await test.step('And I record the first payment (50%)', async () => {
      await paymentPage.waitForPaymentForm();

      const amountDue = await invoicePage.getAmountDue();
      const amountDueValue = extractNumericValue(amountDue);

      const payment1 = Math.round(amountDueValue * 0.5 * 100) / 100;

      await paymentPage.addPayment('Cash', payment1);
      await paymentPage.processPayment();
      await waitForSuccessNotification(page, 'Payment processed successfully');
    });

    await test.step('And I record the second payment (remaining 50%)', async () => {
      await paymentPage.waitForPaymentForm();

      const amountDue = await invoicePage.getAmountDue();
      const payment2 = extractNumericValue(amountDue);

      await paymentPage.addPayment('Cash', payment2);
      await paymentPage.processPayment();
      await waitForSuccessNotification(page, 'Payment processed successfully');
    });

    await test.step('Then the bill should be marked as PAID', async () => {
      await page.reload();
      await invoicePage.waitForInvoiceToLoad();

      const status = await invoicePage.getInvoiceStatus();
      expect(status).toBe('PAID');

      const billResponse = await api.get(`billing/bill/${billUuid}`);
      const billData = await billResponse.json();
      expect(billData.status).toBe('PAID');
    });

    await test.step('And the payment history should show multiple payments', async () => {
      const paymentHistory = await paymentPage.getPaymentHistory();
      expect(paymentHistory.length).toBeGreaterThanOrEqual(2);

      // Verify backend payments
      const billResponse = await api.get(`billing/bill/${billUuid}?v=full`);
      const billData = await billResponse.json();
      const payments = billData.payments;

      expect(payments.length).toBeGreaterThanOrEqual(2);
      payments.forEach((payment: { instanceType: { name: string }; amountTendered: number }) => {
        expect(payment.instanceType).toBeTruthy();
        expect(payment.instanceType.name).toBeTruthy();
        expect(payment.amountTendered).toBeGreaterThan(0);
      });
    });
  });
});
