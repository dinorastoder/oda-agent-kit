# GitHub Copilot Instructions — Oda Agent Kit

## Project identity

This repository is a TypeScript npm workspace monorepo for Oda grocery automation.

The main design goal is reusable domain logic in `packages/core`, with separate adapters for CLI, MCP, and OpenClaw.

## Always follow these rules

1. Keep Oda business logic in `packages/core`.
2. Keep CLI, MCP, and OpenClaw packages thin.
3. Use TypeScript strict mode.
4. Respect the repository's current module/test setup when editing (`CommonJS` + `Jest`), unless the task explicitly includes migration work.
5. Add Zod schemas at API boundaries when introducing or changing external response parsing.
6. Prefer fixture-backed tests for domain transformations and parsing.
7. Do not implement final order placement in the initial version.
8. Do not store credentials in the repo.
9. Do not log secrets, cookies, CSRF tokens, or session IDs.
10. For MCP stdio server, write logs to stderr, not stdout.

## Preferred coding style

- Small files with single responsibility.
- Explicit exported interfaces.
- Runtime validation for external API responses.
- No hidden network calls in constructors.
- Return structured result objects instead of printing from library code.
- Adapter packages may format output, but core must not.

## Current stack notes

- Current tests use Jest (`ts-jest`) per package.
- Current tsconfig base is CommonJS.
- Planned migrations (ESM, wider runtime validation) should be explicit and repo-wide, not partial.

## Initial package dependency rules

Allowed:

```text
@oda-agent/cli -> @oda-agent/core
@oda-agent/mcp-server -> @oda-agent/core
@oda-agent/openclaw-plugin -> @oda-agent/core
```

Not allowed:

```text
@oda-agent/core -> any adapter package
@oda-agent/mcp-server -> @oda-agent/cli
@oda-agent/openclaw-plugin -> @oda-agent/cli
@oda-agent/openclaw-plugin -> @oda-agent/mcp-server
```

## Commands that should work

```bash
npm install
npm run build
npm test
npm run lint
```

## Important domain behavior

The assistant/user workflow should be:

1. Read current cart, order history, saved lists, and delivery slots.
2. Build a proposed grocery plan.
3. Explain why each item is suggested.
4. Ask for confirmation before cart mutation.
5. Ask for stronger confirmation before delivery-slot changes.
6. Never place an order automatically.

## Initial milestone

For the first milestone, create the project structure, TypeScript configuration, package manifests, placeholder interfaces, fixture-based tests, and documentation.

Do not attempt to reverse-engineer every Oda endpoint in the first PR.
