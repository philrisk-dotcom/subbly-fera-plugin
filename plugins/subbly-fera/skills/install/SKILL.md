---
name: install
description: Set up Fera Reviews in this project. Use in the plugin's setup chat; when setup stopped part-way and must be resumed; when the Fera keys or the product sync need re-checking.
---

# Fera Reviews setup

Fera shows reviews on the storefront through Fera.js and sends review-request emails for the orders it is told about. This plugin tells Fera about each new customer's first order from the thank-you page of the Subbly Custom Checkout. Renewals never reach that page, so they never trigger a review request.

## 1. Confirm the Subbly Custom Checkout

This plugin works only with the Subbly Custom Checkout: a checkout page and thank-you page built in this project. Fera review requests are sent from the thank-you page, so a hosted checkout leaves the plugin nowhere to run.

Search the project for the checkout page and the thank-you page it shows after a successful order. Both must be pages in this project, and the thank-you page must have the Subbly order ID.

- Both found: note the thank-you page's file path and where it reads the order ID, then continue.
- Either missing: tell the user that Fera Reviews needs the Subbly Custom Checkout and will not work without it. Offer to build the custom checkout first, or to finish setup later from the plugin panel. Stop here: do not add keys, widgets or routes.

Done: you hold the thank-you page path and know where it reads the order ID.

## 2. Check the keys and connections

Run `node scripts/fera-check.mjs`. It checks both Fera keys and Subbly order access, and prints one PASS or FAIL line for each.

- A Fera key FAIL: tell the user to copy both keys from Fera (Configuration > Developers > API Keys) into the plugin's config fields, then wait and run the check again.
- A Subbly FAIL: report the line to the user and stop. The project's Subbly API key cannot read orders, and the order hand-off depends on it.

Done: every line is PASS.

## 3. Sync products to Fera

Fera needs each product before it can show reviews for it. Find the storefront's product page route and build the product URL template from it, with `{slug}` or `{id}` where the product's slug or ID goes, on the site's public domain (for example `https://shop.example.com/products/{slug}`). Ask the user for the domain if the project does not record it.

Run `node scripts/fera-sync-products.mjs --product-url "<template>" --dry-run` and show the user the counts. When they agree, run it again without `--dry-run`.

Done: the real run reports zero failures. Tell the user to run this step again (or ask you to) when they add or rename products.

## 4. Add Fera to the storefront

Load the `fera-storefront` skill. Follow its steps for the Fera.js loader, the product page widgets and the product structured data.

Done: in the preview, `fera.version` returns a version in the browser console, and a product page shows the star summary and the review list.

## 5. Send first orders to Fera

Still in `fera-storefront`, build the `/api/fera/order` route and add the call to it on the thank-you page you found in step 1.

Done: both edits are in place and the preview builds with no error.

## 6. Set the review-request timing in Fera

Orders reach Fera at checkout, before they ship. Ask the user how long a first order usually takes to arrive. Tell them to set the review-request delay in Fera's review-request settings to that time plus a few days, so the email comes after the box arrives.

Done: the user confirms the delay is set.

## 7. Test end to end

Place a test order through the custom checkout in the preview, using an email address the user controls. Confirm that the thank-you page's call to `/api/fera/order` returns `ok: true`, and that `GET /orders?external_id=<subbly order id>` on the Fera Private API returns the order (the `fera-api` skill has the details).

Ask the user to open the order in the Fera dashboard and check that a review request is scheduled. If Fera shows the order as waiting for fulfilment, change the route to send `fulfilled_at` as the order's creation time, so the Fera delay from step 6 counts from checkout. Then ask the user to delete the test order in Fera.

Done: the test order is in Fera with a review request scheduled, and the user has removed it.

## Reference

| Env var | From field | Used by |
| --- | --- | --- |
| `NEXT_PUBLIC_PLUGIN_SUBBLY_FERA__STORE_PK` | Fera public API key | Fera.js in the browser. Safe to expose. |
| `PLUGIN_SUBBLY_FERA__SECRET_KEY` | Fera secret API key (secret) | Server code and scripts only. |
| `SUBBLY_API_KEY` | Builder default | Server code and scripts, to read Subbly orders and products. |

The secret key gives full access to the store's Fera data, including customer details. Keep it in server code. It never goes in client code, the chat, or a commit.

A saved config change reaches a running preview only at the next sync.
