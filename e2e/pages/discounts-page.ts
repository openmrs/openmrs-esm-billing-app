import { type Page, expect } from '@playwright/test';

export class DiscountRequestModal {
  constructor(readonly page: Page) {}

  readonly modal = () =>
    this.page.getByRole('dialog').filter({ has: this.page.getByRole('heading', { name: /request discount/i }) });
  readonly percentageRadio = () => this.modal().getByRole('radio', { name: /percentage/i });
  readonly fixedAmountRadio = () => this.modal().getByRole('radio', { name: /fixed amount/i });
  readonly valueInput = () => this.modal().locator('#discount-value');
  readonly justificationInput = () => this.modal().locator('#discount-justification');
  readonly submitButton = () => this.modal().getByRole('button', { name: /submit request/i });

  async submitPercentageDiscount(percentage: number, justification: string) {
    await this.modal().waitFor({ state: 'visible' });
    await this.percentageRadio().check();
    await this.valueInput().fill(percentage.toString());
    await this.justificationInput().fill(justification);
    await expect(this.submitButton()).toBeEnabled();
    await this.submitButton().click();
  }
}

export class DiscountRequestsAdminPage {
  constructor(readonly page: Page) {}

  readonly heading = () => this.page.getByRole('heading', { name: /discount requests/i });
  readonly filterDropdown = () => this.page.getByRole('combobox', { name: /filter by/i });
  readonly requestsTable = () => this.page.getByRole('table', { name: /discount requests/i });
  readonly searchInput = () => this.page.getByTestId('discountRequestsSearchBar');

  async goto() {
    await this.page.goto('billable-services/discount-requests');
  }

  async waitForLoaded() {
    await this.heading().waitFor({ state: 'visible' });
  }

  async openReviewForPatient(patientName: string) {
    await this.searchInput().fill(patientName);
    const row = this.requestsTable().locator('tbody tr').filter({ hasText: patientName }).first();
    await row.waitFor({ state: 'visible' });
    // Click the invoice number link inside the row to open the review modal.
    await row.getByRole('link').first().click();
  }
}

export class ReviewBillDiscountsModal {
  constructor(readonly page: Page) {}

  readonly modal = () =>
    this.page.getByRole('dialog').filter({ has: this.page.getByRole('heading', { name: /review discounts/i }) });
  readonly pendingSection = () =>
    this.modal()
      .locator('section')
      .filter({ has: this.page.getByText(/pending discounts/i) });
  readonly firstPendingCard = () => this.modal().locator('article').first();

  async waitForLoaded() {
    await this.modal().waitFor({ state: 'visible' });
    await this.firstPendingCard().waitFor({ state: 'visible' });
  }

  async approveFirstPending() {
    const card = this.firstPendingCard();
    await card.getByRole('button', { name: /^approve$/i }).click();
  }

  async rejectFirstPending() {
    const card = this.firstPendingCard();
    await card.getByRole('button', { name: /reject$/i }).click();
    await card.getByRole('button', { name: /confirm reject/i }).click();
  }
}
