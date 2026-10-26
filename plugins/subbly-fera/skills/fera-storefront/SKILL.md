---
name: fera-storefront
description: Fera reviews on the storefront, covering the Fera.js loader, review widgets and star ratings, product rating structured data, and the first-order hand-off from the thank-you page. Use when building or changing the checkout or thank-you page; when adding, moving or restyling review widgets or stars; when reviews or ratings do not show; when first orders stop reaching Fera.
---

# Fera on the storefront

Work in the storefront's own framework and component conventions. Adapt the contracts in the Reference section rather than pasting them. The product ID Fera knows is the Subbly parent product ID, the same `external_id` that `scripts/fera-sync-products.mjs` writes.

## 1. Load Fera.js

Render the loader from the root layout so it is on every page, and only when `NEXT_PUBLIC_PLUGIN_SUBBLY_FERA__STORE_PK` is set. It must run the configure call before Fera.js loads:

```html
<script>window.fera = window.fera || []; window.fera.push("configure", { store_pk: "<public key>" });</script>
<script src="https://cdn.fera.ai/js/fera.js" async></script>
```

Done: `fera.version` returns a version in the preview's browser console.

## 2. Product pages and product cards

On each product page, push the current product with `fera.push('setProduct', …)` from a client component, and render the star summary near the title and the review list below the product details. On product cards in listings, render the star summary. The Widget contract has the markup and fields.

Then navigate between two product pages with client-side links, not a full reload. Confirm the stars and the review list change to the new product. If they keep showing the first product, give the widget containers a React `key` of the product ID so they remount, and check again. If they still do not change, tell the user.

Done: two product pages show their own stars and reviews after client-side navigation.

## 3. Rating structured data

Add `aggregateRating` to each product page's `Product` JSON-LD, following the Structured data contract. Create the JSON-LD if the page has none.

Done: a product with reviews has `aggregateRating` in its rendered HTML, and a product with none renders without it.

## 4. First-order hand-off

Build the `/api/fera/order` route to the Route contract, then add the Thank-you page contract to the thank-you page of the custom checkout.

Done: a test order through the custom checkout reaches Fera, and reloading the thank-you page creates no second Fera order.

## Reference

### Widget contract

- Star summary: `<div data-fera-container="product_reviews_summary" data-product-id="<subbly product id>"></div>`. It works on product cards too.
- Review list: `<div data-fera-container="product_reviews" data-product-id="<subbly product id>"></div>`.
- Store-wide review list (an all-reviews page): `<div data-fera-container="all_reviews"></div>`.
- Customer photo and video gallery: `<div data-fera-container="store_customer_media"></div>`.
- `setProduct` fields: `id` (the Subbly parent product ID as a string), `name`, `url`, `thumbnail_url`, and optional `price` in major units. Push it only on product pages.
- Fera styles its widgets from the Fera dashboard. Change colours and layout there before overriding Fera's CSS.
- A "write a review" link is the product URL with `?fera=review` added (`&fera=review` when the URL already has a query).

### Structured data contract

- Fetch the rating server-side with `GET https://api.fera.ai/v3/private/products/<subbly product id>` and the `SECRET-KEY` header set to `PLUGIN_SUBBLY_FERA__SECRET_KEY`. The ID path takes the external ID. Cache the result for an hour.
- Read the average and review count from the product's `rating` and `counts` fields. Log one real response the first time to confirm their shape.
- Emit `aggregateRating` with `ratingValue` and `reviewCount` only when the count is above zero. On a 404 or any error, render the page without it.

### Route contract

`POST /api/fera/order` with JSON `{ orderId }`. Server-only. It reads `PLUGIN_SUBBLY_FERA__SECRET_KEY` and `SUBBLY_API_KEY`.

1. Respond 500 when either key is unset, and 400 when `orderId` is not a positive integer.
2. Read the order from Subbly: `GET https://api.subbly.co/private/v1/orders/<orderId>?expand[]=customer&expand[]=items.product.parent` with the `X-API-KEY` header. The Private API returns snake_case fields. Respond 404 when Subbly has no such order.
3. Skip, responding `{ ok: true, skipped: "<reason>" }`, when the order is unpaid, archived, cancelled or `payment_failed`, or was created more than 24 hours ago. Order IDs are sequential and guessable, so the age limit stops anyone sending old orders through the route.
4. Skip renewals: when the order has a `subscription_id` and `GET /orders?subscription_id=<id>&per_page=1` reports a `pagination.total` above 1, it is not the first order.
5. Make the route idempotent: `GET https://api.fera.ai/v3/private/orders?external_id=<orderId>`. When it returns an order, respond `{ ok: true, existing: true }`.
6. Collect the reviewable products: each item's `product.parent` (or the item's product when it has no parent), deduplicated by ID. Skip items with no product. For each, `GET /products/<subbly product id>` on Fera. On a 404, create it with `POST /products` and the same fields `scripts/fera-sync-products.mjs` sends. Keep the Fera `id` of each.
7. Create the Fera order with `POST /orders` and the body below. Respond `{ ok: true }`. On a Fera or Subbly error, log the status and body and respond 502.

The Fera order body. Create bodies take a `data` envelope. Money is in major units, and Subbly sends minor units, so divide by 100.

```json
{ "data": {
  "external_id": "<order id>", "number": <order id>, "total": <total / 100>,
  "customer_email": "<customer.email>", "customer_name": "<first_name last_name>",
  "customer": { "external_id": "<customer_id>", "name": "<first_name last_name>", "email": "<customer.email>" },
  "line_items": [{ "product_id": "<fera product id>", "name": "<product name>", "quantity": <quantity>, "total": <amount / 100> }],
  "paid_at": "<created_at>", "external_created_at": "<created_at>", "is_test": <order.test>
} }
```

### Thank-you page contract

- On mount, once per order ID, send `POST /api/fera/order` with `{ orderId }` and `keepalive: true`. Store `subbly-fera:sent:<orderId>` in `sessionStorage` after sending, and skip the call when it is already there.
- The call is fire-and-forget. The page never waits for it, and never shows its result or errors to the customer.

### When first orders stop reaching Fera

Run `node scripts/fera-check.mjs` for the keys, then read the route's server logs for the Subbly or Fera status it logged. A `skipped` or `existing` response is expected for page reloads, renewals and orders older than 24 hours.
