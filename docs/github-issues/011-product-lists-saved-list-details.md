# Support live Oda product lists and saved-list details

Labels: copilot, core, mcp-server, openclaw

## Goal

Replace the unused `/shopping-lists/` implementation with the live Oda web API endpoints observed in April 2026, and expose list detail retrieval in a way that works across core, CLI, MCP, and OpenClaw.

## Problem

Current code still assumes saved lists live behind `/shopping-lists/`:

- `packages/core/src/client.ts` calls `GET /shopping-lists/`
- CLI, MCP, and OpenClaw all inherit that core behavior
- OpenClaw currently tolerates `404` errors for shopping lists, which avoids crashing but also means real saved lists can silently disappear from the account review

The attached HAR from a real Oda session shows a different live flow:

- `GET /api/v1/product-lists/?filter=product_lists&sort=default&size=50&page=1`
- `GET /api/v1/product-lists/430128/`
- `GET /api/v1/product-lists/430128/suggestions/`

Observed response shape:

- list overview payload uses `results[]` with fields like `id`, `title`, `url`, `totalQuantity`, `numberOfProducts`, `productIds`
- list detail payload uses `id`, `title`, `items[]`, and each item contains full `product` data plus `quantity`
- suggestions payload is separate and appears to support the detail page, but it is not required to restore current saved-list functionality

## Scope

- Add normalized models and Zod schemas for product-list overview and product-list detail payloads
- Add core client support for the live product-list endpoints
- Remove the old `/shopping-lists/` path instead of preserving compatibility with it
- Update adapter packages to use the new core behavior without moving business logic out of `packages/core`
- Add sanitized fixtures from the captured responses and cover the new path with tests
- Update tool contracts if a new detail-oriented tool/API is introduced

## Proposed implementation

Implement this in `packages/core` first.

Recommended shape:

- Add `getProductLists(page?: number, size?: number)` for overview data
- Add `getProductList(listId: number)` for full list details
- Optionally add `getProductListSuggestions(listId: number, limit?: number, offset?: number)` for future use

Replacement rule:

- Do not preserve the old `/shopping-lists/` implementation
- Rename or replace `getShoppingLists()` as needed so the public API matches the live product-list model
- If overview responses do not contain full items, fetch detail only in the code paths that truly require `items[]`

Adapter expectations:

- OpenClaw account review only needs lightweight saved-list summaries for most views
- MCP `oda_get_shopping_lists` currently promises full `items[]`; preserve that contract or update `docs/tool-contracts.md` in the same change
- CLI should remain usable for inspecting saved lists from a real account

## Acceptance criteria

- [ ] Saved lists use `/product-lists/` as the primary and only supported implementation path
- [ ] `packages/core/src/client.ts` no longer calls `GET /shopping-lists/`
- [ ] Product-list overview `title` is normalized to the saved-list `name` field
- [ ] Product-list detail `items[].product` plus `quantity` normalize to the existing saved-list item shape or to a deliberate replacement type
- [ ] CLI, MCP, and OpenClaw all continue to work against the shared core implementation
- [ ] Fixtures are sanitized and checked in without cookies, CSRF tokens, session IDs, share tokens, addresses, or other personal data
- [ ] Tests cover the live product-list path and removal of the old shopping-list path

## Non-goals

- Do not add product-list mutation support in this issue
- Do not add recurring-order logic in this issue
- Do not commit raw HAR files with live credentials or personal account data

## Notes from the captured traffic

Relevant calls for this feature:

- `GET /api/v1/product-lists/?filter=product_lists&sort=default&size=50&page=1`
- `GET /api/v1/product-lists/:id/`
- `GET /api/v1/product-lists/:id/suggestions/`

Calls observed on the same page load but not required to restore saved-list support:

- `GET /api/v1/slot-picker/slots/?num-days=3`
- `GET /api/v1/cart/?group-by=recipes`
- `GET /api/v1/search/mixed/?q=&type=product`

## Implementation cautions

- Avoid baking in a high-cost N+1 detail fetch if a caller only needs list names and counts
- Keep adapter packages thin; normalization belongs in `packages/core`
- Use fixture-first tests, not live account calls