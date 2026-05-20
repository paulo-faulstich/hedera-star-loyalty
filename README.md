# Hedera Star Loyalty

A working loyalty token prototype on the Hedera testnet — fungible **STAR** with a 1% on-chain royalty, every event logged to a Hedera Consensus Service audit topic, and a persona-driven dashboard (Brand / Member / Platform) to interact with it live.

https://github.com/user-attachments/assets/cbd723ff-b292-4036-a64a-e82653c36995

Built to explore `@hashgraph/sdk` first-hand. Not production code — but every behavior is a real protocol primitive, not a contract simulation.

## What it demonstrates

- **HTS (Hedera Token Service)** — native fungible token creation, no smart contract required
- **Custom fees as a protocol primitive** — `CustomFractionalFee` enforced by consensus, not by contract code
- **Capability-key model** — fine-grained governance (admin / supply / freeze / kyc / wipe / pause / feeScheduleKey)
- **Explicit token association** — opt-in receive (Hedera's anti-spam mechanism)
- **HCS (Hedera Consensus Service)** — append-only message log with consensus-ordered timestamps
- **Receipt vs Record** — when to use each, and how `assessedCustomFees` on the record proves on-chain fee collection
- **ECDSA (secp256k1) keys** — used throughout for EVM-address compatibility

## Prerequisites

- Node.js 18+ (the scripts use ES modules and top-level `await`)
- A funded Hedera **testnet** account from [portal.hedera.com](https://portal.hedera.com) (1000 free test HBAR)

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and fill in the operator credentials from [portal.hedera.com](https://portal.hedera.com). The rest of the variables (merchant / customer / token / topic IDs) are generated automatically by the scripts in subsequent steps and appended to `.env`.

> **Note:** The portal now defaults to ECDSA (secp256k1) keys for EVM interoperability. The code uses `PrivateKey.fromStringECDSA()` explicitly — never the generic `fromString()`, which can misdetect the key type and silently produce `INVALID_SIGNATURE` at execute time.

## Running

Each script does **one thing**, logs its result, and appends any new IDs to `.env` so subsequent scripts can pick them up. Scripts are idempotent — re-running a completed step is a no-op.

Run via npm scripts (recommended):

```bash
npm run connect           # sanity check: queries operator balance
npm run create-accounts   # creates merchant + customer accounts, funds each with 50 HBAR
npm run mint-token        # mints STAR (10,000 supply, 6 decimals, treasury = merchant)
npm run add-fee           # attaches 1% royalty fee to merchant
npm run associate         # opts customer in to receive STAR
npm run transfer          # transfers 100 STAR merchant → customer, verifies fee on record
npm run create-topic      # creates HCS audit-log topic
npm run submit-message    # submits loyalty-event JSON to the topic
npm run summary           # prints HashScan testnet URLs for all created resources
npm run reset-token       # clears token-dependent state from .env so you can re-mint
npm run web               # starts the interactive dashboard at http://localhost:7373
```

Or directly: `node scripts/01-create-accounts.js`.

## Web dashboard

After running the scripts through `submit-message` at least once (so the token and topic exist):

```bash
npm run web
```

Open `http://localhost:7373`. The dashboard has two interactive actions plus a live view:

- **Reward customer** — operator → customer transfer. The 1% fractional fee is assessed and routed to merchant (neither party is exempt). Topup from merchant happens automatically if the operator pool is empty.
- **Customer redeems** — customer → merchant transfer. **No fee is assessed**: merchant is both treasury and fee collector, so the receiver-side exemption applies. This is the counterpart that demonstrates the exemption rule.
- Each action also submits a structured JSON event to the HCS topic, so the audit log updates live.

The view below the actions pulls from the public **Hedera Mirror Node REST API**:

- Token metadata + custom-fee schedule from `/api/v1/tokens/:id`
- Account balances (HBAR + STAR) from `/api/v1/accounts/:id`
- Recent transfers with `assessed_custom_fees` from `/api/v1/transactions/:id` (the list endpoint omits it — only the detail endpoint includes the field)
- HCS messages from `/api/v1/topics/:id/messages`, base64-decoded to JSON

Architecture: the browser has no private keys. It only POSTs amounts to the local Node server, which holds the keys and signs/submits transactions. Read paths bypass the server entirely and hit the public mirror node — same separation of concerns as a real loyalty backend.

## Project layout

```
.
├── .env.example               # template — copy to .env and fill in operator credentials
├── package.json
├── README.md
│
├── lib/                       # shared helpers (used by scripts and web app)
│   ├── client.js              # buildClient() — testnet client + operator key loading
│   ├── env.js                 # appendEnv() — idempotent .env updates
│   └── hashscan.js            # HashScan URL builders, mirror node base URL
│
├── scripts/                   # CLI demos, one logical step per file
│   ├── 00-test-connection.js
│   ├── 01-create-accounts.js
│   ├── 02-mint-token.js
│   ├── 03-add-custom-fee.js
│   ├── 04-associate-token.js
│   ├── 05-transfer.js
│   ├── 06-create-topic.js
│   ├── 07-submit-message.js
│   ├── 97-reset-token-state.js
│   └── 99-summary.js
│
├── server.js                  # Node/Express: serves web/ and exposes /api/reward and /api/redeem
│
└── web/                       # interactive dashboard; reads from mirror node, writes via /api
    ├── index.html
    ├── app.js
    └── style.css
```

## Conventions

- **One script per logical step** — easier to read and walk through than a single monolith
- **ES modules** with top-level `await`
- **No smart contracts, no frontend, no tests** — out of scope for a prototype
- **Comments only where Hedera behavior is non-obvious** — e.g., why the treasury must sign a token creation, or why the receipt is insufficient to verify a custom fee was collected
- **Testnet only** — never mainnet

## Why HTS instead of an ERC-20 contract?

| Concern | ERC-20 (Solidity) | HTS (this project) |
|---|---|---|
| Token creation | Deploy a contract | Single transaction, no bytecode |
| Custom transfer fees | Override `transfer()` / `_update()` | Native `CustomFractionalFee`, enforced by consensus |
| Governance roles | Diffused in contract code, often a single `owner` | Seven distinct optional keys, each potentially a different signer or multisig |
| Pausing | Only if the dev wrote `pause()` | Native `pauseKey` if set at creation |
| Cost predictability | Variable gas | Fixed USD-denominated fees |
| Mutability of capabilities | Whatever the contract allows | Decided at creation; unset keys are permanently absent |

The HTS model trades flexibility (you can't add arbitrary logic) for **predictability and explicit governance up-front**.

## Resources

- [Hedera SDK reference](https://docs.hedera.com/hedera/sdks-and-apis/sdks)
- [HashScan testnet explorer](https://hashscan.io/testnet)
- [Hedera portal (testnet account)](https://portal.hedera.com)
