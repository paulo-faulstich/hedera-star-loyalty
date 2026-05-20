import { AccountBalanceQuery } from "@hashgraph/sdk";
import { buildClient } from "../lib/client.js";

const client = buildClient();

try {
  const balance = await new AccountBalanceQuery()
    .setAccountId(process.env.OPERATOR_ID)
    .execute(client);

  console.log(`✅ Connected to Hedera testnet`);
  console.log(`   Account: ${process.env.OPERATOR_ID}`);
  console.log(`   Balance: ${balance.hbars.toString()}`);
} finally {
  client.close();
}
