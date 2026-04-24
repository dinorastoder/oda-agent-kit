# Copilot task: Add order history and household preference analysis

## Goal

Implement fixture-backed order history normalization and household staple analysis in `@oda-agent/core`.

## Scope

Add:

- normalized `Order`
- normalized `OrderItem`
- `HouseholdPreference`
- `StapleRule`
- `analyzeOrderHistory`
- `getHouseholdStaples`

## Requirements

The analysis should identify:

- products bought frequently
- average quantity
- frequency category
- confidence
- reason string suitable for display to the user

## Out of scope

- Live endpoint reverse-engineering unless already available.
- Cart mutation.
- Final order placement.

## Acceptance criteria

- Fixture tests cover multiple orders.
- Output is deterministic.
- CLI or MCP can call the analysis function if already scaffolded.
