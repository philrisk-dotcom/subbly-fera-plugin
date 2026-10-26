# subbly-fera-plugin

Subbly marketplace repo for the **Fera Reviews** plugin.

It adds Fera star ratings and review widgets to the storefront and sends each new customer's first order to Fera, so Fera emails a review request. Renewals never reach the thank-you page, so they never trigger one. **It requires the Subbly Custom Checkout**: setup stops at step 1 when the project has no custom checkout and thank-you page.

## Layout

- `marketplace.json` lists the plugin by slug. The `version` bump is the only release trigger.
- `plugins/subbly-fera/plugin.json` is the manifest: display name, the two key fields, `setup: true`.
- `plugins/subbly-fera/skills/install/` is the setup chat: checkout check, key check, product sync, storefront, first-order hand-off, end-to-end test.
- `plugins/subbly-fera/skills/fera-storefront/` covers the Fera.js loader, widgets, rating structured data, the `/api/fera/order` route and the thank-you page call.
- `plugins/subbly-fera/skills/fera-api/` is the Fera Private API reference for ad-hoc review questions.
- `plugins/subbly-fera/co.subbly.builder/scripts/` holds `fera-check.mjs` (keys and Subbly access) and `fera-sync-products.mjs` (Subbly products to Fera). They have no dependencies, so there is no `package.json` or lockfile.

## Develop

```bash
npm install
npm run lint
```

`npm run lint` is the release gate. Zero errors means the marketplace passes.
`npx subbly-plugin-lint --strict` runs the same rules and fails on warnings too.

## Release

Bump `version` in `marketplace.json` and merge to `main`.

## Config fields

| Field | Env var | Notes |
| --- | --- | --- |
| Fera public API key | `NEXT_PUBLIC_PLUGIN_SUBBLY_FERA__STORE_PK` | Public. Loads Fera.js in the browser. |
| Fera secret API key | `PLUGIN_SUBBLY_FERA__SECRET_KEY` | Secret. Server code and scripts only. |

The scripts and the order route also use the builder default `SUBBLY_API_KEY` to read Subbly orders and products.
