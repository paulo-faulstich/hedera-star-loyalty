# 04 · Epics & User Stories

Sliced thin and vertically — each story is independently demoable. Acceptance criteria are co-owned with engineering (the PM doesn't toss them over the wall).

## Epic A — Merchant issuance ("launch a token without code")
> Outcome: a merchant goes from zero to a live loyalty token + reward rule in one guided flow. *(R1, R2, R8)*

- **A1** — *As a merchant admin, I can create a branded loyalty token (name, symbol, decimals, supply) so I can run my program.*
  - AC: token created on Hedera with treasury = merchant; token ID + HashScan link shown; idempotent (re-running doesn't double-mint).
- **A2** — *As a merchant admin, I can set a royalty reward rule (e.g., 1%) without writing code so finance can model it.*
  - AC: `CustomFractionalFee` applied via fee schedule; fee visible on-chain; change requires the fee-schedule key.
- **A3** — *As a merchant admin, I can complete setup in a guided flow so I don't need blockchain knowledge.*
  - AC: no raw keys/IDs exposed; each step has a plain-language summary and a reversible review.

## Epic B — Customer earn & redeem ("no blockchain in sight") — **top-risk epic (H3)**
> Outcome: a customer earns and redeems with zero crypto concepts. *(R3, R4)*

- **B1** — *As a customer, I'm auto-onboarded to receive tokens so I never see "token association."*
  - AC: association happens via sponsored/delegated tx behind the flow; customer sees only "you're set up"; **association completion ≥ 95%** in test.
- **B2** — *As a customer, I receive rewards automatically after a qualifying event so earning feels effortless.*
  - AC: transfer succeeds; balance updates in-product within N seconds (Mirror Node read); failure shows a human message + retry.
- **B3** — *As a customer, I can redeem tokens so the value is real.*
  - AC: redemption transfer + corresponding audit event; balance + history reflect it.

## Epic C — Audit & compliance ("prove it without trusting us")
> Outcome: an auditor can independently verify any reward/redemption. *(R5, R6, R7)*

- **C1** — *As the system, I write a structured HCS audit event per reward/redemption so there's a tamper-evident trail.*
  - AC: `{event, from, to, amount, ts}` submitted to the loyalty audit topic; consensus timestamp present.
- **C2** — *As a compliance user, I can export the audit trail for a date range so I can satisfy a regulator.*
  - AC: export reconciles 1:1 with on-chain transfers; timestamps are consensus (not server) time.
- **C3** — *As a customer/auditor, I can view balances and history read-only from the Mirror Node so I don't trust the merchant DB.*
  - AC: views render purely from Mirror Node REST; no keys client-side.

## Slicing rationale
- **B1 is the riskiest story → built first** behind a flag, because H3 (association friction) decides the whole adoption thesis. De-risk the scariest thing early.
- A and C can progress in parallel; C2/C3 trail because they're the *should/could* that sales needs, not what proves the core loop.
