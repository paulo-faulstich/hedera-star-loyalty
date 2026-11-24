# Strategy memo: institutional tokenization is a product problem

> An outside-in product thesis, written in early June 2026 after building the prototype in this
> repository. It is opinionated on purpose. I have no inside knowledge of Hedera or Hashgraph
> and no affiliation with either. Where I use numbers they are assumptions, and the reasoning
> is the point. The [PM operating model](pm-operating-model/README.md) shows process depth on
> a small product. This memo is the other altitude: where a whole product area should focus.

## The read

The proof points for tokenization on Hedera already exist. Lloyds and Aberdeen used tokenized
money market funds and gilts as collateral for FX trades through Archax, and the Asset
Tokenization Studio supports both ERC-1400 and ERC-3643 for regulated issuance.

So the open question is no longer "can this network tokenize an asset". It is **"can a
regulated institution go from a working pilot to production without a services team holding
its hand"**.

## The thesis

Treat tokenization as a **product**, not a protocol feature. For the next cycle, stop adding
token primitives and obsess over the path from "the bank's pilot works" to "the bank's
compliance, operations and developers can run it themselves".

The bet: **institutional tokenization is won on productized compliance and developer
experience, not on throughput or one more asset standard.** That plays to what the protocol
already does well (fees enforced by consensus, consensus-timestamped audit, fair ordering) and
to where the buyer's real objection sits.

## Three bets

1. **Productize the pilot-to-production path.** The recurring failure in enterprise DLT is the
   heroic services engagement that never becomes self-serve. Take the two or three patterns
   that already work (RWA issuance, regulated stablecoin) and turn them into opinionated,
   documented, self-serve paths: SDKs, reference apps, compliance exports. Adoption then
   compounds without headcount.
2. **Make compliance a named product surface.** Consensus-timestamped audit is a real
   differentiator that today is a capability, not a feature. Ship audit, export and attestation
   as something a regulated buyer can see in a demo. The prototype in this repo is a small
   version of that argument: the audit trail is the reason to choose the platform.
3. **One roadmap across public and private.** Regulated issuers want a permissioned network
   with a path to public liquidity. Invest in the interop story and a single developer and
   data API across both, so the developer experience does not fork into two products.

## What I would not do

- **No new asset standards** unless a design-partner deal requires one. Standards
  proliferation is roadmap fragmentation in disguise.
- **No consumer or retail tokenization push** in the same cycle. It is a different buyer and
  it dilutes the institutional wedge.
- **No throughput or benchmark roadmap.** Institutional deals are not being lost on TPS.
  Optimizing the non-bottleneck feels productive and changes nothing.

## How I would measure it

- **North Star:** tokenized value in production. Not pilots and not headline TVL, but value
  that survived the gap between pilot and production.
- **Leading indicators:** design partners reaching production without a services engagement,
  time from pilot to production, usage of compliance exports, SDK and API adoption on the
  productized patterns.
- **Counter-metric:** services hours per production deployment. If it is not trending down,
  the growth is headcount, not product.

## What would make this wrong

- If adoption is gated by **liquidity and distribution** (exchanges, custodians) more than by
  product, this focus is one layer off and the priority should move to ecosystem and
  partnerships.
- If regulation forces bespoke work per jurisdiction, self-serve is premature and the services
  motion is the right one for longer.
- A private-first approach for regulated tiers could split engineering focus. I would want the
  interop cost quantified before committing to bet 3.

## How it lines up with what shipped (checked November 2026)

A dated thesis should be scored against reality. From public sources:

- HashSphere, the private permissioned network, reached general availability in May 2026.
- Hashgraph made Asseto generally available in June 2026: a tokenization platform that
  pre-builds custody, KYC/AML and compliance modules and runs on both Hedera and HashSphere.

Both landed around the time this memo was written, and both point the same way as bets 1 and
3. So read those two as agreement with the direction the company was already taking, not as
predictions. What stays open is the part I cannot see from outside: adoption numbers, whether
compliance became a named surface buyers ask for (bet 2), and whether the North Star moved.

## Where this view comes from

I build and run tokenized loyalty and wallet products, and I prototype on the SDK before
forming an opinion. The gap between a pilot that demos well and a product that operations and
compliance can run is the part of this work I know best, and it is the lens for everything above.
