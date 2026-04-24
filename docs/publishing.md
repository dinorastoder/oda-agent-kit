# Publishing Plan

## Packages

The repo should publish these npm packages:

```text
@oda-agent/core
@oda-agent/cli
@oda-agent/mcp-server
@oda-agent/openclaw-plugin
```

## Publishing order

Publish `core` first:

```bash
npm publish --workspace=@oda-agent/core --access public
npm publish --workspace=@oda-agent/cli --access public
npm publish --workspace=@oda-agent/mcp-server --access public
npm publish --workspace=@oda-agent/openclaw-plugin --access public
```

## Why separate packages?

- CLI users should not install MCP/OpenClaw dependencies.
- MCP users should not install CLI/OpenClaw dependencies.
- OpenClaw users should not depend on the CLI.
- `core` can be reused by future adapters.

## Example installs

CLI:

```bash
npm install -g @oda-agent/cli
oda --help
```

MCP server:

```json
{
  "mcpServers": {
    "oda": {
      "command": "npx",
      "args": ["@oda-agent/mcp-server"]
    }
  }
}
```

OpenClaw plugin:

```bash
openclaw plugins install @oda-agent/openclaw-plugin
```
