---
name: fera-api
description: Fera Private API reference for reading and managing reviews, products, orders, customers and webhooks. Use when the user asks about their Fera reviews or ratings (lists, counts, low ratings, pending moderation); when a product or order must be looked up, created or fixed in Fera; when setting up a Fera webhook.
---

# Fera Private API

Call the API from server code or with `execute_command`, reading the key from `PLUGIN_SUBBLY_FERA__SECRET_KEY` in the environment. The key gives full access to the store's Fera data, including customer details, so it stays out of client code, the chat and every commit.

Answer questions from live data: fetch every page you need, then summarise. Before a call that changes or deletes Fera data, tell the user what it will change and wait for their yes.

## Reference

### Requests

- Base URL `https://api.fera.ai/v3/private`. Auth header `SECRET-KEY: <key>`.
- Create (`POST`) bodies wrap the fields in a `data` envelope: `{ "data": { ... } }`. Update (`PUT /<resource>/<id>`) bodies send the changed fields at the root, with no envelope.
- List responses are `{ data: [...], meta: {...} }`. Page with `page` and `page_size` (default 10, maximum 100) and read `meta.page_count`, or use `limit` and `offset`. Sort with `sort_by=<field>:asc|desc`.
- Create returns 201 with the record. Delete returns 204 with no body.
- Fera IDs carry a prefix: `fRev_` review, `fpro_` product, `fcus_` customer, `fweb_` webhook, `fsto_` store.
- Each endpoint's full spec is markdown at `https://developers.fera.ai/reference/<page>.md`, with page names such as `list-reviews`, `create-order`, `update-product` and `create-webhook`. Read it before you call an endpoint this file does not list.

### Resources

- `GET /store`: the store's Fera settings.
- `GET /reviews`: filter with `product.id`, `product.ids`, `customer_id`, `customer.external_id`, `customer.email`, `order.id`, `subject`, `verified`, `state` (for example `pending`), `search` and `sort_by`.
- `GET /products`, `GET /products/<id>`, `POST /products`, `PUT /products/<id>`: `<id>` takes the Fera ID or the external ID. In this project the external ID is the Subbly parent product ID. Filter lists with `external_id`, `external_ids` or `search`.
- `GET /orders`, `GET /orders/<id>`, `POST /orders`: the external ID is the Subbly order ID. Filter with `external_id`, `external_ids`, `customer_id` or `customer.external_id`.
- `GET /customers`, `POST /customers`: the external ID is the Subbly customer ID.
- `GET /webhooks`, `POST /webhooks` with `{ "data": { "event_name": "<event>", "url": "<https url>" } }`.

### Webhooks

- Events: `review_create`, `review_update`, `review_delete`, `review_approve`, `review_decline`, `media_create`, `media_update`, `media_delete`, `media_approve`, `media_decline`, `customer_create`, `customer_update`, `customer_delete`.
- Fera POSTs the changed record as JSON and adds a `jwt` query parameter. Verify that JWT with HS256 and the secret key before trusting the body, and reject it once its `exp` has passed. Its claims are `webhook_id`, `event_name`, `store_id`, `store_domain` and `store_public_key`.
- Fera expires the JWT after an hour, so a route that queues the work must verify it on receipt.
