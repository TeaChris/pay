import { loadEnv } from '../../src/config/env.js';
import { loadKeys } from '../../src/config/keys.js';
import { createApp } from '../../src/app.js';

// Ensure env is loaded
loadEnv();

let _app: ReturnType<typeof createApp> | undefined;
let _keysLoaded = false;

/**
 * Get a test Hono app instance.
 * Keys and env are initialized once.
 */
export async function getTestApp() {
  if (!_keysLoaded) {
    await loadKeys();
    _keysLoaded = true;
  }

  if (!_app) {
    _app = createApp();
  }

  return _app;
}

/**
 * Make a test request against the Hono app.
 * Returns the Response object.
 */
export async function testRequest(
  method: string,
  path: string,
  options?: {
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
    cookies?: string;
  },
) {
  const app = await getTestApp();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  if (options?.cookies) {
    headers['Cookie'] = options.cookies;
  }

  const requestInit: RequestInit = {
    method,
    headers,
  };

  if (options?.body) {
    requestInit.body = JSON.stringify(options.body);
  }

  return app.request(`http://localhost${path}`, requestInit);
}

/**
 * Extract Set-Cookie headers from a Response.
 */
export function extractCookies(res: Response): Map<string, string> {
  const cookies = new Map<string, string>();
  const setCookieHeaders = res.headers.getSetCookie();

  for (const header of setCookieHeaders) {
    const [nameValue] = header.split(';');
    if (nameValue) {
      const eqIndex = nameValue.indexOf('=');
      if (eqIndex > 0) {
        const name = nameValue.substring(0, eqIndex);
        const value = nameValue.substring(eqIndex + 1);
        cookies.set(name, value);
      }
    }
  }

  return cookies;
}

/**
 * Build a cookie string from a Map for sending in requests.
 */
export function buildCookieString(cookies: Map<string, string>): string {
  return Array.from(cookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}
