import { type Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page Object Model for the Billing Payment functionality
 * Handles interactions with the billing dashboard, bill details, and payment processing
 */
export class BillingPaymentPage {
  constructor(readonly page: Page) {}

  /**
   * Navigate to the billing dashboard
   */
  async navigateToBillingDashboard() {
    await this.page.goto('home/billing');
  }

  /**
   * Click on a patient name in the bills table to view bill details
   * @param patientName - The patient's name to click on
   */
  async clickPatientBillByName(patientName: string) {
    await this.page.getByRole('link', { name: patientName, exact: false }).click();
  }

  /**
   * Click on a patient bill using the patient UUID and bill UUID
   * @param patientUuid - The patient's UUID
   * @param billUuid - The bill's UUID
   */
  async navigateToPatientBill(patientUuid: string, billUuid: string) {
    await this.page.goto(`home/billing/patient/${patientUuid}/${billUuid}`);
  }

  /**
   * Get the total amount displayed on the bill details page
   * @returns The total amount as a string
   */
  async getTotalAmount(): Promise<string> {
    const totalAmountLabel = this.page.getByText(/total amount/i);
    const totalAmountContainer = totalAmountLabel.locator('..');
    return await totalAmountContainer.textContent();
  }

  /**
   * Get the amount tendered displayed on the bill details page
   * @returns The amount tendered as a string
   */
  async getAmountTendered(): Promise<string> {
    const amountTenderedLabel = this.page.getByText(/amount tendered/i);
    const amountTenderedContainer = amountTenderedLabel.locator('..');
    return await amountTenderedContainer.textContent();
  }

  /**
   * Get the invoice number displayed on the bill details page
   * @returns The invoice number as a string
   */
  async getInvoiceNumber(): Promise<string> {
    const invoiceNumberLabel = this.page.getByText(/invoice number/i);
    const invoiceNumberContainer = invoiceNumberLabel.locator('..');
    return await invoiceNumberContainer.textContent();
  }

  /**
   * Get the bill status displayed on the bill details page
   * @returns The bill status as a string
   */
  async getBillStatus(): Promise<string> {
    // The invoice status is labeled as "Invoice Status" in the component
    const statusLabel = this.page.getByText(/invoice status/i);
    const statusValue = statusLabel.locator('..').getByText(/PAID|PENDING/i);
    return await statusValue.textContent();
  }

  /**
   * Get the date and time displayed on the bill details page
   * @returns The date and time as a string
   */
  async getDateTime(): Promise<string> {
    // The date/time is labeled as "Date And Time" in the component
    const dateTimeLabel = this.page.getByText(/date and time/i);
    const dateTimeContainer = dateTimeLabel.locator('..');
    return await dateTimeContainer.textContent();
  }

  /**
   * Scroll to the Payments section of the page
   */
  async scrollToPaymentsSection() {
    const paymentsHeading = this.page.getByRole('heading', { name: /payments/i });
    await paymentsHeading.scrollIntoViewIfNeeded();
  }

  /**
   * Verify that the payment method dropdown is visible
   */
  async verifyPaymentMethodDropdownVisible() {
    // The dropdown has label "Payment method" from the component
    const paymentMethodDropdown = this.page
      .getByRole('combobox')
      .filter({ has: this.page.getByText(/select payment method/i) });
    await expect(paymentMethodDropdown).toBeVisible();
  }

  /**
   * Verify that the amount field is visible
   */
  async verifyAmountFieldVisible() {
    const amountField = this.page.getByPlaceholder(/enter amount/i);
    await expect(amountField).toBeVisible();
  }

  /**
   * Verify that the reference number field is visible
   */
  async verifyReferenceNumberFieldVisible() {
    const referenceField = this.page.getByPlaceholder(/enter reference number/i);
    await expect(referenceField).toBeVisible();
  }

  /**
   * Select a payment method from the dropdown
   * @param paymentMethod - The payment method to select (e.g., "Cash", "Mobile Money")
   */
  async selectPaymentMethod(paymentMethod: string) {
    // Click the dropdown button (Carbon Dropdown uses button role)
    const paymentMethodDropdown = this.page
      .getByRole('combobox')
      .filter({ has: this.page.getByText(/select payment method/i) });
    await paymentMethodDropdown.click();

    // Wait for menu to open and select option
    await this.page.getByRole('option', { name: paymentMethod, exact: true }).click();
  }

  /**
   * Enter the payment amount
   * @param amount - The amount to enter
   */
  async enterPaymentAmount(amount: number | string) {
    // The amount field is a NumberInput with placeholder "Enter amount"
    const amountField = this.page.getByPlaceholder(/enter amount/i);
    await amountField.click();
    await amountField.clear();
    await amountField.fill(amount.toString());
  }

  /**
   * Enter a reference number for the payment
   * @param referenceNumber - The reference number to enter
   */
  async enterReferenceNumber(referenceNumber: string) {
    // The reference field is a TextInput with placeholder "Enter reference number"
    const referenceField = this.page.getByPlaceholder(/enter reference number/i);
    await referenceField.fill(referenceNumber);
  }

  /**
   * Verify that the "Process payment" button is enabled
   */
  async verifyProcessPaymentButtonEnabled() {
    const processPaymentButton = this.page.getByRole('button', { name: /process payment/i });
    await expect(processPaymentButton).toBeEnabled();
  }

  /**
   * Verify that the "Process payment" button is disabled
   */
  async verifyProcessPaymentButtonDisabled() {
    const processPaymentButton = this.page.getByRole('button', { name: /process payment/i });
    await expect(processPaymentButton).toBeDisabled();
  }

  /**
   * Click the "Process payment" button
   */
  async clickProcessPayment() {
    const processPaymentButton = this.page.getByRole('button', { name: /process payment/i });
    await processPaymentButton.click();
  }

  /**
   * Verify that a success notification appears with the expected message
   * @param message - The expected message in the notification
   */
  async verifySuccessNotification(message: string) {
    const notification = this.page.getByRole('status').filter({ hasText: message });
    await expect(notification).toBeVisible();
  }

  /**
   * Wait for and verify the success notification for bill payment
   */
  async verifyBillPaymentSuccessNotification() {
    // Look for the notification with both title and subtitle
    const notification = this.page
      .getByRole('status')
      .filter({ hasText: /bill payment/i })
      .filter({ hasText: /payment processed successfully/i });
    await expect(notification).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verify that the invoice status has been updated
   * @param expectedStatus - The expected status (e.g., "PAID", "PENDING")
   */
  async verifyInvoiceStatusUpdated(expectedStatus: string) {
    const statusText = await this.getBillStatus();
    expect(statusText).toContain(expectedStatus);
  }

  /**
   * Verify that the service status in line items is updated
   * @param expectedStatus - The expected status (e.g., "PAID")
   */
  async verifyLineItemStatus(expectedStatus: string) {
    // Look for the status in the line items table
    const lineItemsTable = this.page.getByRole('table').first();
    const statusCell = lineItemsTable.getByText(expectedStatus);
    await expect(statusCell).toBeVisible();
  }

  /**
   * Verify that a payment record appears in the Payments section
   * @param expectedPaymentMethod - The expected payment method
   * @param expectedAmount - The expected amount (optional)
   */
  async verifyPaymentRecordDisplayed(expectedPaymentMethod: string, expectedAmount?: string) {
    const paymentsSection = this.page.locator('section', {
      has: this.page.getByRole('heading', { name: /payments/i }),
    });
    await expect(paymentsSection.getByText(expectedPaymentMethod)).toBeVisible();

    if (expectedAmount) {
      await expect(paymentsSection.getByText(expectedAmount)).toBeVisible();
    }
  }

  /**
   * Verify payment details in the payment history table
   * @param paymentMethod - The payment method used
   */
  async verifyPaymentHistoryRecord(paymentMethod: string) {
    // Check for the payment method in the payment history section
    const paymentHistoryTable = this.page.getByRole('table').last();
    await expect(paymentHistoryTable.getByText(paymentMethod)).toBeVisible();
  }

  /**
   * Navigate back to the billing dashboard using the back button or breadcrumb
   */
  async navigateBackToBillingDashboard() {
    // Try to find a back button or breadcrumb link
    const backButton = this.page
      .getByRole('button', { name: /back/i })
      .or(this.page.getByRole('link', { name: /billing/i }));

    if ((await backButton.count()) > 0) {
      await backButton.first().click();
    } else {
      // Fallback: navigate directly
      await this.navigateToBillingDashboard();
    }
  }

  /**
   * Verify that a bill is not present in the pending bills list
   * @param patientName - The patient's name
   * @param billUuid - The bill's UUID
   */
  async verifyBillNotInPendingList(patientName: string, billUuid: string) {
    // Check that the bill is not in the table
    const billLink = this.page
      .getByRole('link', { name: patientName })
      .filter({ has: this.page.locator(`[href*="${billUuid}"]`) });
    await expect(billLink).toBeHidden();
  }

  /**
   * Verify that a bill row is not visible in the bills table
   * @param patientName - The patient's name to check for
   */
  async verifyBillRowNotVisible(patientName: string) {
    const billsTable = this.page.getByRole('table');
    const patientNameInTable = billsTable.getByText(patientName, { exact: true });
    await expect(patientNameInTable).toBeHidden();
  }

  /**
   * Get a bill by patient name from the pending bills table
   * @param patientName - The patient's name
   * @returns Whether the bill is found
   */
  async isBillPresentInTable(patientName: string): Promise<boolean> {
    const billLink = this.page.getByRole('link', { name: patientName, exact: false });
    return await billLink.isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Verify bill details are displayed correctly
   * @param options - Object containing expected values for total amount, status, etc.
   */
  async verifyBillDetailsDisplayed(options: {
    totalAmount?: string;
    amountTendered?: string;
    invoiceNumber?: string;
    status?: string;
  }) {
    if (options.totalAmount) {
      const totalAmount = await this.getTotalAmount();
      expect(totalAmount).toContain(options.totalAmount);
    }

    if (options.amountTendered !== undefined) {
      const amountTendered = await this.getAmountTendered();
      expect(amountTendered).toContain(options.amountTendered);
    }

    if (options.invoiceNumber) {
      const invoiceNumber = await this.getInvoiceNumber();
      expect(invoiceNumber).toContain(options.invoiceNumber);
    }

    if (options.status) {
      const status = await this.getBillStatus();
      expect(status).toContain(options.status);
    }
  }

  /**
   * Fill payment form with complete details
   * @param paymentMethod - The payment method to select
   * @param amount - The payment amount
   * @param referenceNumber - Optional reference number
   */
  async fillPaymentForm(paymentMethod: string, amount: number | string, referenceNumber?: string) {
    await this.selectPaymentMethod(paymentMethod);
    await this.enterPaymentAmount(amount);

    if (referenceNumber) {
      await this.enterReferenceNumber(referenceNumber);
    }
  }
}
