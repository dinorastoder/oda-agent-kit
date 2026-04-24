# Copilot task: Add cart planning before mutation

## Goal

Implement a planning layer that proposes cart changes before executing them.

## Scope

Add:

- `CartPlan`
- `CartPlanItem`
- `buildCartPlan`
- `compareCartToUsual`
- `findSubstitutes` placeholder

## Requirements

The plan should explain each item source:

- order history
- saved list
- recipe
- explicit user request
- substitute
- staple rule

## Out of scope

- Executing cart mutations.
- Placing final orders.

## Acceptance criteria

- Tests prove plans are generated without changing cart state.
- Plan output is suitable for agent confirmation messages.
