import { type Page } from '@playwright/test';

export class InvoicePage {
  constructor(readonly page: Page) {}

  readonly invoiceNumberLabel = () => this.page.getByText(/invoice number/i);
  readonly totalAmountLabel = () => this.page.getByText(/total amount/i).first();
  readonly amountTenderedLabel = () => this.page.getByText(/amount tendered/i);
  readonly amountDueLabel = () => this.page.getByText(/amount due/i);
  readonly invoiceStatusLabel = () => this.page.getByText(/invoice status/i);
  readonly dateAndTimeLabel = () => this.page.getByText(/date and time/i);
  readonly printBillButton = () => this.page.getByRole('button', { name: /print bill/i });
  readonly printReceiptButton = () => this.page.getByRole('button', { name: /print receipt/i });
  readonly invoiceTable = () => this.page.getByRole('table').first();
  readonly discardButton = () => this.page.getByRole('button', { name: /discard/i });

  async goto(patientUuid: string, billUuid: string) {
    await this.page.goto(`home/billing/patient/${patientUuid}/${billUuid}`);
  }

  async waitForInvoiceToLoad() {
    await this.invoiceTable().waitFor({ state: 'visible' });

    // Wait for billableServices API to complete before allowing payment processing
    // This is a workaround for a production race condition where payment processing
    // requires billableServices data to map service names back to UUIDs
    try {
      await this.page.waitForResponse(
        (response) => response.url().includes('billableService') && response.status() === 200,
        { timeout: 5000 },
      );
    } catch {
      // If billableServices already loaded or request times out, continue
      // The data might be cached from a previous page
    }
  }

  async getInvoiceNumber() {
    const parent = this.invoiceNumberLabel().locator('..');
    const value = await parent.locator('[class*="value"]').textContent();
    return value?.trim();
  }

  async getTotalAmount() {
    const parent = this.totalAmountLabel().locator('..');
    const value = await parent.locator('[class*="value"]').textContent();
    return value?.trim();
  }

  async getAmountTendered() {
    const parent = this.amountTenderedLabel().locator('..');
    const value = await parent.locator('[class*="value"]').textContent();
    return value?.trim();
  }

  async getAmountDue() {
    const parent = this.amountDueLabel().locator('..');
    const value = await parent.locator('[class*="value"]').textContent();
    return value?.trim();
  }

  async getInvoiceStatus() {
    const parent = this.invoiceStatusLabel().locator('..');
    const value = await parent.locator('[class*="value"]').textContent();
    return value?.trim();
  }

  async getDateAndTime() {
    const parent = this.dateAndTimeLabel().locator('..');
    const value = await parent.locator('[class*="value"]').textContent();
    return value?.trim();
  }

  async getLineItems() {
    const rows = await this.invoiceTable().locator('tbody tr').all();
    const items = [];

    const headers = await this.invoiceTable().locator('thead th').allTextContents();
    const itemIndex = headers.findIndex((h) => h.includes('Bill item'));
    const quantityIndex = headers.findIndex((h) => h.includes('Quantity'));
    const priceIndex = headers.findIndex((h) => h.includes('Price'));
    const totalIndex = headers.findIndex((h) => h.includes('Total'));
    // Look for "Status" column (case-insensitive, handles "Status" or "Service status")
    const statusIndex = headers.findIndex((h) => h.toLowerCase().includes('status'));

    for (const row of rows) {
      const cells = await row.locator('td').allTextContents();
      items.push({
        item: cells[itemIndex],
        quantity: cells[quantityIndex],
        price: cells[priceIndex],
        total: cells[totalIndex],
        status: statusIndex >= 0 && cells[statusIndex] ? cells[statusIndex].trim() : undefined,
      });
    }
    return items;
  }

  async clickPrintBill() {
    await this.printBillButton().click();
  }

  async clickPrintReceipt() {
    await this.printReceiptButton().click();
  }

  async navigateToBillingDashboard() {
    await this.discardButton().click();
  }
}
