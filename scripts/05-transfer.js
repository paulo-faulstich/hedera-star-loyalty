import { TransferTransaction } from "@hashgraph/sdk";
import { buildClient, loadKey } from "../lib/client.js";
import { appendEnv } from "../lib/env.js";
import { hashscan } from "../lib/hashscan.js";

const client = buildClient();

async function main() {
  if (process.env.TRANSFER_TX_ID) {
    console.log(`Transfer already done — skipping. TX=${process.env.TRANSFER_TX_ID}`);
    return;
  }

  const tokenId = process.env.TOKEN_ID;
  if (!tokenId) throw new Error("TOKEN_ID missing.");

  const merchantId = process.env.MERCHANT_ID;
  const customerId = process.env.CUSTOMER_ID;
  const operatorId = process.env.OPERATOR_ID;
  const merchantKey = loadKey("MERCHANT_KEY");

  const DECIMALS = 6;
  const AMOUNT_HUMAN = 100;
  const AMOUNT = AMOUNT_HUMAN * 10 ** DECIMALS;

  // --- Hop 1: merchant (treasury) → operator. No fee assessed — treasury is auto-exempt.
  // This mirrors the "initial supply distribution" pattern: the treasury fans out tokens to platform accounts without bleeding fees.
  console.log("Hop 1: merchant (treasury) → operator");
  const hop1 = await (
    await new TransferTransaction()
      .addTokenTransfer(tokenId, merchantId, -AMOUNT)
      .addTokenTransfer(tokenId, operatorId, AMOUNT)
      .freezeWith(client)
      .sign(merchantKey)
  ).execute(client);

  const hop1Record = await hop1.getRecord(client);
  console.log(`   tx:  ${hop1.transactionId.toString()}`);
  console.log(
    `   assessedCustomFees: ${
      hop1Record.assessedCustomFees.length === 0
        ? "[] — treasury exempt, as expected"
        : JSON.stringify(hop1Record.assessedCustomFees)
    }`
  );

  // --- Hop 2: operator → customer. Fee IS assessed because operator is neither treasury nor fee collector.
  // Use getRecord (not getReceipt) to read assessedCustomFees from the consensus result — receipt would not surface them.
  console.log("\nHop 2: operator → customer (fee triggers)");
  const hop2 = await new TransferTransaction()
    .addTokenTransfer(tokenId, operatorId, -AMOUNT)
    .addTokenTransfer(tokenId, customerId, AMOUNT)
    .execute(client);

  const hop2Record = await hop2.getRecord(client);
  console.log(`   tx:  ${hop2.transactionId.toString()}`);
  console.log(`   assessedCustomFees:`);
  for (const af of hop2Record.assessedCustomFees) {
    const human = (Number(af.amount) / 10 ** DECIMALS).toFixed(DECIMALS);
    console.log(
      `     ${af.amount.toString()} units (${human} STAR) of token ${af.tokenId} → ${af.feeCollectorAccountId}`
    );
  }
  console.log(`   ${hashscan.tx(hop2.transactionId.toString())}`);

  appendEnv({ TRANSFER_TX_ID: hop2.transactionId.toString() }, "transfer done");
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
