import { type Page } from '@playwright/test';

export class PaymentPage {
  constructor(readonly page: Page) {}

  readonly paymentMethodCombobox = () => this.page.getByRole('combobox', { name: /payment method/i }).first();
  readonly amountInput = () => this.page.getByLabel(/amount/i).first();
  readonly referenceCodeInput = () => this.page.getByLabel(/reference number/i).first();
  readonly processPaymentButton = () => this.page.getByRole('button', { name: /process payment/i });
  readonly paymentHistorySection = () =>
    this.page.getByRole('table').filter({ has: this.page.getByText('Date of payment') });

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

  async processPayment() {
    await this.processPaymentButton().click();
  }

  async isProcessPaymentButtonEnabled() {
    return await this.processPaymentButton().isEnabled();
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
