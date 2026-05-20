import "../lib/client.js"; // side-effect: loads dotenv
import { hashscan } from "../lib/hashscan.js";

const rows = [
  ["Operator", process.env.OPERATOR_ID, hashscan.account(process.env.OPERATOR_ID)],
  ["Merchant", process.env.MERCHANT_ID, hashscan.account(process.env.MERCHANT_ID)],
  ["Customer", process.env.CUSTOMER_ID, hashscan.account(process.env.CUSTOMER_ID)],
  ["Token (STAR)", process.env.TOKEN_ID, hashscan.token(process.env.TOKEN_ID)],
  ["HCS Topic", process.env.TOPIC_ID, hashscan.topic(process.env.TOPIC_ID)],
  ["Transfer tx (fee'd)", process.env.TRANSFER_TX_ID, process.env.TRANSFER_TX_ID && hashscan.tx(process.env.TRANSFER_TX_ID)],
];

console.log("\n✨ Star loyalty prototype — testnet summary\n");
console.log("─".repeat(78));
for (const [label, id, url] of rows) {
  if (!id) continue;
  console.log(`${label.padEnd(20)} ${id}`);
  console.log(`${" ".repeat(20)} ${url}\n`);
}
console.log("─".repeat(78));
console.log("Mirror node base: https://testnet.mirrornode.hedera.com/api/v1");
