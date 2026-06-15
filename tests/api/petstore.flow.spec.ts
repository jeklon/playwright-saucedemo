import { test, expect } from '@playwright/test';
import {
  API_KEY,
  buildOrder,
  buildPet,
  buildUser,
  getUntilOk,
  getUntilStatus,
  jsonBody,
  uniqueId,
} from './petstore.helpers';

/**
 * End-to-end happy-path flow for the Swagger Petstore API, in dependency order.
 * Mirrors petstore-checklist.md steps 1-18 (+ post-delete 404 verification).
 *
 * Serial: each step feeds the next (username -> pet -> order), so a failure
 * stops the chain instead of producing misleading cascade errors.
 *
 * NOTE: request paths are RELATIVE (no leading slash) so the "/v2" base path is
 * preserved — see playwright.config.ts (project "api").
 */
test.describe.serial('Petstore E2E flow', () => {
  const petId = uniqueId();
  const orderId = (petId % 10) + 1; // spec: a valid order id is 1..10
  const username = `qa_user_${petId}`;

  // ----------------------------------------------------------- Phase A: user
  test('1. POST /user creates a user', async ({ request }) => {
    const res = await request.post('user', { data: buildUser(petId, username) });
    expect(res.status()).toBe(200);
    expect((await jsonBody(res)).message).toBe(String(petId)); // server echoes created id
  });

  test('2. GET /user/login logs in', async ({ request }) => {
    const res = await request.get('user/login', {
      params: { username, password: 'Passw0rd!' },
    });
    expect(res.status()).toBe(200);
    expect((await jsonBody(res)).message).toContain('logged in user session');
    // spec documents these headers; assert softly since they are non-critical
    expect.soft(res.headers()['x-rate-limit']).toBeDefined();
  });

  test('3. GET /user/{username} returns the user', async ({ request }) => {
    const res = await getUntilOk(request, `user/${username}`);
    expect(res.status()).toBe(200);
    expect(await jsonBody(res)).toMatchObject({ username, firstName: 'QA' });
  });

  test('4. PUT /user/{username} updates the user', async ({ request }) => {
    const res = await request.put(`user/${username}`, {
      data: buildUser(petId, username, { lastName: 'Updated' }),
    });
    expect(res.status()).toBe(200);
    const check = await getUntilOk(request, `user/${username}`);
    expect((await jsonBody(check)).lastName).toBe('Updated');
  });

  // ------------------------------------------------------------ Phase B: pet
  test('5. POST /pet adds a pet', async ({ request }) => {
    const res = await request.post('pet', { data: buildPet(petId) });
    expect(res.status()).toBe(200);
    expect(await jsonBody(res)).toMatchObject({ id: petId, name: 'QA-Rex', status: 'available' });
  });

  test('6. GET /pet/{petId} returns the pet', async ({ request }) => {
    const res = await getUntilOk(request, `pet/${petId}`, { headers: { api_key: API_KEY } });
    expect(res.status()).toBe(200);
    expect((await jsonBody(res)).id).toBe(petId);
  });

  test('7. PUT /pet updates the pet (-> pending)', async ({ request }) => {
    const res = await request.put('pet', {
      data: buildPet(petId, { name: 'QA-Rex-v2', status: 'pending', category: undefined, tags: undefined }),
    });
    expect(res.status()).toBe(200);
    expect(await jsonBody(res)).toMatchObject({ id: petId, name: 'QA-Rex-v2', status: 'pending' });
  });

  test('8. POST /pet/{petId} updates via form data (-> sold)', async ({ request }) => {
    const res = await request.post(`pet/${petId}`, {
      form: { name: 'QA-Rex-sold', status: 'sold' },
    });
    expect(res.status()).toBe(200);
    expect((await jsonBody(res)).message).toBe(String(petId));
  });

  test('9. POST /pet/{petId}/uploadImage uploads a file', async ({ request }) => {
    const res = await request.post(`pet/${petId}/uploadImage`, {
      headers: { api_key: API_KEY },
      multipart: {
        additionalMetadata: 'qa-test',
        file: { name: 'qa.txt', mimeType: 'text/plain', buffer: Buffer.from('upload sample') },
      },
    });
    expect(res.status()).toBe(200);
    expect((await jsonBody(res)).code).toBe(200);
  });

  test('10. GET /pet/findByStatus finds available pets', async ({ request }) => {
    const res = await request.get('pet/findByStatus', { params: { status: 'available' } });
    expect(res.status()).toBe(200);
    expect(Array.isArray(await jsonBody(res))).toBe(true);
  });

  // ---------------------------------------------------------- Phase C: store
  test('11. GET /store/inventory returns a status map', async ({ request }) => {
    const res = await request.get('store/inventory', { headers: { api_key: API_KEY } });
    expect(res.status()).toBe(200);
    const body = await jsonBody(res);
    expect(typeof body).toBe('object');
    expect(typeof body.available).toBe('number'); // map of status -> count
  });

  test('12. POST /store/order places an order', async ({ request }) => {
    const res = await request.post('store/order', { data: buildOrder(orderId, petId) });
    expect(res.status()).toBe(200);
    expect(await jsonBody(res)).toMatchObject({ id: orderId, petId, status: 'placed' });
  });

  test('13. GET /store/order/{orderId} returns the order', async ({ request }) => {
    const res = await getUntilOk(request, `store/order/${orderId}`);
    expect(res.status()).toBe(200);
    expect((await jsonBody(res)).petId).toBe(petId);
  });

  test('14. DELETE /store/order/{orderId} deletes the order', async ({ request }) => {
    const res = await request.delete(`store/order/${orderId}`);
    expect(res.status()).toBe(200);
  });

  // -------------------------------------------- Phase D: cleanup (LIFO) + 404
  test('15. DELETE /pet/{petId} deletes the pet', async ({ request }) => {
    const res = await request.delete(`pet/${petId}`, { headers: { api_key: API_KEY } });
    expect(res.status()).toBe(200);
  });

  test('16. GET /pet/{petId} after delete returns 404', async ({ request }) => {
    const res = await getUntilStatus(request, `pet/${petId}`, 404, { headers: { api_key: API_KEY } });
    expect(res.status()).toBe(404);
    expect((await jsonBody(res)).message).toBe('Pet not found');
  });

  test('17. GET /user/logout logs out', async ({ request }) => {
    const res = await request.get('user/logout');
    expect(res.status()).toBe(200);
  });

  test('18. DELETE /user/{username} and verify removal', async ({ request }) => {
    const del = await request.delete(`user/${username}`);
    expect(del.status()).toBe(200);
    const res = await getUntilStatus(request, `user/${username}`, 404);
    expect(res.status()).toBe(404);
  });
});
