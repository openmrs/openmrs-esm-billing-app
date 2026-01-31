import { expect } from '@playwright/test';
import { test } from '../core/test';
import { deleteBill, extractNumericValue, ensureServiceHasPrices, waitForSuccessNotification } from '../commands';
import { BillingDashboardPage, BillingFormPage, InvoicePage, PaymentPage } from '../pages';

test.describe('Billing Dashboard workflow', () => {
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

  test('Process payment from dashboard and verify bill moves from pending to paid bills', async ({
    page,
    api,
    patient,
  }) => {
    const billingDashboardPage = new BillingDashboardPage(page);
    const billingFormPage = new BillingFormPage(page);
    const invoicePage = new InvoicePage(page);
    const paymentPage = new PaymentPage(page);
    const patientUuid = patient.uuid;
    const patientName = patient.person.display;
    let billUuid: string;

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

    await test.step('When I navigate to the Billing dashboard', async () => {
      await billingDashboardPage.goto();
      await billingDashboardPage.waitForBillsTableToLoad();
    });

    await test.step('Then the Bill List should display pending bills', async () => {
      await expect(billingDashboardPage.filterDropdown()).toBeVisible();

      await billingDashboardPage.verifyBillInTable(patientName, true);
    });

    await test.step('When I click on a patient name in the Bill List', async () => {
      await billingDashboardPage.clickPatientNameLink(patientName);
      await invoicePage.waitForInvoiceToLoad();
    });

    await test.step("Then the patient's bill details page should open", async () => {
      const totalAmount = await invoicePage.getTotalAmount();
      expect(totalAmount).toBeTruthy();
      const totalValue = extractNumericValue(totalAmount);
      expect(totalValue).toBeCloseTo(expectedServicePrice, 2);

      const amountTendered = await invoicePage.getAmountTendered();
      expect(amountTendered).toBeTruthy();
      const tenderedValue = extractNumericValue(amountTendered);
      expect(tenderedValue).toBe(0);

      const receiptNumber = await invoicePage.getInvoiceNumber();
      expect(receiptNumber).toBeTruthy();
      await expect(invoicePage.invoiceNumberLabel()).toBeVisible();

      const dateAndTime = await invoicePage.getDateAndTime();
      expect(dateAndTime).toBeTruthy();

      const invoiceStatus = await invoicePage.getInvoiceStatus();
      expect(invoiceStatus).toBe('PENDING');
    });

    await test.step('And the Payments section should be displayed', async () => {
      await paymentPage.waitForPaymentForm();

      await expect(paymentPage.paymentMethodCombobox()).toBeVisible();
      await expect(paymentPage.amountInput()).toBeVisible();
      await expect(paymentPage.referenceCodeInput()).toBeVisible();
    });

    await test.step('When I select a payment method and enter an amount matching the bill total', async () => {
      const amountDue = await invoicePage.getAmountDue();
      const amountDueValue = extractNumericValue(amountDue);

      await paymentPage.addPayment('Cash', amountDueValue);
      await expect(paymentPage.amountInput()).toHaveValue(amountDueValue.toString());

      const isEnabled = await paymentPage.isProcessPaymentButtonEnabled();
      expect(isEnabled).toBe(true);
    });

    await test.step('When I click "Process Payment"', async () => {
      await paymentPage.processPayment();
      await waitForSuccessNotification(page, 'Payment processed successfully');
    });

    await test.step('Then the invoice status should update to PAID', async () => {
      await page.reload();
      await invoicePage.waitForInvoiceToLoad();

      const updatedStatus = await invoicePage.getInvoiceStatus();
      expect(updatedStatus).toBe('PAID');

      const billResponse = await api.get(`billing/bill/${billUuid}`);
      const billData = await billResponse.json();
      expect(billData.status).toBe('PAID');
    });

    await test.step('And the Amount Tendered should update to reflect the payment', async () => {
      const totalAmount = await invoicePage.getTotalAmount();
      const updatedAmountTendered = await invoicePage.getAmountTendered();
      expect(updatedAmountTendered).toEqual(totalAmount);

      const updatedAmountDue = await invoicePage.getAmountDue();
      expect(extractNumericValue(updatedAmountDue)).toBe(0);
    });

    /**
     * TODO: Uncomment this after the ticket below has been implemented:
     * https://openmrs.atlassian.net/browse/O3-5394
     *
     * The ticket is about updating the payment status of the line items when the payment is processed.
     * Once the ticket is implemented, we can uncomment the test step below
     */

    // await test.step('And the Service status in the Line items table should change to PAID', async () => {
    //   const lineItems = await invoicePage.getLineItems();
    //   expect(lineItems.length).toBeGreaterThan(0);
    //   lineItems.forEach((lineItem) => {
    //     expect(lineItem.status).toBe('PAID');
    //   });

    //   // Also verify backend line items have paymentStatus set to PAID
    //   const billResponse = await api.get(`billing/bill/${billUuid}`);
    //   const billData = await billResponse.json();
    //   billData.lineItems.forEach((lineItem: { paymentStatus: string }) => {
    //     expect(lineItem.paymentStatus).toBe('PAID');
    //   });
    // });

    await test.step('And the Payments section should display a payment record', async () => {
      const paymentHistory = await paymentPage.getPaymentHistory();
      expect(paymentHistory.length).toBeGreaterThan(0);

      const payment = paymentHistory[0];
      expect(payment.date).toBeTruthy();
      expect(payment.billAmount).toBeTruthy();
      expect(payment.amountTendered).toBeTruthy();
      expect(payment.method).toContain('Cash');
    });

    await test.step('When I navigate back to the Billing dashboard landing page', async () => {
      await billingDashboardPage.goto();
      await billingDashboardPage.waitForBillsTableToLoad();
    });

    await test.step('Then the processed bill should no longer appear in the pending bills list', async () => {
      await expect(billingDashboardPage.filterDropdown()).toBeVisible();

      await billingDashboardPage.verifyBillInTable(patientName, false);
    });

    await test.step('And the bill should appear under Paid bills', async () => {
      await billingDashboardPage.selectFilter('Paid bills');
      await billingDashboardPage.waitForBillsTableToLoad();

      await billingDashboardPage.verifyBillInTable(patientName, true);
    });
  });
});
