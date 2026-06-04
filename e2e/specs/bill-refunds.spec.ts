import { expect } from '@playwright/test';
import { test } from '../core/test';
import { deleteBill, ensureServiceHasPrices, extractNumericValue, waitForSuccessNotification } from '../commands';
import {
  BillingDashboardPage,
  BillingFormPage,
  InvoicePage,
  PaymentPage,
  RefundRequestModal,
  RefundRequestsAdminPage,
  ReviewBillRefundsModal,
} from '../pages';

test.describe('Bill refund workflow', () => {
  test.describe.configure({ mode: 'serial' });

  let testServiceName: string;
  const billsToCleanup = new Set<string>();

  test.beforeAll(async ({ api }) => {
    const serviceUuid = process.env.E2E_TEST_SERVICE_UUID;
    if (!serviceUuid) {
      throw new Error('E2E_TEST_SERVICE_UUID must be configured in .env file');
    }

    const service = await ensureServiceHasPrices(api, serviceUuid, 30);
    testServiceName = service.name;

    const cashPrice = service.servicePrices.find((sp) => sp.name === 'Cash');
    if (!cashPrice) {
      throw new Error('Cash price not found for test service');
    }
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

  test('Cashier requests a refund, admin approves it, cashier processes it', async ({ page, api, patient }) => {
    const billingDashboardPage = new BillingDashboardPage(page);
    const billingFormPage = new BillingFormPage(page);
    const invoicePage = new InvoicePage(page);
    const paymentPage = new PaymentPage(page);
    const refundModal = new RefundRequestModal(page);
    const refundRequestsPage = new RefundRequestsAdminPage(page);
    const reviewModal = new ReviewBillRefundsModal(page);

    const patientUuid = patient.uuid;
    const patientName = patient.person.display;
    const refundReason = `e2e test refund ${Date.now()}`;
    let billUuid: string;
    let refundAmount: number;

    await test.step('Given a PAID bill exists for the patient', async () => {
      await page.goto(`patient/${patientUuid}/chart/billing-history`);
      await page.getByRole('button', { name: /launch bill form|add bill|create bill/i }).click();

      await billingFormPage.searchAndSelectBillableService(testServiceName);
      await billingFormPage.selectPaymentMethodIfVisible();
      await billingFormPage.saveBill();
      await waitForSuccessNotification(page, /bill processed successfully/i);

      const billsResponse = await api.get(`billing/bill?patient=${patientUuid}&v=full`);
      const billsData = await billsResponse.json();
      billUuid = billsData.results[0].uuid;
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

      await paymentPage.waitForPaymentForm();
      const amountDue = await invoicePage.getAmountDue();
      await paymentPage.addPayment('Cash', extractNumericValue(amountDue));
      await paymentPage.processPayment();
      await waitForSuccessNotification(page, /payment processed successfully/i);

      await page.reload();
      await invoicePage.waitForInvoiceToLoad();
      await expect.poll(async () => await invoicePage.getInvoiceStatus()).toBe('PAID');
    });

    await test.step('When the cashier requests a refund for the full bill amount', async () => {
      const totalAmount = await invoicePage.getTotalAmount();
      refundAmount = extractNumericValue(totalAmount);

      await page.getByRole('button', { name: /request refund/i }).click();
      await refundModal.submitRefund(refundAmount, refundReason);
      await waitForSuccessNotification(page, /refund request submitted/i);
    });

    await test.step('Then the refund appears as REQUESTED via the API', async () => {
      const billResponse = await api.get(`billing/bill/${billUuid}?v=full`);
      const billData = await billResponse.json();
      const refunds: Array<{ status: string; refundAmount: number; reason: string }> = billData.refunds;
      expect(refunds).toHaveLength(1);
      expect(refunds[0].status).toBe('REQUESTED');
      expect(refunds[0].refundAmount).toBeCloseTo(refundAmount, 2);
      expect(refunds[0].reason).toBe(refundReason);
    });

    await test.step('When the admin approves the refund from the refund requests dashboard', async () => {
      await refundRequestsPage.goto();
      await refundRequestsPage.waitForLoaded();
      await refundRequestsPage.openReviewForPatient(patientName);

      await reviewModal.waitForLoaded();
      await reviewModal.approveFirstPending();
      await waitForSuccessNotification(page, /refund approved/i);
    });

    await test.step('Then the refund status is APPROVED via the API', async () => {
      await expect
        .poll(async () => {
          const res = await api.get(`billing/bill/${billUuid}?v=full`);
          const data = await res.json();
          return (data.refunds ?? [])[0]?.status;
        })
        .toBe('APPROVED');
    });

    await test.step('When the cashier processes the approved refund from the invoice page', async () => {
      await invoicePage.goto(patientUuid, billUuid);
      await invoicePage.waitForInvoiceToLoad();

      const processButton = page.getByRole('button', { name: /process refund/i });
      await expect(processButton).toBeEnabled();
      await processButton.click();
      await waitForSuccessNotification(page, /refund processed/i);
    });

    await test.step('Then the refund status is COMPLETED via the API', async () => {
      await expect
        .poll(async () => {
          const res = await api.get(`billing/bill/${billUuid}?v=full`);
          const data = await res.json();
          return (data.refunds ?? [])[0]?.status;
        })
        .toBe('COMPLETED');
    });

    await test.step('And the completed refund is visible in the refunds table on the invoice', async () => {
      await invoicePage.goto(patientUuid, billUuid);
      await invoicePage.waitForInvoiceToLoad();

      const refundsTable = page.getByRole('table', { name: /bill refunds/i });
      await expect(refundsTable).toBeVisible();

      const refundRows = refundsTable.locator('tbody tr');
      await expect(refundRows).toHaveCount(1);

      const statusCell = refundRows.first().locator('td').nth(3);
      await expect(statusCell).toContainText(/completed/i);
    });
  });
});
