// Checks the Fera keys and Subbly order access.
// Prints one PASS or FAIL line per check and exits 1 when any check fails.
//
//   node fera-check.mjs

import { ENV, createFera, createSubbly, env } from './lib.mjs';

let failed = false;

async function check(label, run) {
  try {
    const detail = await run();
    console.log(`PASS ${label}${detail ? ` (${detail})` : ''}`);
  } catch (error) {
    failed = true;
    console.log(`FAIL ${label}: ${error.message}`);
  }
}

const publicKey = env(ENV.publicKey);
const secretKey = env(ENV.secretKey);
const subblyKey = env(ENV.subblyKey);
let store;

await check('Fera secret key', async () => {
  if (!secretKey) throw new Error(`${ENV.secretKey} is empty`);
  store = await createFera(secretKey)('GET', '/store');
  return [store?.name, store?.url].filter(Boolean).join(', ');
});

await check('Fera public key', async () => {
  if (!publicKey) throw new Error(`${ENV.publicKey} is empty`);
  if (!publicKey.startsWith('pk_')) throw new Error('it does not start with pk_');
  if (store?.public_key && store.public_key !== publicKey) {
    throw new Error('it belongs to a different Fera store than the secret key');
  }
  return null;
});

await check('Subbly order access', async () => {
  if (!subblyKey) throw new Error(`${ENV.subblyKey} is empty`);
  const res = await createSubbly(subblyKey)('GET', '/orders', { query: { per_page: 1 } });
  return `${res?.pagination?.total ?? 0} orders`;
});

process.exitCode = failed ? 1 : 0;
