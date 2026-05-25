# Publishing Plan

This document describes how the `oda-agent-kit` workspace packages are published to npm,
including publishing order, versioning, pre-release strategy, and install examples.

---

## Packages

The repo publishes four scoped public packages:

```text
@oda-agent/core
@oda-agent/cli
@oda-agent/mcp-server
@oda-agent/openclaw-plugin
```

All packages use the `@oda-agent` npm scope. Scoped packages default to **private**
on npm, so every `npm publish` command must include `--access public`.

Each package ships only compiled output. The `"files"` field in each
`package.json` controls what is included in the published tarball:

| Package | Published files |
|---------|----------------|
| `@oda-agent/core` | `dist/` |
| `@oda-agent/cli` | `dist/` |
| `@oda-agent/mcp-server` | `dist/` |
| `@oda-agent/openclaw-plugin` | `dist/`, `openclaw.plugin.json`, `skills/` |

Source files, tests, and `tsconfig.json` are never included.

---

## npm workspace behavior

This repo is an npm workspace monorepo. A few important behaviors to keep in mind
when publishing:

- Running `npm publish` from the **repo root** without a `--workspace` flag
  will fail because the root `package.json` is `"private": true`.
- Each package must be published individually. Both the workspace path form
  (`--workspace=packages/core`) and the package-name form
  (`--workspace=@oda-agent/core`) work; the examples below use the path form.
- Workspace-local cross-dependencies should use the current SemVer-compatible
  release range for shared packages (for example `"^0.4.1"` for `@oda-agent/core`
  when publishing `0.4.1`). This keeps published adapter packages aligned with the
  core release they were validated against.
- Always build (`npm run build`) **before** publishing so that `dist/` is up to date.

---

## Publishing order

`core` must always be published first because the adapter packages
(`cli`, `mcp-server`, `openclaw-plugin`) depend on it:

```bash
# 1. Build everything
npm run build

# 2. Publish in dependency order
npm publish --workspace=packages/core --access public
npm publish --workspace=packages/cli --access public
npm publish --workspace=packages/mcp-server --access public
npm publish --workspace=packages/openclaw-plugin --access public
```

---

## Why `core` is published separately

- Adapter packages (`cli`, `mcp-server`, `openclaw-plugin`) each bring their
  own heavy dependencies (commander, @modelcontextprotocol/sdk, etc.).
- Consumers who only need the Oda API client types should be able to install
  `@oda-agent/core` without pulling in CLI or MCP tooling.
- `core` can be reused by future adapters without any circular dependencies.
- Publishing `core` independently lets library authors extend the toolkit without
  depending on any specific runtime (Node CLI, stdio server, OpenClaw, etc.).

---

## CLI `bin` behavior

`@oda-agent/cli` registers a binary named **`oda`** via the `"bin"` field in its
`package.json`:

```json
{
  "bin": {
    "oda": "dist/bin.js"
  }
}
```

When a user installs the package globally, npm places `oda` on their `PATH`.
When installed locally (e.g. in a project), npm creates `node_modules/.bin/oda`
which can be invoked via `npx oda` or as an npm script.

---

## Versioning

