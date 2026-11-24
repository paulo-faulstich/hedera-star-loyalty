# 07 · Technical Design Note (HIP-style)

> Written in the spirit of a **HIP (Hedera Improvement Proposal)**: a design note a PM co-authors with engineering as a peer. Scoped to the product's three load-bearing technical decisions.

## Decision 1 — Reward mechanics: protocol-native custom fee, not a contract
**Choice:** express the loyalty royalty as an HTS `CustomFractionalFee` set via the token's fee schedule, **not** as ERC-20 + Solidity logic.

**Rationale:**
- No custom contract code → no exploit surface, no external audit of fee logic, deterministic behavior.
- Fees are enforced at the protocol level and **predictable** (vs gas-driven ERC-20 variance) — directly supports H4.
- Trade-off accepted: less arbitrary programmability than a contract. For loyalty mechanics that's a *feature* (simplicity, auditability), not a loss. If a merchant later needs complex composability, that's a contract-based tier, not the default.

**Verification:** read the transfer's **record** (not the receipt) to confirm `assessedCustomFees` — receipt gives status/IDs only; record carries the fee/transfer detail. This distinction is a v1 implementation note for the team.

## Decision 2 — Onboarding: abstract the mandatory token association (top product risk, H3)
**Context:** Hedera requires an account to **associate** a token before it can receive it — unlike Ethereum, where any address can receive any ERC-20. Exposed to customers, this is a confusing, adoption-killing step.

**Proposal:** the customer never performs association manually. Options to evaluate with engineering, by cost/latency/trust:
- **(a) Sponsored/relayed association** — merchant pays and submits the association on the customer's behalf.
- **(b) Delegated-key / managed account** — association handled inside the managed-wallet provisioning.
- **(c) Scheduled transaction** — pre-stage association to fire on first earn.

**Recommendation:** start with (b) for v1 (simplest end-to-end given managed wallets), instrument completion rate, and revisit (a) for a future self-custody tier. *This is a PM-eng co-decision, not a PM mandate — the note frames the trade-space, engineering owns the mechanism.*

## Decision 3 — Audit: HCS with consensus timestamps as the compliance primitive
**Choice:** every reward/redemption emits a structured event to a dedicated **HCS topic** (`{event, from, to, amount, ts}`).

**Rationale:**
- HCS provides **fair ordering + consensus timestamps** — the audit time is agreed by the network, not asserted by the merchant's server. That's the property regulated buyers actually need (and the hashgraph fairness guarantee, applied to a product need).
- Decouples "write to consensus" (server-side, holds keys) from "read for display/audit" (client-side, Mirror Node, keyless) — a clean trust boundary.

## Key management note
Merchant treasury keys: **ECDSA** (Hedera portal default, EVM-compatible) loaded via `PrivateKey.fromStringECDSA()`. Flag ED25519 vs ECDSA explicitly per account role so we're deliberate about EVM-compat needs.

## Open questions for engineering (the spec invites, not dictates)
1. Sponsored-association cost/latency at scale, and abuse/rate-limiting posture.
2. HCS submit backpressure/retry under burst earn events.
3. Whether the regulated tier should run on **HashSphere** (private/permissioned) from day one, given data-privacy requirements — and what that means for the public-network code path.
