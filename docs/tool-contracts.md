# Tool Contracts

Tools are grouped by risk level (see [Safety Model](safety-model.md)).

---

## Read-only tools (Level 0)

These tools never modify state and require no confirmation.

### `oda_search_products`

Input:

```json
{
  "query": "milk",
  "limit": 10
}
```

Output:

```json
{
  "products": [
    {
      "id": "string",
      "name": "string",
      "brand": "string | null",
      "price": {
        "amount": 0,
        "currency": "NOK"
      },
      "availability": "available | unavailable | unknown",
      "images": [
        {
          "url": "string",
          "kind": "thumbnail | large | unknown"
        }
      ]
    }
  ]
}
```

### `oda_get_orders`

Input:

```json
{
  "limit": 10
}
```

Output:

```json
{
  "orders": [
    {
      "id": "string",
      "createdAt": "ISO datetime",
      "deliveredAt": "ISO datetime | null",
      "total": {
        "amount": 0,
        "currency": "NOK"
      }
    }
  ]
}
```

### `oda_get_cart`

Input:

```json
{}
```

Output:

```json
{
  "id": 123,
  "items": [
    {
      "id": 456,
      "product": {
        "id": 789,
        "full_name": "string",
        "name": "string",
        "brand": "string | null",
        "gross_price": "string",
        "currency": "NOK",
        "is_available": true
      },
      "quantity": 2,
      "line_price": "string"
    }
  ],
  "total_price": "string",
  "currency": "NOK",
  "item_count": 2
}
```

### `oda_get_delivery_slots`

Input:

```json
{}
```

Output:

```json
{
  "slots": [
    {
      "id": 123,
      "start": "ISO datetime",
      "end": "ISO datetime",
      "price": "string",
      "currency": "NOK",
      "is_available": true
    }
  ]
}
```

### `oda_get_shopping_lists`

Input:

```json
{}
```

Output:

```json
[
  {
    "id": 123,
    "name": "string",
    "items": [
      {
        "product": {
          "id": 789,
          "full_name": "string",
          "name": "string",
          "brand": "string | null",
          "gross_price": "string",
          "currency": "NOK",
          "is_available": true
        },
        "quantity": 1
      }
    ]
  }
]
```

### `oda_get_household_staples`

Input:

```json
{
  "lookbackOrders": 20
}
```

Output:

```json
{
  "staples": [
    {
      "productId": "string",
      "name": "string",
      "averageQuantity": 1,
      "frequency": "weekly | biweekly | monthly | occasional",
      "confidence": 0.8,
      "reason": "Bought in 8 of last 10 orders"
    }
  ]
}
```

---

## Mutation tools (Level 1 — cart)

> **Note:** These tool names describe the planned v1 MCP server interface.  The current MCP server (`@oda-agent/mcp-server`) is **read-only** and does not yet expose mutation tools.  Equivalent functionality is available today via the OpenClaw plugin (`addToCart`, `removeFromCart`, `prepareCart`).

Mutation tools require explicit user confirmation before execution.

Each response includes a `proposed` delta so the agent can show a clear confirmation message.

Allowed `status` values: `proposed`, `committed`.

### `oda_add_to_cart`

Input:

```json
{
  "productId": "string",
  "quantity": 2
}
```

Output (proposed — not yet committed):

```json
{
  "status": "proposed",
  "item": {
    "productId": "string",
    "name": "string",
    "quantity": 2,
    "unitPrice": {
      "amount": 0,
      "currency": "NOK"
    }
  },
  "cartDelta": {
    "itemsAdded": 1,
    "newTotal": {
      "amount": 0,
      "currency": "NOK"
    }
  }
}
```

### `oda_remove_from_cart`

Input:

```json
{
  "productId": "string"
}
```

Output:

```json
{
  "status": "proposed",
  "removedItem": {
    "productId": "string",
    "name": "string",
    "quantity": 2
  },
  "cartDelta": {
    "itemsRemoved": 1,
    "newTotal": {
      "amount": 0,
      "currency": "NOK"
    }
  }
}
```

### `oda_update_quantity`

Input:

```json
{
  "productId": "string",
  "quantity": 3
}
```

Output:

```json
{
  "status": "proposed",
  "item": {
    "productId": "string",
    "name": "string",
    "previousQuantity": 1,
    "newQuantity": 3
  },
  "cartDelta": {
    "newTotal": {
      "amount": 0,
      "currency": "NOK"
    }
  }
}
```

### `oda_apply_list_to_cart`

Input:

```json
{
  "listId": "string"
}
```

Output:

```json
{
  "status": "proposed",
  "listName": "string",
  "itemsAdded": [
    {
      "productId": "string",
      "name": "string",
      "quantity": 1
    }
  ],
  "cartDelta": {
    "itemsAdded": 5,
    "newTotal": {
      "amount": 0,
      "currency": "NOK"
    }
  }
}
```

---

## Mutation tools (Level 2 — delivery slot)

> **Note:** These tools are **planned for v1** and are not yet implemented in any adapter.

These tools require stronger confirmation.  The confirmation message must include the date, time window, fee, and any reservation expiry information.

Allowed `status` values: `proposed`, `committed`.

### `oda_reserve_delivery_slot`

Input:

```json
{
  "slotId": "string"
}
```

Output:

```json
{
  "status": "proposed",
  "slot": {
    "id": "string",
    "date": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "fee": {
      "amount": 0,
      "currency": "NOK"
    },
    "reservationExpiresAt": "ISO datetime | null"
  }
}
```

### `oda_change_delivery_slot`

Input:

```json
{
  "slotId": "string"
}
```

Output:

```json
{
  "status": "proposed",
  "previousSlot": {
    "id": "string",
    "date": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM"
  },
  "newSlot": {
    "id": "string",
    "date": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "fee": {
      "amount": 0,
      "currency": "NOK"
    }
  }
}
```

---

## High-risk tools (Level 3 — final order)

These tools are **out of scope for v0** and must not be implemented.

| Tool | Reason |
|------|--------|
| `oda_place_order` | Final order placement — v1+ only |
| `oda_change_submitted_order` | Modifies a confirmed order — v1+ only |
| `oda_add_to_existing_order` | Appends to a confirmed order — v1+ only |
