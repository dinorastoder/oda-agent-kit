# Family Grocery Assistant Plan

## Goal

Turn the family grocery assistant concept into an implementation plan that can be split into plugin, OpenClaw configuration, and documentation work.

## Planning Assumptions

- Oda remains the order execution backend.
- OpenClaw remains the household-facing orchestration layer.
- WhatsApp is the desired user-facing intake channel, but that channel integration is separate from Oda domain logic.
- Final order placement stays blocked in the initial release.
- The first useful release should optimize for recurring household ordering, not full meal-planning intelligence.

## Workstreams

### 1. Oda domain and plugin work

Purpose: make the Oda plugin capable of supporting recurring-order drafting rather than isolated shopping actions.

Core tasks:

- define a structured household baseline model for standard items, default quantities, and substitution rules
- support product mapping between household baseline items and Oda product identifiers
- expose read and mutation operations needed for draft-cart preparation
- use order history and saved lists as optional support signals
- add fee-threshold and basket-summary helpers so the assistant can explain why it recommends adding more items
- keep delivery-slot mutation and final order placement behind existing safety boundaries

Acceptance outcomes:

- the plugin can take a structured household draft and reconcile it against the current Oda cart
- recurring items can be added using defaults without repeated manual lookup
- the plugin can explain cart deltas and uncertainty clearly

### 2. OpenClaw skill and orchestration work

Purpose: shape the assistant behavior around household routines instead of raw Oda commands.

Core tasks:

- design a household grocery skill prompt focused on collecting, normalizing, and reviewing requests
- define state for weekly draft order, ad hoc additions, pending confirmations, and review summaries
- support reminder behavior for Wednesday review and Friday afternoon delivery target
- define how WhatsApp text, voice-note transcripts, and photos become structured intents
- design exception handling for substitutions, unavailable items, and unusual quantities

Acceptance outcomes:

- either adult can interact with the assistant naturally through the chosen channel
- the assistant defaults to known staples and only escalates exceptions
- weekly review behavior is deterministic and easy to understand

### 3. Configuration work

Purpose: make household rules explicit and editable without code changes.

Core tasks:

- define a household configuration schema
- configure household members allowed to approve changes
- configure recurring staples, product preferences, and default quantities
- configure substitution policies by item or category
- configure reminder timing and delivery preference defaults
- configure fee-threshold nudging rules

Acceptance outcomes:

- a household can tune behavior through configuration rather than code edits
- the assistant behavior remains stable and auditable

### 4. Documentation work

Purpose: make the system understandable enough to implement and operate safely.

Core tasks:

- document the product behavior and release boundary
- document the configuration schema and examples
- document approval and safety expectations
- document operating flows for weekly routine, ad hoc requests, and exception review
- document what remains intentionally out of scope

Acceptance outcomes:

- implementers know where behavior belongs
- operators know what the assistant will and will not do

## Phased Delivery

### Phase 0: foundation decisions

Deliverables:

- confirm product scope for v1
- confirm where household state and configuration live
- confirm how WhatsApp events reach OpenClaw
- confirm first configuration format

Exit criteria:

- no ambiguity about system boundary between Oda integration and household orchestration

### Phase 1: first usable release

Deliverables:

- recurring household baseline configuration
- ad hoc request capture into a weekly draft
- cart reconciliation against Oda
- hybrid review summary before mutations
- Wednesday reminder flow
- Friday afternoon default delivery preference stored as configuration only

Exit criteria:

- the assistant can prepare a weekly order draft from baseline items plus mid-week additions
- final order placement is still blocked

### Phase 2: intelligence improvements

Deliverables:

- learned preference support from order history
- richer substitution rules
- saved-list and favorites support where useful
- minimum-order-fee nudging improvements
- delivery slot suggestion and optional reservation with confirmation

Exit criteria:

- the assistant reduces the amount of manual curation needed for each weekly order

### Phase 3: planning and optimization

Deliverables:

- meal-plan-assisted ordering
- promotion-aware recommendations
- stronger multimodal stock inference from photos
- more advanced household coordination features

Exit criteria:

- the assistant supports both recurring staples and forward-looking household planning

## Suggested Backlog Split

### Implementation tickets

- define household baseline schema and storage model
- add recurring-item reconciliation flow to the Oda plugin
- implement product resolution for configured household items
- add cart-delta explanation helpers
- expose fee-threshold guidance in plugin responses
- implement weekly draft state handling in OpenClaw
- normalize chat, voice, and image-derived grocery intents

### Documentation tickets

- write household configuration reference
- write weekly workflow operator guide
- write safety and approval guide for household use
- write architecture note on Oda plugin versus channel orchestration responsibilities

### Configuration tickets

- define initial household staple list
- define default quantities for recurring items
- define preferred brands and substitution rules
- define reminder and delivery defaults
- define approver identities

## Risks

- unclear boundary between Oda plugin logic and WhatsApp or channel logic could create a messy architecture
- photo-based stock inference may look smarter than it really is if the first release scope is not stated clearly
- automatic substitutions can damage trust if preference rules are too vague
- hidden Oda endpoint quirks may affect optional capabilities like saved lists or promotions

## Recommended Immediate Next Tasks

1. Define the household configuration schema and a concrete sample household file.
2. Design the OpenClaw grocery skill behavior around weekly draft management and exception review.
3. Review current Oda plugin capabilities against the v1 scope and identify missing APIs for recurring-order drafting.