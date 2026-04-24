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

Does not own:

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

### `@oda-agent/openclaw-plugin`

Owns:

- OpenClaw plugin manifest
- OpenClaw tool registration
- OpenClaw skill instructions
- tool grouping by risk level

## Tool risk levels

### Safe/read-only

- auth status
- search
- product details
- product images
- cart read
- order history
- lists
- slots

### Medium/cart mutation

- add items
- update quantity
- remove items
- apply list to cart
- reserve slot

### High/final order

- place order
- change submitted order
- add to existing order

High-risk tools are intentionally out of scope for v0.
