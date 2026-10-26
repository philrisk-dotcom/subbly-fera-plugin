// Shared HTTP helpers for the Fera Reviews scripts. No dependencies: Node 18+ fetch only.

export const FERA_URL = 'https://api.fera.ai/v3/private';
export const SUBBLY_URL = 'https://api.subbly.co/private/v1';

export const ENV = {
  publicKey: 'NEXT_PUBLIC_PLUGIN_SUBBLY_FERA__STORE_PK',
  secretKey: 'PLUGIN_SUBBLY_FERA__SECRET_KEY',
  subblyKey: 'SUBBLY_API_KEY',
};

export const env = (name) => process.env[name]?.trim() ?? '';

export class HttpError extends Error {
  constructor(service, status, body, what) {
    const detail = typeof body === 'string' ? body : JSON.stringify(body);
    super(`${service} ${what} returned ${status}${detail ? `: ${detail.slice(0, 300)}` : ''}`);
    this.status = status;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function client(service, baseUrl, headers) {
  return async function request(method, path, { query, body } = {}) {
    const url = new URL(baseUrl + path);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value == null) continue;
      for (const v of [].concat(value)) url.searchParams.append(key, String(v));
    }
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, {
        method,
        headers: {
          ...headers,
          Accept: 'application/json',
          ...(body !== undefined && { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      // Back off on rate limits: honour Retry-After, else 1s, 2s, 4s, 8s.
      if (res.status === 429 && attempt < 4) {
        const retryAfter = Number(res.headers.get('retry-after'));
        await sleep(retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt);
        continue;
      }
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = text;
      }
      if (!res.ok) throw new HttpError(service, res.status, json, `${method} ${url.pathname}`);
      return json;
    }
  };
}

export const createFera = (secretKey) => client('Fera', FERA_URL, { 'SECRET-KEY': secretKey });
export const createSubbly = (apiKey) => client('Subbly', SUBBLY_URL, { 'X-API-KEY': apiKey });
