import { expect } from '@playwright/test';
import { type APIRequestContext } from '@playwright/test';
import { BillingPaymentPage } from '../pages';
import { test } from '../core';

/**
 * E2E Test Suite for O3-5164: Bill Payment Processing
 *
 * Parent Issue: O3-5161 (E2E tests for the Billing module)
 *
 * This test suite validates the complete workflow for processing bill payments
 * in the OpenMRS billing module, including:
 * - Viewing pending bills on the dashboard
 * - Accessing bill details
 * - Processing payments
 * - Verifying payment status updates
 * - Confirming bill removal from pending list
 */

// Test data
interface TestBill {
  patientUuid: string;
  billUuid: string;
  patientName: string;
  totalAmount: number;
  receiptNumber: string;
}

/**
 * Helper function to create a test patient
 * @param api - The API request context
 * @returns The created patient's UUID and name
 */
async function createTestPatient(api: APIRequestContext): Promise<{ uuid: string; name: string }> {
  const patientPayload = {
    identifiers: [
      {
        identifier: `E2E-${Date.now()}`,
        identifierType: '05a29f94-c0ed-11e2-94be-8c13b969e334',
        location: '44c3efb0-2583-4c80-a79e-1f756a03c0a1',
        preferred: true,
      },
    ],
    person: {
      names: [
        {
          givenName: 'John',
          familyName: `TestPatient${Date.now()}`,
          preferred: true,
        },
      ],
      gender: 'M',
      birthdate: '1990-01-01',
    },
  };

  const response = await api.post('patient', {
    data: patientPayload,
  });

  expect(response.ok()).toBeTruthy();
  const patient = await response.json();
  const patientName = `${patient.person.names[0].givenName} ${patient.person.names[0].familyName}`;

  return { uuid: patient.uuid, name: patientName };
}

/**
 * Helper function to get payment modes from the API
 * @param api - The API request context
 * @returns An array of payment modes
 */
async function getPaymentModes(api: APIRequestContext): Promise<any[]> {
  const response = await api.get('cashier/paymentMode');
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  return data.results || [];
}

/**
 * Helper function to get cash points from the API
 * @param api - The API request context
 * @returns An array of cash points
 */
async function getCashPoints(api: APIRequestContext): Promise<any[]> {
  const response = await api.get('cashier/cashPoint');
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  return data.results || [];
}

/**
 * Helper function to get billable services from the API
 * @param api - The API request context
 * @returns An array of billable services
 */
async function getBillableServices(api: APIRequestContext): Promise<any[]> {
  const response = await api.get('cashier/billableService?v=full');
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  return data.results || [];
}

/**
 * Helper function to create a pending bill for a patient
 * @param api - The API request context
 * @param patientUuid - The patient's UUID
 * @param cashPointUuid - The cash point UUID
 * @param cashierUuid - The cashier UUID
 * @returns The created bill details
 */
async function createPendingBill(
  api: APIRequestContext,
  patientUuid: string,
  cashPointUuid: string,
  cashierUuid: string,
): Promise<{ uuid: string; receiptNumber: string; totalAmount: number }> {
  // Get billable services to create line items
  const billableServices = await getBillableServices(api);

  if (billableServices.length === 0) {
    throw new Error('No billable services available for testing');
  }

  const service = billableServices[0];
  const price = service.servicePrices?.[0]?.price || 100;

  const billPayload = {
    cashPoint: cashPointUuid,
    cashier: cashierUuid,
    lineItems: [
      {
        billableService: service.uuid,
        quantity: 1,
        price: price,
        priceName: service.servicePrices?.[0]?.name || 'Default',
        priceUuid: service.servicePrices?.[0]?.uuid || '',
        item: service.name,
        paymentStatus: 'PENDING',
      },
    ],
    payments: [],
    patient: patientUuid,
    status: 'PENDING',
  };

  const response = await api.post('cashier/bill', {
    data: billPayload,
  });

  expect(response.ok()).toBeTruthy();
  const bill = await response.json();

  return {
    uuid: bill.uuid,
    receiptNumber: bill.receiptNumber,
    totalAmount: price,
  };
}

