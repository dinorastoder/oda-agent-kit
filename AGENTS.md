# AGENTS.md — Contributor & Agent Guidelines

This document describes conventions and rules for human contributors and AI coding agents working in this repository.

## Repository Layout

```text
oda-agent-kit/
├── packages/
│   ├── core/               # @oda-agent/core  — Oda API client & types
│   ├── cli/                # @oda-agent/cli   — Terminal CLI
│   ├── mcp-server/         # @oda-agent/mcp-server — MCP server
│   └── openclaw-plugin/    # @oda-agent/openclaw-plugin
├── docs/                   # Markdown documentation
├── scripts/                # Build / CI helper scripts
├── tsconfig.base.json      # Shared TS compiler options
├── package.json            # Workspace root (npm workspaces)
└── .env.example            # Env variable template (never commit .env)
```

## General Rules

1. **Never commit secrets.** `.env` files and credentials must never be checked in. Use `.env.example` for templates.
2. **TypeScript only.** All source files must be `.ts` (no plain `.js` in `src/`).
3. **Strict mode.** Every package extends `tsconfig.base.json` which enables `"strict": true`.
4. **Conventional Commits.** Use the format `type(scope): message` (e.g. `feat(core): add product search`).
5. **One concern per package.** Keep packages focused; cross-package dependencies should go through the public API, not internal paths.

## Coding Standards

- Use `async/await`; avoid raw Promise chains.
- Prefer named exports over default exports.
- Export all public types from `src/index.ts`.
- Write unit tests for all non-trivial logic. Place tests in `src/__tests__/`.
- Keep functions small and pure where possible.

## Package-Specific Notes

### `@oda-agent/core`

- This is the only package allowed to make HTTP calls to the Oda API.
- Export a typed `OdaClient` class as the primary entry point.
- All API response types must live in `src/types.ts`.

### `@oda-agent/cli`

- Use `commander` for argument parsing.
- The binary entry point is `src/cli.ts` (declared as `"bin"` in `package.json`).
- Output should be human-readable by default; support `--json` flag for machine output.

### `@oda-agent/mcp-server`

- Implement using the `@modelcontextprotocol/sdk` package.
- Each Oda capability (search, cart, orders, delivery) maps to one MCP tool.
- Keep tool descriptions concise but accurate for LLM consumption.

### `@oda-agent/openclaw-plugin`

- Expose a plugin factory function as the default export of `src/index.ts`.
- Depends on `@oda-agent/core` for all Oda API access.

## Running the Workspace

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Run all tests
npm run test

# Type-check without emitting
npm run typecheck

# Clean build artifacts
npm run clean
```

## Pull Request Checklist

- [ ] `npm run build` passes with no errors
- [ ] `npm run test` passes
- [ ] `npm run typecheck` passes
- [ ] No new linting errors introduced
- [ ] `.env` is **not** committed
- [ ] New public APIs are exported from `src/index.ts`
- [ ] Commit messages follow Conventional Commits
