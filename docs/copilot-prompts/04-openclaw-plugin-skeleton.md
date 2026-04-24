# Copilot task: Add OpenClaw plugin skeleton

## Goal

Create `@oda-agent/openclaw-plugin` with OpenClaw manifest, read-only tools, and a skill.

## Scope

Create:

```text
packages/openclaw-plugin/openclaw.plugin.json
packages/openclaw-plugin/src/index.ts
packages/openclaw-plugin/src/tools/readOnlyTools.ts
packages/openclaw-plugin/src/tools/cartMutationTools.ts
packages/openclaw-plugin/src/tools/highRiskTools.ts
packages/openclaw-plugin/skills/oda-shopping-assistant/SKILL.md
```

## Tool grouping

Read-only tools should be default.

Cart mutation tools should be optional/disabled until explicitly enabled.

High-risk order placement tools should be documented but not implemented.

## Acceptance criteria

- Package builds.
- Plugin manifest exists.
- Skill explains the grocery workflow and safety model.
- No order placement implementation.
