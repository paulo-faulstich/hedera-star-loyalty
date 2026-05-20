import {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
} from "@hashgraph/sdk";
import { buildClient, operatorKey, loadKey } from "../lib/client.js";
import { appendEnv } from "../lib/env.js";
import { hashscan } from "../lib/hashscan.js";

const client = buildClient();
const merchantKey = loadKey("MERCHANT_KEY");

async function main() {
  if (process.env.TOKEN_ID) {
    console.log(`Token already in .env — skipping. TOKEN_ID=${process.env.TOKEN_ID}`);
    return;
  }

  const DECIMALS = 6;
  const HUMAN_SUPPLY = 10_000;
  // HTS stores supply in smallest units (like wei) — 10,000 STAR @ 6 decimals = 10_000_000_000
  const INITIAL_SUPPLY = HUMAN_SUPPLY * 10 ** DECIMALS;

  const tx = new TokenCreateTransaction()
    .setTokenName("Star")
    .setTokenSymbol("STAR")
    .setTokenType(TokenType.FungibleCommon)
    // Finite + maxSupply = capped forever. With no supplyKey set, no one can mint more anyway, but this makes intent explicit.
    .setSupplyType(TokenSupplyType.Finite)
    .setMaxSupply(INITIAL_SUPPLY)
    .setDecimals(DECIMALS)
    .setInitialSupply(INITIAL_SUPPLY)
    .setTreasuryAccountId(process.env.MERCHANT_ID)
    // feeScheduleKey lets step 03 attach the 1% royalty via TokenFeeScheduleUpdate. Without this key at creation, fees would be immutable forever.
    .setFeeScheduleKey(operatorKey.publicKey)
    .freezeWith(client);

  // Treasury (merchant) must sign — supply lands in their account, so they authorize receipt. Operator still pays the network fee.
  const signed = await tx.sign(merchantKey);
  const submit = await signed.execute(client);
  const receipt = await submit.getReceipt(client);
  const tokenId = receipt.tokenId.toString();

  console.log(`✅ Token created: ${tokenId}`);
  console.log(`   ${HUMAN_SUPPLY.toLocaleString()} STAR → treasury ${process.env.MERCHANT_ID}`);
  console.log(`   tx: ${submit.transactionId.toString()}`);
  console.log(`   ${hashscan.token(tokenId)}`);

  appendEnv({ TOKEN_ID: tokenId }, "token created");
}

try {
  await main();
} catch (err) {
  console.error("❌ Error:", err.message);
  if (err.transactionId) {
    console.error("Transaction ID:", err.transactionId.toString());
  }
  process.exitCode = 1;
} finally {
  client.close();
}
