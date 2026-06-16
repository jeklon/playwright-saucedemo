import { test, expect } from '@playwright/test';
import { MarketPage } from './pages/MarketPage';

test.use({ storageState: 'playwright/.auth/user.json' });

test('add item to cart', async ({ page }) => {
  const marketPage = new MarketPage(page);
  await page.goto('https://www.saucedemo.com/inventory.html');
  await marketPage.addBackpackToCart();
  await expect(marketPage.shoppingCartBadge).toHaveText('1');

});