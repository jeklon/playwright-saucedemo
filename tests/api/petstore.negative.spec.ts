import { test, expect } from '@playwright/test';
import { API_KEY, buildPet, getUntilOk, jsonBody, uniqueId } from './petstore.helpers';

/**
 * Independent negative / edge cases (checklist N2-N5 + extra 404s).
 * Each test is self-contained and safe to run in parallel.
 * Paths are RELATIVE (no leading slash) — see playwright.config.ts.
 */
test.describe('Petstore negative & edge cases', () => {
  test('N2. GET /pet/{id} for a non-existent pet -> 404', async ({ request }) => {
    const res = await request.get('pet/999999999999', { headers: { api_key: API_KEY } });
    expect(res.status()).toBe(404);
    expect((await jsonBody(res)).message).toBe('Pet not found');
  });

  test('N3. GET /pet/{id} with a non-integer id -> 404', async ({ request }) => {
    const res = await request.get('pet/abc', { headers: { api_key: API_KEY } });
    expect(res.status()).toBe(404);
  });

  test('N4. GET /store/order/{id} above the valid range -> 404', async ({ request }) => {
    const res = await request.get('store/order/999');
    expect(res.status()).toBe(404);
    expect((await jsonBody(res)).message).toBe('Order not found');
  });

  test('N5. GET /store/order/0 (below minimum) -> 404', async ({ request }) => {
    const res = await request.get('store/order/0');
    expect(res.status()).toBe(404);
  });

  test('GET /user/{username} for an unknown user -> 404', async ({ request }) => {
    const res = await request.get(`user/no_such_user_${uniqueId()}`);
    expect(res.status()).toBe(404);
    expect((await jsonBody(res)).message).toBe('User not found');
  });

  test('N7. DELETE an already-deleted pet -> 404', async ({ request }) => {
    const id = uniqueId();
    expect((await request.post('pet', { data: buildPet(id) })).status()).toBe(200);
    await getUntilOk(request, `pet/${id}`, { headers: { api_key: API_KEY } }); // ensure it exists
    expect((await request.delete(`pet/${id}`, { headers: { api_key: API_KEY } })).status()).toBe(200);

    const res = await request.delete(`pet/${id}`, { headers: { api_key: API_KEY } });
    expect(res.status()).toBe(404);
  });
});
