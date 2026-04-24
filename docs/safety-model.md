# Safety Model

## Principles

1. Read-only first.
2. Plan before mutation.
3. Mutate only after explicit confirmation.
4. Never place final orders in v0.
5. Do not store secrets in git.
6. Do not log cookies, tokens, or user personal data.

## Confirmation levels

### Level 0 — Read-only

Allowed without confirmation:

- product search
- order history read
- cart read
- list read
- delivery slot read
- product image read

### Level 1 — Cart mutation

Requires confirmation:

- add item
- remove item
- change quantity
- apply saved list to cart

The confirmation message must show:

- product name
- quantity
- price if available
- whether it came from history/list/search
- expected cart delta

### Level 2 — Delivery mutation

Requires stronger confirmation:

- reserve delivery slot
- change delivery slot

The confirmation message must show:

- date
- time window
- fee if available
- expiry/reservation behavior if known

### Level 3 — Final order

Out of scope for v0.

Do not implement `placeOrder` in v0.
