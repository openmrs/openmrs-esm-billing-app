import { type Page, expect } from '@playwright/test';

export class BillingDashboardPage {
  constructor(readonly page: Page) {}

  readonly billsTable = () => this.page.getByRole('table').first();
  readonly filterDropdown = () => this.page.getByRole('combobox', { name: /filter by/i });
  readonly searchInput = () => this.page.getByPlaceholder(/filter table/i);
  readonly billListHeading = () => this.page.getByRole('heading', { name: /bill list/i });

  async goto() {
    await this.page.goto('home/billing');
  }

  async waitForBillsTableToLoad() {
    await this.billsTable().waitFor({ state: 'visible' });
    try {
      await this.page.waitForResponse(
        (response) => response.url().includes('billing/bill') && response.status() === 200,
        { timeout: 10000 },
      );
    } catch {
      // If bills already loaded or request times out, continue
    }
  }

  async selectFilter(filterText: 'All bills' | 'Pending bills' | 'Paid bills') {
    await this.filterDropdown().click();
    await this.page.getByRole('option', { name: filterText }).click();
  }

  async searchBills(searchTerm: string) {
    await this.searchInput().fill(searchTerm);
  }

  async getBillsCount() {
    const rows = await this.billsTable().locator('tbody tr').all();
    return rows.length;
  }

  async getBillRowByPatientName(patientName: string) {
    return this.billsTable().locator('tbody tr').filter({ hasText: patientName });
  }

  async clickInvoiceNumberLink(patientName: string) {
    const row = await this.getBillRowByPatientName(patientName);
    const invoiceLink = row.getByRole('link').first();
    await invoiceLink.click();
  }

  async verifyBillInTable(patientName: string, shouldBeVisible: boolean = true) {
    const billRow = await this.getBillRowByPatientName(patientName);
    if (shouldBeVisible) {
      await expect(billRow).toBeVisible();
    } else {
      await expect(billRow).toBeHidden();
    }
  }

  async getBillsInTable() {
    const rows = await this.billsTable().locator('tbody tr').all();
    const bills = [];

    const headers = await this.billsTable().locator('thead th').allTextContents();
    const billDateIndex = headers.findIndex((h) => h.includes('Bill date') || h.includes('billDate'));
    const identifierIndex = headers.findIndex((h) => h.includes('Identifier') || h.includes('identifier'));
    const nameIndex = headers.findIndex((h) => h.includes('Name') || h.includes('name'));
    const billedItemsIndex = headers.findIndex((h) => h.includes('Billed Items') || h.includes('billedItems'));

    for (const row of rows) {
      const cells = await row.locator('td').allTextContents();
      bills.push({
        billDate: cells[billDateIndex],
        identifier: cells[identifierIndex],
        patientName: cells[nameIndex],
        billedItems: cells[billedItemsIndex],
      });
    }
    return bills;
  }

  async verifyNoMatchingBillsMessage() {
    await expect(this.page.getByText(/no matching bills to display/i)).toBeVisible();
  }
}
