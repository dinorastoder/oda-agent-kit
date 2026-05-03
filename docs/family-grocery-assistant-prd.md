# Family Grocery Assistant PRD

## Summary

This document defines how OpenClaw should act as a family grocery assistant backed by Oda.

The target user is a two-adult household that wants help staying regular with grocery ordering, reducing household coordination overhead, and avoiding unnecessary visits to physical stores. The assistant should prepare and maintain orders with high autonomy, but final order placement and payment remain blocked.

## Product Goal

Create a household assistant that:

- keeps standard items in stock
- accepts ad hoc requests during the week
- can draft an Oda cart that is close to ready without manual micromanagement
- supports shared approval by either adult
- fits a simple weekly routine before expanding into richer meal planning and slot optimization

## Problem Statement

The household already knows roughly what it buys, but ordering is not regular enough. Family members notice missing items during the week, yet that information is fragmented across memory, chat, and what is physically visible in the fridge. This creates friction, delayed ordering, and extra store visits.

The assistant should reduce that friction by collecting signals from normal family behavior, comparing them against a standard baseline, and preparing a sensible draft order in Oda.

## Users And Roles

### Primary users

- two adults in the household
- both adults can request changes, review proposals, and approve cart or delivery changes

### Future contributors

- other family members may later suggest items, but this is not required for the first release

## Operating Model

### Main workflow

- weekly grocery rhythm with a default delivery target of Friday afternoon
- reminder or review prompt on Wednesday so the household can confirm the coming order
- ad hoc item capture throughout the week
- final order placement remains manual and explicitly blocked in v1

### Input channels

- WhatsApp direct chat
- WhatsApp group chat
- voice notes sent in WhatsApp and converted to text upstream
- photos of missing items sent in WhatsApp
- fridge or pantry photos used as a comparison signal against a standard list

### Decision priorities

1. household preferences
2. maintaining standard household stock
3. avoiding extra fees caused by too-small orders
4. convenience and low coordination overhead
5. meal-plan completeness in later phases

Cost matters, but only as a secondary decision factor except where basket size affects order fees.

## Product Principles

1. Shared household operation. The assistant must treat both adults as equal operators.
2. Default-driven behavior. The system should rely on standard quantities, preferred brands, and recurring staples rather than asking repeated questions.
3. Read first, mutate second. The assistant should inspect cart, history, lists, and availability before proposing changes.
4. High autonomy with hard stop at checkout. The assistant may prepare orders, but cannot place final orders in v1.
5. Exception-focused UX. Routine choices should be automatic; ambiguity and risk should be surfaced for review.

## First Release Scope

### In scope

- maintain a standard household list of recurring items
- allow mid-week ad hoc additions from chat, voice-note transcripts, and photos of missing items
- compare fridge or pantry photos against the standard household list at a simple rule-based level
- build or update the Oda cart based on the standard list plus ad hoc additions
- apply standard default quantities for recurring items like milk
- present one consolidated review with separate highlights for risky or unclear items
- support a fixed weekly cadence with Wednesday reminder and Friday afternoon default delivery preference
- keep final order placement and payment blocked

### Out of scope for the first release

- detailed meal-plan generation and recipe-driven ordering
- sophisticated image understanding beyond comparison to a predefined standard list
- dynamic delivery slot optimization
- automatic promotions optimization
- automatic final order placement
- changes to already submitted Oda orders

## Later Phase Scope

### Phase 2 candidates

- meal-plan-driven basket suggestions
- learned household staples from order history
- richer substitution policies by category
- order-history-based quantity tuning
- promotion-aware suggestions
- delivery slot selection and optimization with confirmation

### Phase 3 candidates

- stronger multimodal pantry inference
- explicit family member roles beyond the two adults
- optional final-order automation after reliability is proven and deliberately approved

## Key User Stories

1. As a household operator, I want the assistant to remember our standard grocery baseline so I do not rebuild the same order every week.
2. As a household operator, I want to send a quick WhatsApp message, voice note, or photo when something is missing so requests are captured where we already communicate.
3. As a household operator, I want the assistant to use standard quantities for recurring items so simple needs do not require manual quantity decisions each time.
4. As a household operator, I want the assistant to prepare a near-ready basket before Friday so we stay regular with ordering.
5. As a household operator, I want the assistant to flag unclear substitutions or unusual items rather than making silent risky choices.
6. As a household operator, I want final order placement blocked until we explicitly decide otherwise.

