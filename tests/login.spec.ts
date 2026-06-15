import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.beforeEach(async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
});

test('login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.login('standard_user', 'secret_sauce');
  await expect(page.getByTestId('title')).toBeVisible();
});

test('non valid login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.login('standard_user', 'wrong_password');
  await expect(loginPage.error).toBeVisible();
  await expect(loginPage.error).toContainText('do not match');
});