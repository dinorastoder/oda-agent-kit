# Oda Agent Kit

A TypeScript npm-workspace monorepo for safe Oda grocery automation.

The project is organized around reusable domain logic in `packages/core`, with thin adapters for CLI, MCP, and OpenClaw.

## Packages

- `@oda-agent/core`: shared Oda client interfaces, domain models, and core logic
- `@oda-agent/cli`: terminal commands for local debugging and manual workflows
- `@oda-agent/mcp-server`: MCP stdio server exposing tool-style operations
- `@oda-agent/openclaw-plugin`: OpenClaw plugin integration layer

## Safety model

- Read-only first.
- Plan before mutation.
- Explicit confirmation before cart mutation.
- Stronger confirmation for delivery-slot changes.
- No final order placement in v0.

See `docs/safety-model.md` and `docs/tool-contracts.md` for details.

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
  core/
  cli/
  mcp-server/
  openclaw-plugin/
docs/
scripts/
```

## Planning artifacts

The repository includes optional Copilot planning artifacts in:

- `docs/copilot-prompts/`
- `docs/github-issues/`

They can be used to manage iterative implementation work, but they are not required for normal development.
