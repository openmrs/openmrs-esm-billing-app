import { type Page } from '@playwright/test';

export class PaymentPage {
  constructor(readonly page: Page) {}

  readonly addPaymentButton = () => this.page.getByRole('button', { name: /add payment/i });
  readonly paymentMethodCombobox = () => this.page.getByRole('combobox', { name: /payment method/i }).first();
  readonly amountInput = () => this.page.getByLabel(/amount/i).first();
  readonly referenceCodeInput = () => this.page.getByLabel(/reference number/i).first();
  readonly processPaymentButton = () => this.page.getByRole('button', { name: /process payment/i });
  readonly paymentHistorySection = () =>
    this.page.getByRole('table').filter({ has: this.page.getByText('Date of payment') });
  readonly removePaymentButton = () => this.page.getByRole('button', { name: /remove/i });

  async waitForPaymentForm() {
    // Wait for the "Add payment method" button to be visible
    // This confirms payment modes have loaded (otherwise form shows skeleton)
    await this.addPaymentButton().waitFor({ state: 'visible', timeout: 30000 });
  }

  async addPayment(paymentMethod: string, amount: number, referenceCode?: string) {
    // For single line item bills, a payment row should already exist automatically
    // Just wait for the payment method dropdown to be available and interact with it
    await this.paymentMethodCombobox().waitFor({ state: 'visible', timeout: 10000 });

    // Select payment method
    await this.paymentMethodCombobox().click();
    await this.page.getByRole('option', { name: new RegExp(paymentMethod, 'i') }).click();

    // Enter amount
    await this.amountInput().fill(amount.toString());

    // Enter reference code if provided
    if (referenceCode) {
      await this.referenceCodeInput().fill(referenceCode);
    }
  }

  async addMultiplePayments(payments: Array<{ method: string; amount: number; referenceCode?: string }>) {
    for (const payment of payments) {
      await this.addPayment(payment.method, payment.amount, payment.referenceCode);
    }
  }

  async processPayment() {
    await this.processPaymentButton().click();
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
