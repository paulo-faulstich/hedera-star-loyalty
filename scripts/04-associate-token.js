import { TokenAssociateTransaction } from "@hashgraph/sdk";
import { buildClient, operatorKey, loadKey } from "../lib/client.js";
import { hashscan } from "../lib/hashscan.js";

const client = buildClient();
const tokenId = process.env.TOKEN_ID;

// Hedera requires every account to opt-in to receive an HTS token. This is the anti-spam mechanism —
// you can't just airdrop random tokens onto someone's account without their explicit association.
async function associate(accountId, accountKey, label) {
  try {
    const tx = new TokenAssociateTransaction()
      .setAccountId(accountId)
      .setTokenIds([tokenId])
      .freezeWith(client);

    // The account being associated must sign — Hedera enforces the opt-in at the protocol level.
    const signed = await tx.sign(accountKey);
    const submit = await signed.execute(client);
    await submit.getReceipt(client);

    console.log(`✅ ${label.padEnd(8)} associated with token ${tokenId}`);
    console.log(`   ${hashscan.account(accountId)}`);
  } catch (err) {
    if (err.status && err.status.toString() === "TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT") {
      console.log(`✅ ${label.padEnd(8)} already associated (idempotent)`);
    } else {
      throw err;
    }
  }
}

async function main() {
  if (!tokenId) throw new Error("TOKEN_ID missing — run mint-token first.");

  const customerKey = loadKey("CUSTOMER_KEY");

  await associate(process.env.CUSTOMER_ID, customerKey, "customer");
  // Operator needs association too — in step 05 it acts as the intermediate hop because
  // merchant (treasury + fee collector) is exempt from its own fractional fee.
  await associate(process.env.OPERATOR_ID, operatorKey, "operator");
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
