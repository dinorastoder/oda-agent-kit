# Copilot task: Add basic CLI commands

## Goal

Implement the first CLI wrapper around `@oda-agent/core`.

## Commands

Create placeholder commands:

```bash
oda auth status
oda search <query>
oda cart get
oda orders list
oda lists list
oda slots list
```

## Requirements

- Use core library interfaces.
- Support `--json`.
- Do not shell out to other packages.
- Do not implement live Oda credentials yet unless core already supports it.

## Acceptance criteria

- `npx oda --help` works locally after build.
- Commands have useful placeholder behavior or fixture-backed behavior.
- CLI package builds and tests pass.
