# Safety Model

## Principles

1. Read-only first.
2. Plan before mutation.
3. Mutate only after explicit confirmation.
4. Never place final orders in v0.
5. Do not store secrets in git.
6. Do not log cookies, tokens, or user personal data.

## Risk level quick reference

| Level | Category | Tools | Confirmation required |
|-------|----------|-------|-----------------------|
| 0 | Read-only | `oda_search_products`, `oda_get_orders`, `oda_get_cart`, `oda_get_delivery_slots`, `oda_get_shopping_lists`, `oda_get_household_staples` | None |
| 1 | Cart mutation | `oda_add_to_cart`, `oda_remove_from_cart`, `oda_update_quantity`, `oda_apply_list_to_cart` | Standard — show product name, quantity, price, cart delta |
| 2 | Delivery mutation | `oda_reserve_delivery_slot`, `oda_change_delivery_slot` | Stronger — show date, time window, fee, reservation behaviour |
| 3 | Final order | `oda_place_order` (and variants) | Out of scope for v0 — do not implement |

## Confirmation levels

### Level 0 — Read-only

Allowed without confirmation.

Tools:

| Tool | Description |
|------|-------------|
| `oda_search_products` | Search the Oda product catalogue |
| `oda_get_orders` | Fetch past order history |
| `oda_get_cart` | Read the current cart contents |
| `oda_get_delivery_slots` | List available delivery slots |
| `oda_get_shopping_lists` | Read saved shopping lists |
| `oda_get_household_staples` | Derive frequently-bought items from order history |

### Level 1 — Cart mutation

Requires confirmation before executing.

Tools:

| Tool | Description |
|------|-------------|
| `oda_add_to_cart` | Add a product to the cart |
| `oda_remove_from_cart` | Remove a product from the cart |
| `oda_update_quantity` | Change the quantity of an existing cart item |
| `oda_apply_list_to_cart` | Bulk-add items from a saved list to the cart |

The confirmation message must show:

- product name
- quantity
- price if available
- whether it came from history/list/search
- expected cart delta

### Level 2 — Delivery mutation

Requires stronger confirmation before executing.

Tools:

| Tool | Description |
|------|-------------|
| `oda_reserve_delivery_slot` | Reserve a specific delivery slot |
| `oda_change_delivery_slot` | Change an already-reserved slot |

The confirmation message must show:

- date
- time window
- fee if available
- expiry/reservation behaviour if known

### Level 3 — Final order

Out of scope for v0.

Do not implement `oda_place_order` in v0.

The following tools must **not** be added until a deliberate v1 decision is made:

- `oda_place_order`
- `oda_change_submitted_order`
- `oda_add_to_existing_order`
