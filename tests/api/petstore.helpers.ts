import { APIRequestContext, APIResponse } from '@playwright/test';

/**
 * Shared helpers and data factories for the Swagger Petstore API tests.
 *
 * Base URL is set per-project in playwright.config.ts (project "api") to
 * "https://petstore.swagger.io/v2/" — note the TRAILING slash. Because Playwright
 * resolves requests via new URL(path, baseURL), every path below must be RELATIVE
 * (no leading slash), otherwise the "/v2" segment is dropped.
 */

/** Documented test api_key from the Petstore spec (used by api_key-secured reads). */
export const API_KEY = 'special-key';

/**
 * Unique-ish id so repeated / parallel runs don't collide on the shared public
 * server. Combines epoch ms with a small random component.
 */
export function uniqueId(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

/**
 * Parse a response body as JSON, but fail with a CLEAR message (status + a body
 * snippet) when the server returns non-JSON (e.g. an nginx HTML 404 during a
 * blip) instead of a cryptic "Unexpected token '<'" SyntaxError.
 */
export async function jsonBody(res: APIResponse): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const ct = res.headers()['content-type'] ?? 'unknown';
    throw new Error(`Expected JSON but got ${res.status()} (${ct}): ${text.slice(0, 120)}`);
  }
}

// ---- Data factories -------------------------------------------------------

export interface Pet {
  id: number;
  name: string;
  photoUrls: string[];
  status?: 'available' | 'pending' | 'sold';
  category?: { id: number; name: string };
  tags?: { id: number; name: string }[];
}

export function buildPet(id: number, overrides: Partial<Pet> = {}): Pet {
  return {
    id,
    name: 'QA-Rex',
    photoUrls: ['https://example.com/rex.jpg'],
    status: 'available',
    category: { id: 1, name: 'dogs' },
    tags: [{ id: 1, name: 'tag1' }],
    ...overrides,
  };
}

export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  userStatus: number;
}

export function buildUser(id: number, username: string, overrides: Partial<User> = {}): User {
  return {
    id,
    username,
    firstName: 'QA',
    lastName: 'Tester',
    email: 'qa@example.com',
    password: 'Passw0rd!',
    phone: '100200',
    userStatus: 1,
    ...overrides,
  };
}

export interface Order {
  id: number;
  petId: number;
  quantity: number;
  shipDate: string;
  status: 'placed' | 'approved' | 'delivered';
  complete: boolean;
}

export function buildOrder(id: number, petId: number, overrides: Partial<Order> = {}): Order {
  return {
    id,
    petId,
    quantity: 1,
    shipDate: '2026-06-13T10:00:00.000Z',
    status: 'placed',
    complete: false,
    ...overrides,
  };
}

// ---- Eventual-consistency retry helpers -----------------------------------

type GetOptions = { headers?: Record<string, string>; params?: Record<string, string | number> };

/** GET that retries until the response is 2xx (or attempts run out). */
export async function getUntilOk(
  request: APIRequestContext,
  url: string,
  options: GetOptions = {},
  tries = 6,
  delayMs = 1500,
): Promise<APIResponse> {
  let res = await request.get(url, options);
  for (let i = 1; i < tries && !res.ok(); i++) {
    await new Promise((r) => setTimeout(r, delayMs));
    res = await request.get(url, options);
  }
  return res;
}

/** GET that retries until it returns an exact status (e.g. 404 after a delete). */
export async function getUntilStatus(
  request: APIRequestContext,
  url: string,
  status: number,
  options: GetOptions = {},
  tries = 6,
  delayMs = 1500,
): Promise<APIResponse> {
  let res = await request.get(url, options);
  for (let i = 1; i < tries && res.status() !== status; i++) {
    await new Promise((r) => setTimeout(r, delayMs));
    res = await request.get(url, options);
  }
  return res;
}
