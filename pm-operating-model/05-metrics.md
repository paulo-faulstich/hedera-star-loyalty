# 05 · Success Metrics

Defined *before* building, so we can tell winning from shipping.

## North Star
**Monthly Active Redeemers (MAR)** — unique customers who *redeem* loyalty value in a 30-day window.

Why redemption, not earning/minting: redemption is where the customer feels real value and the merchant sees real engagement. Minting is a vanity number — you can mint a billion tokens nobody uses. MAR forces the whole loop (earn → hold → redeem) to actually work.

## Input metrics (the levers that move MAR)
| Metric | Why it matters | Hypothesis |
|---|---|---|
| **Merchant time-to-first-token** | Issuance friction (Epic A) | — |
| **Association completion rate** | The make-or-break onboarding step (Epic B/H3) | H3 |
| **Transfer/redeem success rate** | Core-loop reliability | H3 |
| **Earn → first-redeem conversion** | Does earning lead to value realized? | H1 |
| **Audit-export usage by compliance** | Is the *real* buying reason being used? | H1 |

## Guardrails (don't win the metric and lose the user/business)
- **Failed-transaction rate** < 1% (a forced redeem loop can inflate MAR while burning trust).
- **Cost per 1,000 transfers** within a ±10% band (H4 — the predictability promise).
- **Support tickets per 100 active customers** flat or down (proxy for hidden UX pain, esp. association).

## Counter-metric
Watch **minted-but-never-redeemed supply**. If it balloons while MAR is flat, we're shipping issuance, not engagement — and the thesis is failing.

## Targets (illustrative — flagged as assumptions for a controlled pilot)
- Association completion ≥ 95%
- Earn → first-redeem ≥ 40% within 30 days
- Merchant time-to-first-token < 1 day

Roadmap & sequencing: [`06-roadmap-prioritization.md`](06-roadmap-prioritization.md)
