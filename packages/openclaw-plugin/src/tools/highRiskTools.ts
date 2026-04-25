/**
 * High-risk tools — ORDER PLACEMENT IS OUT OF SCOPE FOR v0.
 *
 * This module documents the high-risk tool surface for the Oda shopping
 * assistant. None of the tools in this module are implemented. They exist
 * solely to make the safety boundary explicit and to reserve the correct
 * API surface for a future version.
 *
 * Rationale
 * ---------
 * Placing a grocery order involves real financial transactions. Doing so
 * automatically, without strong human oversight and a confirmed payment
 * step, would be unsafe. The v0 assistant is therefore read-and-plan-only,
 * with cart mutations being the furthest extent of automation.
 *
 * Future work
 * -----------
 * A future version may expose a `placeOrder` tool behind:
 *  1. An explicit double-confirmation flow (show full order summary + price).
 *  2. A separate opt-in feature flag in openclaw.plugin.json.
 *  3. A mandatory audit-log entry before and after placement.
 *
 * Do NOT implement payment logic or final order placement in this package.
 */

// ---------------------------------------------------------------------------
// Placeholder — not implemented
// ---------------------------------------------------------------------------

/**
 * @throws Always throws — order placement is not implemented in v0.
 *
 * @deprecated Not implemented. See module-level documentation.
 */
export function placeOrder(): never {
  throw new Error(
    'placeOrder is not implemented. ' +
      'Final order placement is out of scope for v0 of the Oda shopping assistant. ' +
      'See the OpenClaw plugin manifest (openclaw.plugin.json) for supported tool capabilities.',
  );
}
