import { expect, type Page } from '@playwright/test';
import { extractNumericValue } from '../commands';

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
    await this.page.getByRole('button', { name: /add bill/i }).click();
  }

  async searchAndSelectBillableService(serviceName: string) {
    await this.billableServicesCombobox().click();
    await this.billableServicesCombobox().fill(serviceName);
    await this.page.getByRole('option', { name: new RegExp(serviceName, 'i') }).click();
  }

  async clearBillableServiceCombobox() {
    const combobox = this.billableServicesCombobox();
    // Carbon ComboBox has a clear button (X icon) - try to find it
    // The button is typically inside the combobox container
    const comboboxContainer = combobox.locator('..');
    const clearButton = comboboxContainer
      .getByRole('button', { name: /clear|close/i })
      .or(comboboxContainer.locator('button[aria-label*="clear" i]'));

    const isClearButtonVisible = await clearButton.isVisible().catch(() => false);

    if (isClearButtonVisible) {
      await clearButton.click();
      await expect
        .poll(async () => {
          const value = await combobox.inputValue();
          return value === '';
        })
        .toBe(true);
    } else {
      // Fallback: clear the input field directly by selecting all and deleting
      await combobox.click();
      await combobox.selectText();
      await combobox.press('Backspace');
      await combobox.press('Escape');
    }
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

  async verifyGrandTotal(expectedTotal: number) {
    const grandTotal = await this.getGrandTotal();
    const grandTotalValue = extractNumericValue(grandTotal || '');
    expect(grandTotalValue).toBeCloseTo(expectedTotal, 2);
  }
}
