# Implement cart planning before mutation

Labels: copilot, core, cart

## Goal

Create a planning layer that proposes cart changes without changing the real cart.

## Scope

Follow `docs/copilot-prompts/06-cart-plan-before-mutation.md`.

## Acceptance criteria

- [ ] `CartPlan` model exists
- [ ] `buildCartPlan` exists
- [ ] `compareCartToUsual` exists
- [ ] Tests prove no mutation happens
- [ ] Output is suitable for confirmation messages

