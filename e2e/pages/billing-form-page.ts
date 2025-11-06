import { type Page } from '@playwright/test';

export class BillingFormPage {
  constructor(readonly page: Page) {}

  readonly billableServicesCombobox = () => this.page.getByRole('combobox', { name: /search items and services/i });
  readonly quantityInput = (itemUuid: string) => this.page.locator(`#quantity-${itemUuid}`);
  readonly paymentMethodCombobox = (itemUuid: string) => this.page.locator(`#payment-method-${itemUuid}`);
  readonly selectedItemCards = () => this.page.locator('[class*="itemCard"]');
  readonly removeItemButton = () => this.page.getByRole('button', { name: /remove/i });
  readonly saveButton = () => this.page.getByRole('button', { name: /save and close/i });
  readonly discardButton = () => this.page.getByRole('button', { name: /discard/i });
  readonly grandTotalLabel = () => this.page.getByText(/grand total/i);

  async openBillingForm(patientUuid: string) {
    await this.page.goto(`patient/${patientUuid}/chart`);
    // The billing form opens as a workspace
    await this.page.getByRole('button', { name: /add bill/i }).click();
  }

  async searchAndSelectBillableService(serviceName: string) {
    await this.billableServicesCombobox().click();
    await this.billableServicesCombobox().fill(serviceName);
    await this.page.getByRole('option', { name: new RegExp(serviceName, 'i') }).click();
  }

  async updateQuantity(itemUuid: string, quantity: number) {
    const input = this.quantityInput(itemUuid);
    await input.clear();
    await input.fill(quantity.toString());
  }

  async selectPaymentMethod(itemUuid: string, paymentMethod: string) {
    const combobox = this.paymentMethodCombobox(itemUuid);
    await combobox.click();
    await this.page.getByRole('option', { name: new RegExp(paymentMethod, 'i') }).click();
  }

  async removeItem(index = 0) {
    const removeButtons = await this.removeItemButton().all();
    if (removeButtons[index]) {
      await removeButtons[index].click();
    }
  }

  async getLineItemsCount() {
    const items = await this.selectedItemCards().all();
    return items.length;
  }

  async getGrandTotal() {
    const totalText = await this.grandTotalLabel().textContent();
    return totalText;
  }

  async saveBill() {
    await this.saveButton().click();
  }

  async discardBill() {
    await this.discardButton().click();
  }

  async verifyItemAdded(itemName: string) {
    return this.page.getByText(itemName).isVisible();
  }

  async selectPaymentMethodIfVisible(paymentMethodName: string = 'Cash') {
    const dropdown = this.page.getByPlaceholder('Select payment method').first();
    const isVisible = await dropdown.isVisible().catch(() => false);

    if (isVisible) {
      await dropdown.click();
      await this.page
        .getByRole('option', { name: new RegExp(paymentMethodName, 'i') })
        .first()
        .click();
    }
  }
}
