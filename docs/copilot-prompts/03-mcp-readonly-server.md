# Copilot task: Add MCP server read-only skeleton

## Goal

Create the MCP server package with read-only tools, resources, and prompts.

## Tools

Register these read-only tools:

- `oda_auth_status`
- `oda_search_products`
- `oda_get_product`
- `oda_get_product_image`
- `oda_get_cart`
- `oda_get_orders`
- `oda_get_order_details`
- `oda_get_shopping_lists`
- `oda_get_delivery_slots`

## Requirements

- Use `@modelcontextprotocol/sdk`.
- Use `@oda-agent/core`.
- For stdio transport, normal logs must go to stderr, not stdout.
- Do not implement cart mutation yet.

## Acceptance criteria

- MCP package builds.
- Tool registration tests exist.
- Server can start locally.
- No stdout logging except MCP protocol messages.
