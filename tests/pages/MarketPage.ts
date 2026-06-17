import { Page, Locator } from '@playwright/test';

export class MarketPage {
  readonly page: Page;
  readonly inventoryItems: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.inventoryItems = page.getByTestId('inventory-item');
    this.cartBadge = page.getByTestId('shopping-cart-badge');
  }

  async addItemToCart(itemName: string) {
    const targetProduct = this.inventoryItems.filter({
      has: this.page.getByText(itemName, { exact: true })
    });
    await targetProduct.getByRole('button', { name: 'Add to cart' }).click();
  }

}
