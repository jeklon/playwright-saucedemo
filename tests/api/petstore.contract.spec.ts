import { test, expect } from '@playwright/test';
import { API_KEY, buildPet, jsonBody, uniqueId } from './petstore.helpers';

/**
 * Contract / spec-vs-reality checks. These DOCUMENT known divergences between
 * the OpenAPI spec and the live petstore.swagger.io server. They assert the
 * ACTUAL behaviour (so the suite stays green) and annotate the spec expectation,
 * so the divergence is visible in the report rather than silently ignored.
 *
 * If the server is ever fixed, these tests start failing — which is the signal
 * to update the contract.
 */
test.describe('Petstore contract / spec-vs-reality (known issues)', () => {
  test('C2. POST /pet without required "name" is accepted (spec says 405)', async ({ request }, testInfo) => {
    testInfo.annotations.push({
      type: 'known-issue',
      description: 'Spec marks Pet.name + photoUrls as required, yet the server returns 200 instead of 405.',
    });
    const id = uniqueId();
    const res = await request.post('pet', { data: { id, status: 'available' } });
    expect(res.status()).toBe(200); // documents lenient validation
    await request.delete(`pet/${id}`, { headers: { api_key: API_KEY } }); // cleanup
  });

  test('C1. Write endpoints are not auth-protected (spec declares petstore_auth)', async ({ request }, testInfo) => {
    testInfo.annotations.push({
      type: 'known-issue',
      description: 'POST /pet declares OAuth2 petstore_auth, but the call succeeds with no Authorization header.',
    });
    const id = uniqueId();
    const res = await request.post('pet', { data: buildPet(id) }); // no token sent
    expect(res.status()).toBe(200);
    await request.delete(`pet/${id}`, { headers: { api_key: API_KEY } }); // cleanup
  });

  test('Quality. GET /pet/{non-integer} leaks an internal exception in the body', async ({ request }, testInfo) => {
    const res = await request.get('pet/abc', { headers: { api_key: API_KEY } });
    const body = await jsonBody(res);
    testInfo.annotations.push({
      type: 'known-issue',
      description: `Error body leaks an implementation detail: ${JSON.stringify(body.message)}`,
    });
    expect(res.status()).toBe(404);
    // soft: documents the leak without breaking the run if the server changes the message
    expect.soft(String(body.message)).toContain('NumberFormatException');
  });
});
