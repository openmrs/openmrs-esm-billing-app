import { expect } from '@playwright/test';
import { test } from '../core/test';
import { deleteBill, ensureServiceHasPrices, extractNumericValue, waitForSuccessNotification } from '../commands';
import {
  BillingDashboardPage,
  BillingFormPage,
  DiscountRequestModal,
  DiscountRequestsAdminPage,
  InvoicePage,
  PaymentPage,
  ReviewBillDiscountsModal,
} from '../pages';

test.describe('Bill discount workflow', () => {
  test.describe.configure({ mode: 'serial' });

  let testServiceName: string;
  let expectedServicePrice: number;
  const billsToCleanup = new Set<string>();

  test.beforeAll(async ({ api }) => {
    const serviceUuid = process.env.E2E_TEST_SERVICE_UUID;
    if (!serviceUuid) {
      throw new Error('E2E_TEST_SERVICE_UUID must be configured in .env file');
    }

    const service = await ensureServiceHasPrices(api, serviceUuid, 30.0);
    testServiceName = service.name;

    const cashPrice = service.servicePrices.find((sp) => sp.name === 'Cash');
    if (!cashPrice) {
      throw new Error('Cash price not found for test service');
    }
    expectedServicePrice = parseFloat(cashPrice.price);
  });

  test.afterEach(async ({ api }) => {
    for (const billUuid of billsToCleanup) {
      try {
        await deleteBill(api, billUuid);
      } catch (error) {
        console.error(`Failed to delete bill ${billUuid}:`, error);
      }
    }
    billsToCleanup.clear();
  });

  test('Approved line-item discount reduces the bill amount due and payment settles the bill', async ({
    page,
    api,
    patient,
  }) => {
    const billingDashboardPage = new BillingDashboardPage(page);
    const billingFormPage = new BillingFormPage(page);
    const invoicePage = new InvoicePage(page);
    const paymentPage = new PaymentPage(page);
    const requestDiscountModal = new DiscountRequestModal(page);
    const discountRequestsPage = new DiscountRequestsAdminPage(page);
    const reviewModal = new ReviewBillDiscountsModal(page);

    const patientUuid = patient.uuid;
    const patientName = patient.person.display;
    const discountPercentage = 10;
    const expectedDiscountAmount = (expectedServicePrice * discountPercentage) / 100;
    const expectedNetAmount = expectedServicePrice - expectedDiscountAmount;
    const justification = `e2e line-item discount ${Date.now()}`;
    let billUuid: string;
    let lineItemUuid: string;

    await test.step('Given a finalized (POSTED) bill exists for the patient', async () => {
      await page.goto(`patient/${patientUuid}/chart/billing-history`);
      await page.getByRole('button', { name: /launch bill form|add bill|create bill/i }).click();

      await billingFormPage.searchAndSelectBillableService(testServiceName);
      await billingFormPage.selectPaymentMethodIfVisible();
      await billingFormPage.saveBill();
      await waitForSuccessNotification(page, /bill processed successfully/i);

      const billsResponse = await api.get(`billing/bill?patient=${patientUuid}&v=full`);
      const billsData = await billsResponse.json();
      billUuid = billsData.results[0].uuid;
      lineItemUuid = billsData.results[0].lineItems[0].uuid;
      billsToCleanup.add(billUuid);

      await billingDashboardPage.goto();
      await billingDashboardPage.waitForBillsTableToLoad();
      await billingDashboardPage.selectFilter('Pending confirmation');
      await billingDashboardPage.waitForBillsTableToLoad();
      await billingDashboardPage.clickInvoiceNumberLink(patientName);
      await invoicePage.waitForInvoiceToLoad();

      await invoicePage.finalizeBill();
      await waitForSuccessNotification(page, /bill finalized/i);
      await expect.poll(async () => await invoicePage.getInvoiceStatus()).toBe('POSTED');
    });

    await test.step('When the cashier requests a 10% discount on the line item', async () => {
      // Open the line-item overflow menu and click "Request discount".
      // The test ids on these controls embed the line item uuid, which keeps
      // the selector stable even if Carbon menu structure changes.
      await page.getByTestId(`action-menu-${lineItemUuid}`).click();
      await page.getByTestId(`request-discount-button-${lineItemUuid}`).click();

      await requestDiscountModal.submitPercentageDiscount(discountPercentage, justification);
      await waitForSuccessNotification(page, /discount request submitted/i);
      await expect(requestDiscountModal.modal()).toBeHidden();
    });

    await test.step('Then the discount appears as PENDING via the API and does not yet affect amount due', async () => {
      const discountsResponse = await api.get(`billing/billDiscount?bill=${billUuid}&v=default`);
      const discountsData = await discountsResponse.json();
      expect(discountsData.results).toHaveLength(1);
      const [discount] = discountsData.results;
      expect(discount.status).toBe('PENDING');
      expect(discount.lineItemUuid).toBe(lineItemUuid);
      expect(discount.discountAmount).toBeCloseTo(expectedDiscountAmount, 2);

      // Bill totals should still reflect the original price until approval.
      const billResponse = await api.get(`billing/bill/${billUuid}`);
      const billData = await billResponse.json();
      expect(billData.amountAfterDiscount ?? billData.total).toBeCloseTo(expectedServicePrice, 2);
    });

    await test.step('When the admin approves the discount from the discount requests dashboard', async () => {
      await discountRequestsPage.goto();
      await discountRequestsPage.waitForLoaded();
      await discountRequestsPage.openReviewForPatient(patientName);

      await reviewModal.waitForLoaded();
      await reviewModal.approveFirstPending();
      await waitForSuccessNotification(page, /discount approved/i);
    });

    await test.step('Then the discount is APPROVED and net amount drops by the discount', async () => {
      await expect
        .poll(async () => {
          const res = await api.get(`billing/billDiscount?bill=${billUuid}&v=default`);
          const data = await res.json();
          return data.results[0]?.status;
        })
        .toBe('APPROVED');

      const billResponse = await api.get(`billing/bill/${billUuid}`);
      const billData = await billResponse.json();
      expect(billData.amountAfterDiscount).toBeCloseTo(expectedNetAmount, 2);
    });

    await test.step('And the invoice page shows the discounted net amount and matching amount due', async () => {
      await invoicePage.goto(patientUuid, billUuid);
      await invoicePage.waitForInvoiceToLoad();

      const amountDue = extractNumericValue(await invoicePage.getAmountDue());
      expect(amountDue).toBeCloseTo(expectedNetAmount, 2);
    });

    await test.step('When the cashier processes a payment that matches the discounted amount due', async () => {
      await paymentPage.waitForPaymentForm();
      await paymentPage.addPayment('Cash', expectedNetAmount);
      expect(await paymentPage.isProcessPaymentButtonEnabled()).toBe(true);
      await paymentPage.processPayment();
      await waitForSuccessNotification(page, /payment processed successfully/i);
    });

    await test.step('Then the bill is marked PAID with no outstanding balance', async () => {
      await page.reload();
      await invoicePage.waitForInvoiceToLoad();
      await expect.poll(async () => await invoicePage.getInvoiceStatus()).toBe('PAID');
      expect(extractNumericValue(await invoicePage.getAmountDue())).toBe(0);

      const billResponse = await api.get(`billing/bill/${billUuid}`);
      const billData = await billResponse.json();
      expect(billData.status).toBe('PAID');
    });
  });

  test('Rejected discount leaves the bill amount due unchanged', async ({ page, api, patient }) => {
    const billingDashboardPage = new BillingDashboardPage(page);
    const billingFormPage = new BillingFormPage(page);
    const invoicePage = new InvoicePage(page);
    const requestDiscountModal = new DiscountRequestModal(page);
    const discountRequestsPage = new DiscountRequestsAdminPage(page);
    const reviewModal = new ReviewBillDiscountsModal(page);

    const patientUuid = patient.uuid;
    const patientName = patient.person.display;
    const justification = `e2e rejected discount ${Date.now()}`;
    let billUuid: string;
    let lineItemUuid: string;

    await test.step('Given a finalized bill with a pending line-item discount request', async () => {
      await page.goto(`patient/${patientUuid}/chart/billing-history`);
      await page.getByRole('button', { name: /launch bill form|add bill|create bill/i }).click();

      await billingFormPage.searchAndSelectBillableService(testServiceName);
      await billingFormPage.selectPaymentMethodIfVisible();
      await billingFormPage.saveBill();
      await waitForSuccessNotification(page, /bill processed successfully/i);

      const billsResponse = await api.get(`billing/bill?patient=${patientUuid}&v=full`);
      const billsData = await billsResponse.json();
      billUuid = billsData.results[0].uuid;
      lineItemUuid = billsData.results[0].lineItems[0].uuid;
      billsToCleanup.add(billUuid);

      await billingDashboardPage.goto();
      await billingDashboardPage.waitForBillsTableToLoad();
      await billingDashboardPage.selectFilter('Pending confirmation');
      await billingDashboardPage.waitForBillsTableToLoad();
      await billingDashboardPage.clickInvoiceNumberLink(patientName);
      await invoicePage.waitForInvoiceToLoad();
      await invoicePage.finalizeBill();
      await waitForSuccessNotification(page, /bill finalized/i);
      await expect.poll(async () => await invoicePage.getInvoiceStatus()).toBe('POSTED');

      await page.getByTestId(`action-menu-${lineItemUuid}`).click();
      await page.getByTestId(`request-discount-button-${lineItemUuid}`).click();
      await requestDiscountModal.submitPercentageDiscount(15, justification);
      await waitForSuccessNotification(page, /discount request submitted/i);
    });

    await test.step('When the admin rejects the discount request', async () => {
      await discountRequestsPage.goto();
      await discountRequestsPage.waitForLoaded();
      await discountRequestsPage.openReviewForPatient(patientName);

      await reviewModal.waitForLoaded();
      await reviewModal.rejectFirstPending();
      await waitForSuccessNotification(page, /discount rejected/i);
    });

    await test.step('Then the discount is REJECTED and the bill total is unchanged', async () => {
      await expect
        .poll(async () => {
          const res = await api.get(`billing/billDiscount?bill=${billUuid}&v=default`);
          const data = await res.json();
          return data.results[0]?.status;
        })
        .toBe('REJECTED');

      const billResponse = await api.get(`billing/bill/${billUuid}`);
      const billData = await billResponse.json();
      // Net amount equals the original total when no discount is approved.
      expect(billData.amountAfterDiscount ?? billData.total).toBeCloseTo(expectedServicePrice, 2);
    });

    await test.step('And the rejected request is no longer in the pending queue', async () => {
      await discountRequestsPage.goto();
      await discountRequestsPage.waitForLoaded();
      await discountRequestsPage.searchInput().fill(patientName);
      await expect(
        discountRequestsPage.requestsTable().locator('tbody tr').filter({ hasText: patientName }),
      ).toHaveCount(0);
    });
  });
});
