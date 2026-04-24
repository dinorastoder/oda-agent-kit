# Architecture

## Overview

`oda-agent-kit` is an npm workspace monorepo. The dependency graph is:

```
@oda-agent/cli ──────────────┐
@oda-agent/mcp-server ────────┤──▶ @oda-agent/core ──▶ Oda API
@oda-agent/openclaw-plugin ──┘
```

`@oda-agent/core` is the only package that communicates with the Oda HTTP API. All other packages import and delegate to it.

## Package Details

### `@oda-agent/core`

Provides:
- `OdaClient` — authenticated HTTP client for the Oda REST API
- `OdaApiError` — typed error class
- All data types (`OdaProduct`, `OdaCart`, `OdaOrder`, `OdaDeliverySlot`, …)

### `@oda-agent/cli`

A `commander`-based terminal tool. Reads credentials from environment variables (via `dotenv`). Supports `--json` flag for machine-readable output.

### `@oda-agent/mcp-server`

Wraps `OdaClient` into MCP tools using `@modelcontextprotocol/sdk`. Runs as a stdio MCP server so it can be embedded in any MCP-compatible AI host.

### `@oda-agent/openclaw-plugin`

Higher-level orchestration: grocery planning, order-history analysis, cart preparation, and delivery-slot selection. Built on top of `@oda-agent/core`.

## Build System

All packages are compiled with `tsc`. Each has its own `tsconfig.json` that extends `../../tsconfig.base.json`. The workspace root orchestrates builds via `npm run build --workspaces`.