## Functional Requirements

### 1. Household baseline management

The system must support a configurable household baseline that includes:

- recurring staple items
- preferred products or brands
- default quantities
- category-specific substitution rules
- preferred Friday afternoon delivery target

This baseline should combine three sources over time:

- manual configuration as the initial source of truth
- learned behavior from order history
- conversational preferences captured by the assistant

### 2. Ad hoc request capture

The system must accept and normalize requests coming from WhatsApp-based interaction.

Supported request forms:

- plain text requests
- voice-note transcripts provided by the surrounding OpenClaw workflow
- photos of missing items

Normalized requests should become structured candidate cart updates rather than immediate cart mutations.

### 3. Pantry or fridge comparison

The first useful behavior is simple comparison against the standard household list.

The assistant does not need to estimate exact quantities from images in v1. Instead, it should treat photos as signals that a standard item is missing or low, then propose the household default quantity unless better evidence exists.

### 4. Draft-cart preparation

The assistant must be able to:

- inspect the current cart
- inspect order history
- inspect available shopping lists or saved lists when supported
- search for products when a direct product mapping is missing
- add or update recurring items and ad hoc requests in the cart
- present the resulting cart delta before confirmation

### 5. Review experience

The assistant should provide a hybrid review UX:

- one consolidated proposed order summary
- explicit callouts for risky items, unclear matches, substitutions, unavailable products, or unusual spend changes

Routine items should be handled quietly; exceptions should be surfaced.

### 6. Approval and safety

- either adult may approve cart changes
- delivery-slot changes may later be approved by either adult
- final order placement and payment remain blocked
- the assistant must never silently perform checkout or payment actions

### 7. Basket-size nudging

The assistant should use budget logic primarily to avoid unnecessary extra fees caused by too-small orders.

This means:

- warn when the basket is below thresholds that trigger fees
- suggest useful standard items to cross those thresholds when appropriate
- not optimize aggressively for lowest spend in general

## Non-Functional Requirements

- preserve user trust through predictable safety boundaries
- keep configuration understandable for a household, not only a developer
- degrade gracefully when optional Oda endpoints fail or are unavailable
- separate Oda domain logic from OpenClaw channel or skill logic
- support iterative rollout from simple recurring-order automation to richer planning

## Capability Implications For Oda Integration

### Needed now

- cart read and mutation
- product search
- order history
- saved or product lists where available
- stable product identity mapping for standard household items

### Needed soon after v1

- delivery slot inspection and reservation with confirmation
- order-history summarization for staple inference
- promotion exposure where useful

### Important known product gaps

- order history needs to be usable as a preference-learning signal
- delivery slot optimization is not yet part of the first release
- promotions matter later but should not block baseline automation

## Implications For OpenClaw Skill And Configuration

### Skill behavior

The OpenClaw skill should act less like a generic shopping tool and more like a household operations agent. Its default behavior should be:

- collect requests throughout the week
- maintain a structured shopping draft
- ask fewer questions for known staples
- ask for review only on exceptions or before mutation
- treat WhatsApp as the household-facing interaction channel

### Configuration model

OpenClaw-side configuration should likely capture:

- household members allowed to approve changes
- recurring items and default quantities
- brand preferences and substitution policies
- reminder cadence
- target delivery day and time window
- fee-threshold nudging rules
- mapping from multimodal signals to known household items

### Architectural boundary

The Oda plugin should remain focused on Oda-specific capabilities and domain operations. Channel-specific intake such as WhatsApp messages, voice-note transcription, and image ingestion should stay outside the Oda core and feed structured intents into it.

## Success Metrics

The first release is successful if, after a few weeks of use:

- the household orders more regularly
- family coordination overhead is meaningfully lower
- fewer physical store visits are needed because staples are already covered
- ad hoc requests are captured with low friction
- the generated basket is usually close to acceptable without major manual rewriting

## Open Questions To Resolve In Implementation Planning

- where the household baseline should live as the primary source of truth
- how WhatsApp intake reaches OpenClaw in the actual deployment
- whether fridge-photo comparison should start as manual review support before any automatic inference
- how explicit the minimum-order-fee logic should be in user-facing explanations
- which substitution categories are safe enough for automatic handling in v1

## Recommended Product Framing

Frame the first release as:

"A shared household grocery drafting assistant for Oda that keeps recurring staples on track, captures mid-week requests through WhatsApp, and prepares a reviewable weekly order without allowing final checkout."