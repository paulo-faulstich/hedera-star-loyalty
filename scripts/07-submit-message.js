import { TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import { buildClient } from "../lib/client.js";
import { hashscan } from "../lib/hashscan.js";

const client = buildClient();

async function main() {
  const topicId = process.env.TOPIC_ID;
  if (!topicId) throw new Error("TOPIC_ID missing — run create-topic first.");

  const payload = {
    event: "loyalty_transfer",
    from: process.env.OPERATOR_ID,
    to: process.env.CUSTOMER_ID,
    token: process.env.TOKEN_ID,
    amount_human: 100,
    fee_pct: 1,
    fee_collector: process.env.MERCHANT_ID,
    transfer_tx: process.env.TRANSFER_TX_ID,
    ts: new Date().toISOString(),
  };

  // Operator signs implicitly as client operator + matches the submitKey set in step 06.
  // HCS guarantees fair ordering via consensus timestamp — sequence numbers are monotonic per topic.
  const tx = await new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(JSON.stringify(payload))
    .execute(client);

  const receipt = await tx.getReceipt(client);

  console.log(`✅ Message submitted to topic ${topicId}`);
  console.log(`   sequence #: ${receipt.topicSequenceNumber.toString()}`);
  console.log(`   tx: ${tx.transactionId.toString()}`);
  console.log(`   ${hashscan.topic(topicId)}`);
  console.log(`\nPayload:`);
  console.log(JSON.stringify(payload, null, 2));
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