test.describe('Bill Payment Processing - O3-5164', () => {
  let billingPaymentPage: BillingPaymentPage;
  let testBill: TestBill;

  test.beforeEach(async ({ page, api }) => {
    billingPaymentPage = new BillingPaymentPage(page);

    // Setup test data
    const patient = await createTestPatient(api);
    const cashPoints = await getCashPoints(api);

    expect(cashPoints.length).toBeGreaterThan(0);

    // Get current user as cashier
    const sessionResponse = await api.get('session');
    expect(sessionResponse.ok()).toBeTruthy();
    const session = await sessionResponse.json();
    const cashierUuid = session.user.uuid;

    // Create a pending bill
    const bill = await createPendingBill(api, patient.uuid, cashPoints[0].uuid, cashierUuid);

    testBill = {
      patientUuid: patient.uuid,
      billUuid: bill.uuid,
      patientName: patient.name,
      totalAmount: bill.totalAmount,
      receiptNumber: bill.receiptNumber,
    };
  });

  test.afterEach(async ({ api }) => {
    // Cleanup intentionally omitted - test environment manages data reset
  });

  test('should process bill payment and update status from PENDING to PAID', async ({ page, api }) => {
    await test.step('When I navigate to the Billing dashboard with pending bills', async () => {
      await billingPaymentPage.navigateToBillingDashboard();

      // Verify the page has loaded
      await expect(page.getByRole('heading', { name: /billing/i })).toBeVisible();
    });

    await test.step('And I click on the patient name to view bill details', async () => {
      // Navigate directly to the bill details page (more reliable for E2E)
      await billingPaymentPage.navigateToPatientBill(testBill.patientUuid, testBill.billUuid);

      // Wait for the bill details to load
      await expect(page.getByText(/invoice number/i)).toBeVisible();
    });

    await test.step('Then I should see the bill details page displaying Total Amount, Amount Tendered, Invoice Number, Date/Time, and Status "PENDING"', async () => {
      // Verify bill details are displayed
      await billingPaymentPage.verifyBillDetailsDisplayed({
        status: 'PENDING',
        invoiceNumber: testBill.receiptNumber,
      });

      // Verify total amount is displayed
      const totalAmount = await billingPaymentPage.getTotalAmount();
      expect(totalAmount).toBeTruthy();

      // Verify amount tendered is displayed (should be 0 or empty for pending bills)
      const amountTendered = await billingPaymentPage.getAmountTendered();
      expect(amountTendered).toBeTruthy();

      // Verify date/time is displayed
      const dateTime = await billingPaymentPage.getDateTime();
      expect(dateTime).toBeTruthy();
    });

    await test.step('When I scroll to the Payments section', async () => {
      await billingPaymentPage.scrollToPaymentsSection();
    });

    await test.step('Then I should see the payment form with Payment method dropdown, Amount field, and Reference number field', async () => {
      await billingPaymentPage.verifyPaymentMethodDropdownVisible();
      await billingPaymentPage.verifyAmountFieldVisible();
      await billingPaymentPage.verifyReferenceNumberFieldVisible();
    });

    await test.step('When I select a payment method and enter an amount matching the bill total', async () => {
      // Get available payment modes
      const paymentModes = await getPaymentModes(api);

      expect(paymentModes.length).toBeGreaterThan(0);

      const paymentMethod = paymentModes[0].name;

      // Fill the payment form
      await billingPaymentPage.fillPaymentForm(paymentMethod, testBill.totalAmount, `REF-${Date.now()}`);
    });

    await test.step('Then I should see the "Process payment" button becomes enabled', async () => {
      await billingPaymentPage.verifyProcessPaymentButtonEnabled();
    });

    await test.step('When I click the "Process payment" button', async () => {
      await billingPaymentPage.clickProcessPayment();
    });

    await test.step('Then I should see a success notification "Bill payment - Payment processed successfully"', async () => {
      await billingPaymentPage.verifyBillPaymentSuccessNotification();
    });

    await test.step('And I should see the Invoice Status updated from "PENDING" to "PAID"', async () => {
      // Wait for status to update by polling the status element
      await expect(async () => {
        const status = await billingPaymentPage.getBillStatus();
        expect(status).toContain('PAID');
      }).toPass({ timeout: 10000 });
    });

    await test.step('And I should see the Amount Tendered updated to reflect the payment', async () => {
      const amountTendered = await billingPaymentPage.getAmountTendered();
      expect(amountTendered).toContain(testBill.totalAmount.toString());
    });

    await test.step('And I should see the Service status in Line items changed to "PAID"', async () => {
      await billingPaymentPage.verifyLineItemStatus('PAID');
    });

    await test.step('And I should see the Payments section displays the payment record with Date, Bill amount, Amount tendered, and Payment method', async () => {
      // Get payment method used in the test
      const paymentModes = await getPaymentModes(api);
      const paymentMethod = paymentModes[0].name;

      await billingPaymentPage.verifyPaymentHistoryRecord(paymentMethod);
    });

    await test.step('When I navigate back to the Billing dashboard', async () => {
      await billingPaymentPage.navigateToBillingDashboard();

      // Wait for the bills table to load
      await expect(page.getByRole('table')).toBeVisible();
    });

    await test.step('Then I should see the processed bill no longer appears in the pending bills list', async () => {
      // Check if the bill is still visible (it shouldn't be in pending)
      const isBillPresent = await billingPaymentPage.isBillPresentInTable(testBill.patientName);

      // The bill should not be in the pending list anymore
      expect(isBillPresent).toBeFalsy();
    });
  });

  test('should not enable "Process payment" button when payment amount is missing', async ({ page, api }) => {
    const paymentModes = await getPaymentModes(api);
    expect(paymentModes.length).toBeGreaterThan(0);

    await test.step('When I navigate to the bill details page', async () => {
      await billingPaymentPage.navigateToPatientBill(testBill.patientUuid, testBill.billUuid);
      await expect(page.getByText(/invoice number/i)).toBeVisible();
    });

    await test.step('And I scroll to the Payments section', async () => {
      await billingPaymentPage.scrollToPaymentsSection();
    });

    await test.step('When I select a payment method without entering an amount', async () => {
      await billingPaymentPage.selectPaymentMethod(paymentModes[0].name);
    });

    await test.step('Then I should see the "Process payment" button remains disabled', async () => {
      await billingPaymentPage.verifyProcessPaymentButtonDisabled();
    });
  });

  test('should handle partial payment correctly', async ({ page, api }) => {
    const partialAmount = Math.floor(testBill.totalAmount / 2);
    const paymentModes = await getPaymentModes(api);
    expect(paymentModes.length).toBeGreaterThan(0);

    await test.step('When I navigate to the bill details page', async () => {
      await billingPaymentPage.navigateToPatientBill(testBill.patientUuid, testBill.billUuid);
      await expect(page.getByText(/invoice number/i)).toBeVisible();
    });

    await test.step('And I scroll to the Payments section', async () => {
      await billingPaymentPage.scrollToPaymentsSection();
    });

    await test.step('When I enter a partial payment amount', async () => {
      await billingPaymentPage.fillPaymentForm(paymentModes[0].name, partialAmount, `PARTIAL-${Date.now()}`);
    });

    await test.step('And I click the "Process payment" button', async () => {
      await billingPaymentPage.clickProcessPayment();
    });

    await test.step('Then I should see a success notification', async () => {
      await billingPaymentPage.verifyBillPaymentSuccessNotification();
    });

    await test.step('And I should see the bill status remains "PENDING" for partial payment', async () => {
      // Wait for status to update by polling the status element
      await expect(async () => {
        const status = await billingPaymentPage.getBillStatus();
        expect(status).toContain('PENDING');
      }).toPass({ timeout: 10000 });
    });

    await test.step('And I should see the Amount Tendered updated to reflect the partial payment', async () => {
      const amountTendered = await billingPaymentPage.getAmountTendered();
      expect(amountTendered).toContain(partialAmount.toString());
    });
  });
});
