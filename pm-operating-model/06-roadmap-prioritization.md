# 06 · Roadmap & Prioritization

A roadmap is a set of **sequenced bets**, not a backlog with dates. Now/Next/Later, each tied to a hypothesis and gated on evidence.

## Now (MVP — prove the core loop) — gated by H3
Goal: validate that the earn→redeem loop works with **zero blockchain exposure**.
- Epic A (issuance) · Epic B (earn/redeem, **association abstracted**) · Epic C1 (HCS audit write) · read-only Mirror views.
- **Exit criteria:** association completion ≥ 95%, redeem success ≥ 99%, core loop demoable end-to-end.
- *This is what the prototype already de-risks the feasibility of.*

## Next (make it adoptable & sellable) — gated by H1 discovery
Goal: turn the working loop into something a merchant can buy and compliance can sign off.
- Merchant self-serve onboarding (A3) · compliance export (C2/C3) · fee/cost dashboard (R9/H4) · embedded wallet polish.
- **Exit criteria:** first 3 design-partner merchants live; compliance export used in a real audit conversation.

## Later (expand the moat) — gated by Next succeeding
Goal: move from single-merchant to network and into regulated tiers.
- Cross-merchant interoperability/exchange · RWA/stablecoin settlement rails · **private/regulated deployment via HashSphere** for banks & large enterprises · analytics.
- *Strategic fit: this is where loyalty becomes a wedge into Hedera's enterprise tokenization + HashSphere thesis.*

## How I prioritize (the framework I'd defend)
For each candidate I score **Reach × Impact × Confidence ÷ Effort (RICE)**, then apply two overrides:
1. **Risk-first override:** if an item de-risks a make-or-break hypothesis (e.g., B1/association), it jumps the queue even at lower RICE — buying information early is worth more than building features.
2. **Strategic-fit override:** ties to Hedera's core direction (tokenization/RWA, verifiable audit, HashSphere) get weight, because a roadmap should compound the platform's bets, not diverge from them.

| Item | R | I | C | E | RICE | Override | Bucket |
|---|---|---|---|---|---|---|---|
| B1 — abstract association | M | H | M | M | mid | **Risk-first ↑** | Now |
| A1/A2 — issuance + fee | M | H | H | L | high | — | Now |
| C1 — HCS audit write | M | H | H | L | high | Strategic-fit ↑ | Now |
| C2 — compliance export | L | H | M | M | mid | Strategic-fit ↑ | Next |
| Cross-merchant interop | H | H | L | H | low | — | Later |
| HashSphere private tier | M | H | L | H | low | **Strategic-fit ↑** | Later |

## Why the overrides matter
Pure RICE rewards the confident and cheap. The two overrides are how the roadmap stays coherent: buy information on the riskiest assumption first, and keep every bet pointed in the same direction as the platform, so the result is one sequence instead of a fragmented list.

Technical design note: [`07-tech-spec-hip.md`](07-tech-spec-hip.md)
