// Creates or updates a Fera product for each published Subbly product, keyed by the Subbly
// product ID as Fera's external_id. Gift cards are skipped. Unchanged products are left alone.
// Prints a JSON summary and exits 1 when any product failed.
//
//   node fera-sync-products.mjs --product-url "https://shop.example.com/products/{slug}" [--dry-run]
//
// --product-url  Storefront product page URL, with {slug} or {id} where the product's slug or ID goes.
// --dry-run      Report what would change without writing to Fera.

import { ENV, createFera, createSubbly, env } from './lib.mjs';

function parseArgs(argv) {
  const args = { dryRun: false, productUrl: '' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--product-url') args.productUrl = argv[++i] ?? '';
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  if (!/^https:\/\/.+\{(slug|id)\}/.test(args.productUrl)) {
    throw new Error('--product-url must be an https URL containing {slug} or {id}');
  }
  return args;
}

async function* subblyProducts(subbly) {
  for (let page = 1; ; page++) {
    const res = await subbly('GET', '/products', { query: { page, per_page: 100 } });
    const rows = res?.data ?? [];
    yield* rows;
    if (!rows.length || page >= (res?.pagination?.last_page ?? page)) return;
  }
}

async function feraProductsByExternalId(fera) {
  const byExternalId = new Map();
  for (let page = 1; ; page++) {
    const res = await fera('GET', '/products', { query: { page, page_size: 100 } });
    for (const product of res?.data ?? []) {
      if (product.external_id) byExternalId.set(String(product.external_id), product);
    }
    if (page >= (res?.meta?.page_count ?? 0)) return byExternalId;
  }
}

// Subbly product -> the Fera product fields this plugin owns.
function toFera(product, productUrl) {
  return {
    external_id: String(product.id),
    name: product.name,
    handle: product.slug ?? undefined,
    url: productUrl.replace('{slug}', product.slug ?? '').replace('{id}', String(product.id)),
    thumbnail_url: product.images?.[0]?.url ?? undefined,
  };
}

function changedFields(existing, wanted) {
  return Object.fromEntries(
    Object.entries(wanted).filter(([key, value]) => key !== 'external_id' && value !== undefined && existing[key] !== value),
  );
}

const args = parseArgs(process.argv.slice(2));
const secretKey = env(ENV.secretKey);
const subblyKey = env(ENV.subblyKey);
if (!secretKey || !subblyKey) throw new Error(`${ENV.secretKey} and ${ENV.subblyKey} must both be set`);

const fera = createFera(secretKey);
const subbly = createSubbly(subblyKey);
const existing = await feraProductsByExternalId(fera);
const summary = { dryRun: args.dryRun, created: 0, updated: 0, unchanged: 0, skipped: 0, failed: [] };

for await (const product of subblyProducts(subbly)) {
  if (!product.published || product.gift_card) {
    summary.skipped++;
    continue;
  }
  const wanted = toFera(product, args.productUrl);
  const current = existing.get(wanted.external_id);
  try {
    if (!current) {
      if (!args.dryRun) await fera('POST', '/products', { body: { data: wanted } });
      summary.created++;
      continue;
    }
    const changes = changedFields(current, wanted);
    if (!Object.keys(changes).length) {
      summary.unchanged++;
      continue;
    }
    if (!args.dryRun) await fera('PUT', `/products/${current.id}`, { body: changes });
    summary.updated++;
  } catch (error) {
    summary.failed.push({ subblyProductId: product.id, name: product.name, error: error.message });
  }
}

console.log(JSON.stringify(summary, null, 2));
process.exitCode = summary.failed.length ? 1 : 0;
