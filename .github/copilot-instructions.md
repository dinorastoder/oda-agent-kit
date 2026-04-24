# GitHub Copilot Instructions

This is the `oda-agent-kit` TypeScript monorepo. Follow the guidelines in [AGENTS.md](../AGENTS.md) at all times.

## Key Points for Copilot

- Language: **TypeScript** with strict mode enabled.
- Package manager: **npm workspaces** (never use yarn or pnpm).
- Build: each package has its own `tsc` invocation; the root `npm run build` runs all.
- Testing: use **Jest** with `ts-jest` in each package.
- Node.js ≥ 18 required.

## Scope of Each Package

| Package | Responsibility |
|---------|---------------|
| `@oda-agent/core` | HTTP client for the Oda API, data types, session management |
| `@oda-agent/cli` | `commander`-based CLI; delegates all API calls to `@oda-agent/core` |
| `@oda-agent/mcp-server` | MCP server using `@modelcontextprotocol/sdk`; wraps `@oda-agent/core` tools |
| `@oda-agent/openclaw-plugin` | OpenClaw plugin factory; uses `@oda-agent/core` for data |

## Don'ts

- Do **not** make HTTP calls outside of `@oda-agent/core`.
- Do **not** commit `.env` files.
- Do **not** add `console.log` debug statements to production code.
- Do **not** use `any` types; use `unknown` and narrow when necessary.
