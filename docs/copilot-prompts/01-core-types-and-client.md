# Copilot task: Add core types and Oda client skeleton

## Goal

Implement the first version of `packages/core`.

## Scope

Create:

- `OdaClient`
- `OdaClientOptions`
- HTTP abstraction
- session abstraction
- typed domain models
- Zod schemas for product/cart/order/list/slot placeholders
- fixture-based tests

## Out of scope

- Live authentication.
- Final order placement.
- Payment.
- Real user credentials.

## Acceptance criteria

- `@oda-agent/core` builds.
- `OdaClient` can be constructed without network calls.
- Fixture parsing tests exist.
- Public exports are clean and documented.
