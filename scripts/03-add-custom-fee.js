import {
  TokenFeeScheduleUpdateTransaction,
  CustomFractionalFee,
  FeeAssessmentMethod,
} from "@hashgraph/sdk";
import { buildClient, operatorKey } from "../lib/client.js";
import { appendEnv } from "../lib/env.js";
import { hashscan } from "../lib/hashscan.js";

const client = buildClient();

async function main() {
  if (process.env.CUSTOM_FEE_SET) {
    console.log("Custom fee already set — skipping.");
    return;
  }
  const tokenId = process.env.TOKEN_ID;
  if (!tokenId) throw new Error("TOKEN_ID missing — run mint-token first.");

  // 1/100 = 1% of every transfer. Inclusive = fee comes OUT of the transferred amount (receiver gets less).
  // Exclusive would charge the sender on top. Inclusive matches real-world merchant card fees.
  const fee = new CustomFractionalFee()
    .setNumerator(1)
    .setDenominator(100)
    .setFeeCollectorAccountId(process.env.MERCHANT_ID)
    .setAssessmentMethod(FeeAssessmentMethod.Inclusive);

  const tx = new TokenFeeScheduleUpdateTransaction()
    .setTokenId(tokenId)
    .setCustomFees([fee])
    .freezeWith(client);

  // Signed by the feeScheduleKey holder (operator). Without that key set at token creation, fees would be immutable.
  const signed = await tx.sign(operatorKey);
  const submit = await signed.execute(client);
  await submit.getReceipt(client);

  console.log(`✅ 1% royalty fee → merchant ${process.env.MERCHANT_ID}`);
  console.log(`   tx: ${submit.transactionId.toString()}`);
  console.log(`   ${hashscan.token(tokenId)}`);
  console.log(
    `\n⚠️  Note: merchant is BOTH treasury and fee collector, so transfers FROM merchant won't trigger the fee (double exemption: HIP-573 + treasury rule). Step 05 handles this with a two-hop transfer through operator.`
  );

  appendEnv({ CUSTOM_FEE_SET: "1" }, "custom fee added");
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
