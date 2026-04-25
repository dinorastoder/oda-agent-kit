# Oda Agent Kit

A TypeScript npm-workspace monorepo for safe Oda grocery automation.

The project is organized around reusable domain logic in `packages/core`, with thin adapters for CLI, MCP, and OpenClaw.

## Packages

### `@oda-agent/core`

Shared Oda client interfaces, domain models, and core logic.

All Oda business logic belongs here.  Adapter packages depend on this package and must not contain domain logic themselves.

```ts
import { OdaClient } from "@oda-agent/core";

const client = new OdaClient({ credentials: { email, password } });
const products = await client.searchProducts("milk");
```

### `@oda-agent/cli`

Terminal commands for local debugging and manual workflows.

```bash
npm install -g @oda-agent/cli

oda search "milk"
oda cart get
oda orders list --page 1
oda slots list
```

### `@oda-agent/mcp-server`

MCP stdio server exposing tool-style operations for model clients (e.g. Claude Desktop, Cursor).

```bash
# In your MCP client config, point to:
node node_modules/@oda-agent/mcp-server/dist/main.js
```

Exposes read-only tools.  See [Tool Contracts](docs/tool-contracts.md) for the full list.

### `@oda-agent/openclaw-plugin`

OpenClaw plugin and skill registration for agentic grocery workflows.

```ts
import odaPlugin from "@oda-agent/openclaw-plugin";

openclaw.registerPlugin(odaPlugin);
```

## Safety model

Tools are grouped into four risk levels:

| Level | Category | Confirmation |
|-------|----------|--------------|
| 0 | Read-only | None |
| 1 | Cart mutation | Standard |
| 2 | Delivery mutation | Stronger |
| 3 | Final order | Out of scope for v0 |

Key rules:

- Read-only tools are safe by default and need no confirmation.
- Cart mutations require the agent to display the proposed delta before executing.
- Delivery mutations require a stronger, explicit confirmation.
- No final order placement in v0.
- Credentials are never stored in git.

See [`docs/safety-model.md`](docs/safety-model.md) and [`docs/tool-contracts.md`](docs/tool-contracts.md) for the full specification.

## Development

Prerequisites:

- Node.js >= 18
- npm workspaces

Install and validate:

```bash
npm install
npm run build
npm test
npm run lint
```

## Repo layout

```text
packages/
  core/              # domain logic and Oda client
  cli/               # terminal adapter
  mcp-server/        # MCP stdio adapter
  openclaw-plugin/   # OpenClaw adapter
docs/
  architecture.md    # package structure and dependency rules
  safety-model.md    # risk levels and confirmation requirements
  tool-contracts.md  # tool input/output shapes
scripts/
```

## Planning artifacts

The repository includes optional Copilot planning artifacts in:

- `docs/copilot-prompts/`
- `docs/github-issues/`

They can be used to manage iterative implementation work, but they are not required for normal development.
