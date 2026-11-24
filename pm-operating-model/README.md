# PM operating model: merchant loyalty tokenization on Hedera

The product thinking behind the [STAR loyalty prototype](../README.md). The prototype was built
first, on Hedera testnet. These documents were then written from what it demonstrated, so the
order is **prototype → evidence → spec**, not the other way around.

## Read order

| # | Document | What it answers |
|---|---|---|
| 01 | [Problem frame](01-problem-frame.md) | The problem, who has it, why now |
| 02 | [Hypotheses](02-hypotheses.md) | The bets, each with a kill criterion |
| 03 | [PRD](03-prd.md) | Goals, non-goals, users, requirements |
| 04 | [Epics & user stories](04-epics-user-stories.md) | The work as thin, demoable slices |
| 05 | [Metrics](05-metrics.md) | North Star, input metrics, guardrails |
| 06 | [Roadmap & prioritization](06-roadmap-prioritization.md) | Now / next / later and how it was sequenced |
| 07 | [Technical design note](07-tech-spec-hip.md) | The three load-bearing technical decisions |

## How the prototype fed this

The prototype answered the most important feasibility question: can loyalty mechanics (a
royalty fee and an immutable audit trail) be protocol-native, without the contract risk and gas
overhead of an ERC-20 approach? Building it surfaced product decisions that a document alone
would have missed, and they became first-class content here:

- **Token association is mandatory on Hedera.** A holder must opt in before receiving a token.
  That step became the top adoption risk (H3) and the first epic to build.
- **A receipt does not prove a fee was collected.** Only the transaction record carries
  `assessedCustomFees`. That is an implementation note in the design doc.
- **Key types have to be chosen per role.** ECDSA vs ED25519 is an explicit decision, not a default.

## The process, in one list

1. Frame the problem before the solution: who hurts, how much, why now.
2. Turn it into falsifiable hypotheses, each with a "we are wrong if".
3. Write a tight PRD. Non-goals matter as much as goals.
4. Slice into epics and thin stories with acceptance criteria co-owned with engineering.
5. De-risk with a prototype before committing a roadmap.
6. Define success up front: one North Star, a few inputs, and guardrails.
7. Sequence bets instead of listing features.
8. Co-author the technical design with engineering.

## Scope note

This is a study artifact that demonstrates process and judgment. It is not a shipped Hedera
product and has no affiliation with Hedera or Hashgraph. Market sizing, adoption numbers and
targets are assumptions and are flagged as such where they appear.
