import { test, expect } from './fixtures/LoginFixture';

test('login', async ({ loginPage }) => {
  await loginPage.login('standard_user', 'secret_sauce');
  await expect(loginPage.page.getByTestId('title')).toBeVisible();
});

test('non valid login', async ({ loginPage }) => {
  await loginPage.login('standard_user', 'wrong_password');
  await expect(loginPage.error).toBeVisible();
  await expect(loginPage.error).toContainText('do not match');
});