All packages in this repo follow [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH
```

| Change type | Example bump |
|-------------|-------------|
| Breaking API change | `0.1.0` → `1.0.0` |
| New backwards-compatible feature | `0.1.0` → `0.2.0` |
| Bug fix / patch | `0.1.0` → `0.1.1` |

Keep **all four packages at the same version** to avoid cross-package confusion.
Before tagging or running the publish workflow, manually update the `version` field
in every `package.json` to the target version. The publish workflow does **not**
bump versions automatically — it only builds and publishes whatever version is
already set in `package.json`.

### Pre-release versions for testing

Before a stable release, publish a tagged pre-release to let users test in
Claude Desktop / OpenClaw without affecting the `latest` dist-tag:

| Stage | Version example | npm dist-tag |
|-------|-----------------|--------------|
| Early preview | `0.2.0-alpha.1` | `alpha` |
| Feature-complete but untested | `0.2.0-beta.1` | `beta` |
| Release candidate | `0.2.0-rc.1` | `rc` |
| Stable | `0.2.0` | `latest` |

Publish a pre-release using the `--tag` flag (this prevents the pre-release
from becoming the default `latest` version):

```bash
npm publish --workspace=packages/core --access public --tag beta
npm publish --workspace=packages/cli --access public --tag beta
npm publish --workspace=packages/mcp-server --access public --tag beta
npm publish --workspace=packages/openclaw-plugin --access public --tag beta
```

Install a specific pre-release tag:

```bash
# Install beta version
npm install @oda-agent/cli@beta

# Install a specific pre-release version
npm install @oda-agent/mcp-server@0.2.0-beta.1
```

Promote a pre-release to `latest` when it is ready:

```bash
npm dist-tag add @oda-agent/core@0.2.0-rc.1 latest
npm dist-tag add @oda-agent/cli@0.2.0-rc.1 latest
npm dist-tag add @oda-agent/mcp-server@0.2.0-rc.1 latest
npm dist-tag add @oda-agent/openclaw-plugin@0.2.0-rc.1 latest
```

---

## GitHub Actions publish workflow

A reusable publish workflow lives at `.github/workflows/publish.yml`. It can be
triggered two ways:

1. **Tag push** — push a tag matching `v*` (e.g. `v0.2.0` or `v0.2.0-beta.1`)
   and the workflow publishes automatically.
2. **Manual dispatch** — go to _Actions → Publish packages → Run workflow_ in the
   GitHub UI and choose the dist-tag (`latest`, `rc`, `beta`, `alpha`).

The workflow builds all packages and publishes them in the correct order using
`NODE_AUTH_TOKEN` from the repository `NPM_TOKEN` secret.

See `.github/workflows/publish.yml` for the full configuration.

### Setting up npm publish authentication

Before running the publish workflow, create an npm automation token and add it
as a GitHub repository secret named `NPM_TOKEN`:

1. Log in to [npmjs.com](https://www.npmjs.com).
2. Create an automation token that can publish `@oda-agent/*` packages.
3. In GitHub, open `dinorastoder/oda-agent-kit` → **Settings** → **Secrets and variables** → **Actions**.
4. Add a new repository secret named `NPM_TOKEN` with the token value.

The publish job injects this secret as `NODE_AUTH_TOKEN` for each `npm publish`
step.

### Workflow jobs

The publish workflow has two jobs:

| Job | Purpose |
|-----|---------|
| `publish` | Builds all packages and publishes them to npm in dependency order |
| `smoke-test` | Runs after `publish`; installs the just-published packages from npm in a fresh project and verifies key exports |

The smoke-test job waits up to ~2 minutes for registry propagation before
attempting the install. If the packages are not visible after that window, the
job fails so you know to investigate.

---

## Smoke testing

### Local smoke test (no npm access needed)

Run this before every publish to catch broken dist/ artifacts or missing exports:

```bash
./scripts/local-smoke-test.sh
```

What it does:

1. Builds all packages (`npm run build`).
2. Packs `@oda-agent/core` and `@oda-agent/openclaw-plugin` into local tarballs
   using `npm pack`.
3. Creates a temporary standalone project that installs from the tarballs
   (no workspace resolution — simulates a real consumer install).
4. Verifies that `OdaClient` and `createOpenClawPlugin` are importable.

### Post-publish smoke test (requires npm)

After publishing, confirm the packages are correct on the registry:

```bash
./scripts/smoke-test.sh 0.1.0-alpha.1
```

Replace `0.1.0-alpha.1` with the version you just published.  
This script installs from the live npm registry and verifies the same exports.

This same check runs automatically as the `smoke-test` job in `publish.yml`
immediately after every publish.

---

## Example installs

```bash
npm install -g @oda-agent/cli
oda --help
```

### CLI (local / project install)

```bash
npm install --save-dev @oda-agent/cli
npx oda --help
```

### MCP server (Claude Desktop)

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "oda": {
      "command": "npx",
      "args": ["-y", "@oda-agent/mcp-server"],
      "env": {
        "ODA_EMAIL": "your@email.com",
        "ODA_PASSWORD": "your-password"
      }
    }
  }
}
```

### MCP server (pinned version)

```json
{
  "mcpServers": {
    "oda": {
      "command": "npx",
      "args": ["-y", "@oda-agent/mcp-server@0.2.0"]
    }
  }
}
```

### MCP server (pre-release / beta)

```json
{
  "mcpServers": {
    "oda": {
      "command": "npx",
      "args": ["-y", "@oda-agent/mcp-server@beta"]
    }
  }
}
```

### OpenClaw plugin

```bash
openclaw plugins install @oda-agent/openclaw-plugin
```

To verify the installation succeeded, check that the plugin is listed and that
the Oda tools are registered:

```bash
openclaw plugins list
openclaw tools list | grep oda
```

### OpenClaw plugin (pre-release)

```bash
openclaw plugins install @oda-agent/openclaw-plugin@beta
```

### Core library only (for custom integrations)

```bash
npm install @oda-agent/core
```
