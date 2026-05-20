import express from "express";
import {
  TransferTransaction,
  TopicMessageSubmitTransaction,
  AccountBalanceQuery,
} from "@hashgraph/sdk";
import { buildClient, loadKey } from "./lib/client.js";
import { hashscan } from "./lib/hashscan.js";

const DECIMALS = 6;
const PORT = Number(process.env.PORT) || 7373;

const cfg = {
  operator: process.env.OPERATOR_ID,
  merchant: process.env.MERCHANT_ID,
  customer: process.env.CUSTOMER_ID,
  tokenId: process.env.TOKEN_ID,
  topicId: process.env.TOPIC_ID,
  mirrorNode: "https://testnet.mirrornode.hedera.com",
};

const required = ["operator", "merchant", "customer", "tokenId", "topicId"];
const missing = required.filter((k) => !cfg[k]);
if (missing.length) {
  console.error(
    `❌ Missing in .env: ${missing.join(", ")}. Run the npm scripts in order first (mint-token, add-fee, etc).`
  );
  process.exit(1);
}

const client = buildClient();
const merchantKey = loadKey("MERCHANT_KEY");
const customerKey = loadKey("CUSTOMER_KEY");

function toUnits(human) {
  return Math.round(Number(human) * 10 ** DECIMALS);
}

function feeArray(record) {
  return (record.assessedCustomFees || []).map((f) => ({
    amount: f.amount.toString(),
    amount_human: Number(f.amount) / 10 ** DECIMALS,
    collector: f.feeCollectorAccountId.toString(),
    token: f.tokenId.toString(),
    effective_payers: (f.payerAccountIds || []).map((id) => id.toString()),
  }));
}

async function getTokenBalance(accountId) {
  const q = await new AccountBalanceQuery()
    .setAccountId(accountId)
    .execute(client);
  const tokens = q.tokens?._map || new Map();
  for (const [tokenId, balance] of tokens.entries()) {
    if (tokenId.toString() === cfg.tokenId) return BigInt(balance.toString());
  }
  return 0n;
}

async function topupOperatorIfNeeded(targetUnits) {
  const balance = await getTokenBalance(cfg.operator);
  if (balance >= BigInt(targetUnits)) return null;
  // Treasury-exempt transfer — pre-funds the operator pool without bleeding fees on the initial supply distribution
  const needed = Number(BigInt(targetUnits) - balance);
  const tx = await (
    await new TransferTransaction()
      .addTokenTransfer(cfg.tokenId, cfg.merchant, -needed)
      .addTokenTransfer(cfg.tokenId, cfg.operator, needed)
      .freezeWith(client)
      .sign(merchantKey)
  ).execute(client);
  await tx.getReceipt(client);
  return tx.transactionId.toString();
}

async function logToTopic(payload) {
  const tx = await new TopicMessageSubmitTransaction()
    .setTopicId(cfg.topicId)
    .setMessage(JSON.stringify(payload))
    .execute(client);
  await tx.getReceipt(client);
  return tx.transactionId.toString();
}

const app = express();
app.use(express.json());
app.use(express.static("web"));

app.get("/api/config", (req, res) => res.json(cfg));

app.post("/api/reward", async (req, res) => {
  try {
    const human = Number(req.body.amount) || 100;
    if (human <= 0) throw new Error("amount must be positive");
    const amount = toUnits(human);

    const topupTx = await topupOperatorIfNeeded(amount);

    // Operator → Customer. 1% fractional fee → merchant (assessed because neither party is exempt).
    const transferTx = await new TransferTransaction()
      .addTokenTransfer(cfg.tokenId, cfg.operator, -amount)
      .addTokenTransfer(cfg.tokenId, cfg.customer, amount)
      .execute(client);
    const record = await transferTx.getRecord(client);
    const fees = feeArray(record);

    const messageTx = await logToTopic({
      event: "reward",
      from: cfg.operator,
      to: cfg.customer,
      amount_human: human,
      token: cfg.tokenId,
      transfer_tx: transferTx.transactionId.toString(),
      assessed_fees: fees,
      ts: new Date().toISOString(),
    });

    res.json({
      ok: true,
      action: "reward",
      topupTx,
      transferTx: transferTx.transactionId.toString(),
      messageTx,
      assessedFees: fees,
      hashscan: hashscan.tx(transferTx.transactionId.toString()),
    });
  } catch (err) {
    console.error("/api/reward:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/redeem", async (req, res) => {
  try {
    const human = Number(req.body.amount) || 10;
    if (human <= 0) throw new Error("amount must be positive");
    const amount = toUnits(human);

    // Customer → Merchant. No fee is assessed: merchant is both treasury and fee collector, so they are exempt as receiver too.
    const transferTx = await (
      await new TransferTransaction()
        .addTokenTransfer(cfg.tokenId, cfg.customer, -amount)
        .addTokenTransfer(cfg.tokenId, cfg.merchant, amount)
        .freezeWith(client)
        .sign(customerKey)
    ).execute(client);
    const record = await transferTx.getRecord(client);
    const fees = feeArray(record);

    const messageTx = await logToTopic({
      event: "redeem",
      from: cfg.customer,
      to: cfg.merchant,
      amount_human: human,
      token: cfg.tokenId,
      transfer_tx: transferTx.transactionId.toString(),
      assessed_fees: fees,
      ts: new Date().toISOString(),
    });

    res.json({
      ok: true,
      action: "redeem",
      transferTx: transferTx.transactionId.toString(),
      messageTx,
      assessedFees: fees,
      hashscan: hashscan.tx(transferTx.transactionId.toString()),
    });
  } catch (err) {
    console.error("/api/redeem:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✨ Loyalty server: http://localhost:${PORT}`);
  console.log(`   token:  ${cfg.tokenId}`);
  console.log(`   topic:  ${cfg.topicId}`);
});
