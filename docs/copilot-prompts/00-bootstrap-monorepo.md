# Copilot task: Bootstrap the Oda Agent Kit monorepo

Create the initial repository scaffold for `oda-agent-kit`.

## Goal

Create a TypeScript npm workspace monorepo with four packages:

- `@oda-agent/core`
- `@oda-agent/cli`
- `@oda-agent/mcp-server`
- `@oda-agent/openclaw-plugin`

## Requirements

Follow `AGENTS.md` and `.github/copilot-instructions.md`.

Create:

```text
package.json
package-lock.json
tsconfig.base.json
.gitignore
.env.example
README.md

packages/core
packages/cli
packages/mcp-server
packages/openclaw-plugin

docs/
scripts/
```

## Package setup

Each package should have:

- `package.json`
- `tsconfig.json`
- `src/index.ts` or equivalent
- `npm run build`
- placeholder tests where useful

Root scripts:

```json
{
  "build": "npm run build --workspaces",
  "test": "npm run test --workspaces --if-present",
  "lint": "npm run lint --workspaces --if-present",
  "typecheck": "npm run typecheck --workspaces --if-present"
}
```

## Acceptance criteria

- `npm install` works.
- `npm run build` works.
- `npm test` works.
- Package dependency direction is correct.
- No live Oda API calls are implemented yet.
- No secrets are committed.
