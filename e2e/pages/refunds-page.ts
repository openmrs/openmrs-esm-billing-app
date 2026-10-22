import { type Page, expect } from '@playwright/test';

export class RefundRequestModal {
  constructor(readonly page: Page) {}

  readonly modal = () =>
    this.page.getByRole('dialog').filter({ has: this.page.getByRole('heading', { name: /request refund/i }) });
  readonly amountInput = () => this.modal().locator('#refund-amount');
  readonly reasonInput = () => this.modal().locator('#refund-reason');
  readonly submitButton = () => this.modal().getByRole('button', { name: /submit request/i });

  async submitRefund(amount: number, reason: string) {
    await this.modal().waitFor({ state: 'visible' });
    // Carbon NumberInput: clear then type
    await this.amountInput().fill(amount.toString());
    await this.reasonInput().fill(reason);
    await expect(this.submitButton()).toBeEnabled();
    await this.submitButton().click();
  }
}

export class RefundRequestsAdminPage {
  constructor(readonly page: Page) {}

  readonly heading = () => this.page.getByRole('heading', { name: /refund requests/i });
  readonly filterDropdown = () => this.page.getByRole('combobox', { name: /filter by/i });
  readonly requestsTable = () => this.page.getByRole('table', { name: /refund requests/i });
  readonly searchInput = () => this.page.getByTestId('refundRequestsSearchBar');

  async goto() {
    await this.page.goto('billable-services/refund-requests');
  }

  async waitForLoaded() {
    await this.heading().waitFor({ state: 'visible' });
  }

  async openReviewForPatient(patientName: string) {
    await this.searchInput().fill(patientName);
    const row = this.requestsTable().locator('tbody tr').filter({ hasText: patientName }).first();
    await row.waitFor({ state: 'visible' });
    await row.getByRole('link').first().click();
  }
}

export class ReviewBillRefundsModal {
  constructor(readonly page: Page) {}

  readonly modal = () =>
    this.page.getByRole('dialog').filter({ has: this.page.getByRole('heading', { name: /review refunds/i }) });
  readonly firstRefundCard = () => this.modal().locator('article').first();

  async waitForLoaded() {
    await this.modal().waitFor({ state: 'visible' });
    await this.firstRefundCard().waitFor({ state: 'visible' });
  }

  async approveFirstPending() {
    await this.firstRefundCard()
      .getByRole('button', { name: /^approve$/i })
      .click();
  }
}
