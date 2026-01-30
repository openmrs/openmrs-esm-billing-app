import { expect, type Page } from '@playwright/test';

export class PaymentPage {
  constructor(readonly page: Page) {}

  readonly addPaymentButton = () => this.page.getByRole('button', { name: /add payment/i });
  readonly paymentMethodCombobox = () => this.page.getByRole('combobox', { name: /payment method/i }).first();
  readonly amountInput = () => this.page.getByLabel(/amount/i).first();
  readonly referenceCodeInput = () => this.page.getByLabel(/reference number/i).first();
  readonly processPaymentButton = () => this.page.getByRole('button', { name: /process payment/i });
  readonly paymentHistorySection = () =>
    this.page.getByRole('table').filter({ has: this.page.getByText('Date of payment') });
  readonly addPaymentMethodButton = () => this.page.getByRole('button', { name: /add payment method/i });
  readonly removePaymentButton = () => this.page.getByRole('button', { name: /remove/i });

  async waitForPaymentForm() {
    // Wait for the payment form to be interactive.
    // The combobox only appears after payment modes have loaded
    // (while loading, the form shows a skeleton instead).
    await this.paymentMethodCombobox().waitFor({ state: 'visible', timeout: 30000 });
  }

  async addPayment(paymentMethod: string, amount: number, referenceCode?: string) {
    await this.paymentMethodCombobox().click();
    await this.page.getByRole('option', { name: new RegExp(paymentMethod, 'i') }).click();

    await this.amountInput().fill(amount.toString());

    if (referenceCode) {
      await this.referenceCodeInput().fill(referenceCode);
    }
  }

  async addMultiplePayments(payments: Array<{ method: string; amount: number; referenceCode?: string }>) {
    const addButton = this.addPaymentMethodButton();
    const isAddButtonVisible = await addButton.isVisible().catch(() => false);
    const existingRows = await this.page.locator('[class*="paymentMethodContainer"]').count();

    if (isAddButtonVisible && payments.length > existingRows) {
      const rowsToAdd = payments.length - existingRows;
      for (let i = 0; i < rowsToAdd; i++) {
        await addButton.click();
        const expectedRowCount = existingRows + i + 1;
        await expect(this.page.locator('[class*="paymentMethodContainer"]')).toHaveCount(expectedRowCount);
      }
    }

    const paymentRows = await this.page.locator('[class*="paymentMethodContainer"]').all();

    for (let i = 0; i < payments.length && i < paymentRows.length; i++) {
      const row = paymentRows[i];

      const methodDropdown = row.getByRole('combobox', { name: /payment method/i });
      await methodDropdown.click();
      await this.page.getByRole('option', { name: new RegExp(payments[i].method, 'i') }).click();

      const amountInput = row.getByLabel(/amount/i);
      await amountInput.fill(payments[i].amount.toString());

      if (payments[i].referenceCode) {
        const refInput = row.getByLabel(/reference number/i);
        await refInput.fill(payments[i].referenceCode);
      }
    }
  }

  async processPayment() {
    await this.processPaymentButton().click();
  }

  async isProcessPaymentButtonEnabled() {
    return await this.processPaymentButton().isEnabled();
  }

  async removePayment(index = 0) {
    const removeButtons = await this.removePaymentButton().all();
    await removeButtons[index].click();
  }

  async getPaymentHistory() {
    const rows = await this.paymentHistorySection().locator('tbody tr').all();
    const payments = [];
    for (const row of rows) {
      const cells = await row.locator('td').allTextContents();
      payments.push({
        date: cells[0],
        billAmount: cells[1],
        amountTendered: cells[2],
        method: cells[3],
      });
    }
    return payments;
  }

  async verifyPaymentProcessed(amount: string) {
    const history = await this.getPaymentHistory();
    return history.some((payment) => payment.amountTendered.includes(amount));
  }

  async getAmountDue() {
    const amountDueText = await this.page.getByText(/amount due/i).textContent();
    return amountDueText;
  }
}
