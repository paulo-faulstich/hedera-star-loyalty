# 01 · Problem Frame

## The problem
Merchant loyalty is a multi-billion-dollar habit built on fragmented, closed-loop points systems. Points are illiquid, non-portable, expensive to run, and opaque to the customer and to auditors. "Web3 loyalty" promised ownership and portability, but the dominant path — issuing an **ERC-20 + Solidity** loyalty token — carries real friction:

- **Contract risk & cost:** fee/reward logic lives in custom contract code → audit burden, exploit surface, gas costs that scale with usage.
- **Weak auditability:** proving "this reward was issued for this event at this time" requires bespoke indexing; timestamps are miner-influenced.
- **Compliance gap:** regulated merchants (banks, airlines, large retail) can't adopt something they can't audit cleanly or govern.

## Who has it (and how much it hurts)
| Persona | Pain | Severity |
|---|---|---|
| **Merchant admin** (issuer) | High eng cost to launch & maintain a token program; unpredictable fees; slow time-to-market | High |
| **Customer** (holder) | Points trapped in silos, no portability, no transparency on how value is calculated | Medium |
| **Compliance / auditor** | No clean, tamper-evident trail tying rewards to events; hard to satisfy regulators | High (and the unlock) |

## Why now
- Hedera offers **protocol-native tokenization (HTS)** with **custom fees enforced at the protocol level** and **low, predictable fixed fees** — removing the contract-risk and gas-volatility problems.
- **HCS** gives consensus-timestamped, immutable audit logs out of the box — the compliance unlock.
- Tokenization is moving from pilots into regulated markets (bank collateral, state-issued stablecoins, real-world assets). Loyalty is a low-stakes, high-volume wedge into that same buyer.

## The opportunity (one sentence)
Let merchants issue **audit-grade, low-cost loyalty tokens with protocol-native reward mechanics** — capturing the regulated/enterprise merchant that the ERC-20 path can't serve.

## What I explicitly chose NOT to solve (yet)
- Consumer wallet/custody UX at scale (assume a managed or embedded wallet for v1).
- Cross-merchant interoperability/exchange (later bet — see roadmap).
- Fiat on/off-ramps and tax treatment.

## Evidence & assumptions (flagged)
- **Evidence:** the prototype proves the mechanics work natively on Hedera testnet (mint + 1% royalty custom fee + transfer + HCS audit + mirror-node read).
- **Assumption (to validate):** regulated merchants weight *auditability + predictable cost* above raw token features. Validation plan in [`02-hypotheses.md`](02-hypotheses.md).
