# 02 · Hypotheses

Each hypothesis is written to be **falsifiable** — with a leading signal and a kill criterion, so we know early if we're wrong.

## H1 — Value (the core bet)
**We believe** regulated/enterprise merchants will choose a loyalty token that is *audit-grade and predictably priced* over a feature-rich ERC-20 token.
**We'll believe it if** in discovery, ≥ 6 of 10 target merchants rank "tamper-evident audit trail + predictable cost" above "token programmability."
**We're wrong if** they consistently prioritize custom on-chain logic / DeFi composability — then the ERC-20 path wins and our wedge is weaker.

## H2 — Feasibility (de-risked by the prototype ✅)
**We believe** we can deliver royalty mechanics + immutable audit *without* custom contract code.
**Status:** validated on testnet — HTS `CustomFractionalFee` enforces the 1% royalty at the protocol level; HCS provides the consensus-timestamped audit log. No Solidity, no gas-volatility, no contract audit surface.

## H3 — Adoption friction (the UX risk)
**We believe** the **mandatory token-association** step (Hedera requires a holder to associate a token before receiving it — unlike Ethereum) is the biggest onboarding drop-off.
**We'll believe it if** association completion rate < 80% in a usability test.
**Mitigation to test:** abstract association behind the merchant's onboarding flow (auto-associate via a relayer / sponsored transaction) so the customer never sees it.

## H4 — Economics
**We believe** protocol-native fixed fees make program cost predictable enough for merchants to model margins up front.
**We'll believe it if** cost-per-1000-transfers stays within a ±10% band across load tests, vs the gas-driven variance merchants see on ERC-20.

## How these map to what we build
- H2 is **done** → we can commit roadmap.
- H1 is **discovery** → gates whether we invest beyond MVP.
- H3 is the **top product risk** → it's the headline epic in the PRD.
- H4 is a **proof point for sales/compliance** → instrument it in metrics.

See [`03-prd.md`](03-prd.md).
