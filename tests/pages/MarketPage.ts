import { Page, Locator } from '@playwright/test';

export class MarketPage {
  readonly page: Page;
  readonly addToCartBackpack: Locator;
  readonly shoppingCartBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addToCartBackpack = page.getByTestId('add-to-cart-sauce-labs-backpack');
    this.shoppingCartBadge = page.getByTestId('shopping-cart-badge');
  }

  async addBackpackToCart() {
    await this.addToCartBackpack.click();
  }

}