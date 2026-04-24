# Tool Contracts

## Read-only tools

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

## Mutation tools

Mutation tools must return proposed or executed deltas.

They must be designed so that the agent can show a clear confirmation message before execution.
