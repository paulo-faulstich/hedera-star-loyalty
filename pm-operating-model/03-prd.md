# 03 · PRD — Loyalty Tokenization MVP

**Status:** Draft · **Owner:** PM (Paulo) · **Eng partners:** TBD · **Confidence:** Medium (H2 validated, H1 in discovery)

## 1. Summary
Enable a merchant to launch an **audit-grade loyalty token** on Hedera in which every reward and redemption is protocol-native (HTS) and immutably logged (HCS), with a managed customer wallet so the holder never touches keys or association.

## 2. Goals
- G1 — A merchant can issue a branded loyalty token and define a royalty/reward rule **without writing contract code**.
- G2 — A customer can receive and redeem tokens with **zero blockchain concepts exposed** (no association, no keys).
- G3 — A compliance user can export a **tamper-evident audit trail** of any reward/redemption.

## 3. Non-goals (v1)
- NG1 — Cross-merchant token interoperability / exchange.
- NG2 — Self-custody / external wallet support.
- NG3 — Fiat ramps, secondary markets, tax reporting.
- NG4 — Mainnet/regulatory certification (testnet → controlled pilot first).

## 4. Users & jobs-to-be-done
- **Merchant admin** — "Launch a loyalty program my finance and compliance teams can trust, fast."
- **Customer** — "Earn and spend rewards as easily as a points balance, but actually mine."
- **Compliance/auditor** — "Prove what was issued, to whom, for what event, when — without trusting the merchant's database."

## 5. Requirements
| # | Requirement | Priority | Hypothesis link |
|---|---|---|---|
| R1 | Mint a fungible HTS loyalty token (name/symbol/decimals/supply), treasury = merchant | Must | H2 |
| R2 | Configure a **protocol-level royalty/fractional custom fee** (e.g., 1% back to merchant) with no contract code | Must | H1, H2 |
| R3 | **Abstract token association** — customer auto-associated behind onboarding (sponsored tx) | Must | **H3 (top risk)** |
| R4 | Transfer/redeem flow with success/failure surfaced in product terms | Must | H3 |
| R5 | Write a structured **HCS audit event** per reward/redemption (`{event, from, to, amount, ts}`) | Must | H1 (compliance) |
| R6 | Read-only views (balances, history, audit) from **Mirror Node REST API** — no keys in client | Must | — |
| R7 | Compliance **export** of the HCS audit trail with consensus timestamps | Should | H1 |
| R8 | Merchant self-serve onboarding (create token + fee in a guided flow) | Should | — |
| R9 | Fee/cost dashboard so merchant can model program economics | Could | H4 |

## 6. Solution overview
Scripts/services write to consensus (HTS + HCS); the client only **reads** from the Mirror Node — keys never reach the browser. Reward rules are expressed as HTS custom fees, not contract logic. Audit is HCS, queried by consensus timestamp. (Mirrors the prototype's architecture: see the [repository README](../README.md).)

## 7. Open questions for engineering
- Sponsored-association pattern: relayer vs delegated-key vs scheduled tx — cost/latency/trust trade-offs? (→ [`07-tech-spec-hip.md`](07-tech-spec-hip.md))
- ECDSA vs ED25519 for merchant treasury keys given EVM-compat needs?
- Backpressure/retry posture for HCS submits under burst load.

## 8. Risks
- **R3/H3** association UX is the make-or-break adoption risk.
- Managed-wallet custody introduces a trust/liability surface (deliberate v1 trade-off; revisit for regulated tier → HashSphere).

Epics & stories: [`04-epics-user-stories.md`](04-epics-user-stories.md) · Metrics: [`05-metrics.md`](05-metrics.md)
