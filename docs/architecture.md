# Architecture — Oda Agent Kit

## Summary

This project uses one monorepo with multiple publishable npm packages.

The reusable Oda logic lives in `packages/core`.

Adapters live in separate packages:

- `packages/cli`
- `packages/mcp-server`
- `packages/openclaw-plugin`

## Dependency graph

```text
@oda-agent/core
        ↑
        ├── @oda-agent/cli
        ├── @oda-agent/mcp-server
        └── @oda-agent/openclaw-plugin
```

Adapter packages must not import each other:

```text
# Forbidden
@oda-agent/cli            → @oda-agent/mcp-server
@oda-agent/cli            → @oda-agent/openclaw-plugin
@oda-agent/mcp-server     → @oda-agent/cli
@oda-agent/mcp-server     → @oda-agent/openclaw-plugin
@oda-agent/openclaw-plugin → @oda-agent/cli
@oda-agent/openclaw-plugin → @oda-agent/mcp-server
```

## Package responsibilities

### `@oda-agent/core`

Owns:

- auth/session handling
- HTTP client
- CSRF handling
- typed Oda domain models
- product search
- order history
- cart read/write abstractions
- shopping lists
- delivery slots
- household preference analysis

Does **not** own:

- CLI output formatting
- MCP transport
- OpenClaw plugin registration

### `@oda-agent/cli`

Owns:

- human-readable commands
- JSON output mode
- local debugging
- smoke testing live APIs when explicitly enabled

### `@oda-agent/mcp-server`

Owns:

- MCP tools
- MCP resources
- MCP prompts
- JSON-RPC stdio server

All log output must go to **stderr**, not stdout.

### `@oda-agent/openclaw-plugin`

Owns:

- OpenClaw plugin manifest
- OpenClaw tool registration
- OpenClaw skill instructions
- tool grouping by risk level

## Tool risk levels

See [Safety Model](safety-model.md) and [Tool Contracts](tool-contracts.md) for full details on confirmation requirements and input/output shapes.

### Level 0 — Safe/read-only

No confirmation required.

- `oda_search_products`
- `oda_get_orders`
- `oda_get_cart`
- `oda_get_delivery_slots`
- `oda_get_shopping_lists`
- `oda_get_household_staples`

### Level 1 — Cart mutation

Requires standard confirmation.

- `oda_add_to_cart`
- `oda_update_quantity`
- `oda_remove_from_cart`
- `oda_apply_list_to_cart`

### Level 2 — Delivery mutation

Requires stronger confirmation.

- `oda_reserve_delivery_slot`
- `oda_change_delivery_slot`

### Level 3 — Final order (out of scope for v0)

- `oda_place_order`
- `oda_change_submitted_order`
- `oda_add_to_existing_order`

High-risk tools are intentionally out of scope for v0.
