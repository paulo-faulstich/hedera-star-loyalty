import { TopicCreateTransaction } from "@hashgraph/sdk";
import { buildClient, operatorKey } from "../lib/client.js";
import { appendEnv } from "../lib/env.js";
import { hashscan } from "../lib/hashscan.js";

const client = buildClient();

async function main() {
  if (process.env.TOPIC_ID) {
    console.log(`Topic already in .env — skipping. TOPIC_ID=${process.env.TOPIC_ID}`);
    return;
  }

  // submitKey restricts who can post messages. Without it, the topic is public-write.
  // For a controlled audit log we want only the operator (i.e. our backend) to submit events.
  const tx = await new TopicCreateTransaction()
    .setTopicMemo("STAR loyalty audit log")
    .setSubmitKey(operatorKey.publicKey)
    .execute(client);

  const receipt = await tx.getReceipt(client);
  const topicId = receipt.topicId.toString();

  console.log(`✅ Topic created: ${topicId}`);
  console.log(`   tx: ${tx.transactionId.toString()}`);
  console.log(`   ${hashscan.topic(topicId)}`);

  appendEnv({ TOPIC_ID: topicId }, "topic created");
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
