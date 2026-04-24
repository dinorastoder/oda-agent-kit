# AGENTS.md — Repository Instructions for Copilot Coding Agent

You are working on oda-agent-kit, a TypeScript monorepo for interacting with the Norwegian online grocery store Oda.

## Primary goal

Build and maintain a reusable Oda automation toolkit with:

1. A reusable core library.
2. A CLI for humans and debugging.
3. An MCP server for model clients.
4. An OpenClaw plugin and skill for agentic grocery workflows.

## Architecture rule

Keep Oda business logic in packages/core.

Keep adapter packages thin:

- packages/cli
- packages/mcp-server
- packages/openclaw-plugin

Dependency direction must be:

```text
packages/core
        ↑
        ├── packages/cli
        ├── packages/mcp-server
        └── packages/openclaw-plugin
```

No adapter package may import another adapter package.

## Package names

Use these package names:

```text
@oda-agent/core
@oda-agent/cli
@oda-agent/mcp-server
@oda-agent/openclaw-plugin
```

## Current stack

Use:

- TypeScript
- npm workspaces
- Jest (ts-jest) tests per package
- commander for CLI
- @modelcontextprotocol/sdk for MCP server

Current compiler/module setup is CommonJS.

Planned direction:

- ESM modules
- Zod at external API boundaries
- fixture-first tests for schema and normalization layers

When introducing planned changes, migrate consistently across packages.

## Safety requirements

- Never store plaintext credentials in the repository.
- Use environment variables or local ignored session storage.
- Keep .env.example; never commit .env.
- Mutating tools must clearly describe intended changes.
- Final order placement must not exist in v0.
- Do not add payment logic.
- Tests should use fixtures, not live Oda calls, by default.
- MCP stdio server logs must go to stderr, not stdout.

## Tool design guidance

Expose medium-level tools, not raw HTTP endpoints.

Read-only tools should be safe by default.

Cart mutation tools should be optional and confirmation-protected.

High-risk ordering tools are out of scope for v0.

## Development workflow

- Work in small PRs.
- Prefer incremental changes over repo-wide restructuring.
- Keep existing scripts and tests working: npm install, npm run build, npm test, npm run lint.
- Use docs/copilot-prompts and docs/github-issues as optional planning aids.

Do not jump directly to full ordering automation.
