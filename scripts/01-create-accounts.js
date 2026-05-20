import { PrivateKey, AccountCreateTransaction, Hbar } from "@hashgraph/sdk";
import { buildClient } from "../lib/client.js";
import { appendEnv } from "../lib/env.js";
import { hashscan } from "../lib/hashscan.js";

const client = buildClient();

async function createAccount(label) {
  // ECDSA (secp256k1) to match the operator — enables EVM-address aliasing on the account
  const privateKey = PrivateKey.generateECDSA();

  const txResponse = await new AccountCreateTransaction()
    .setKey(privateKey.publicKey)
    .setInitialBalance(new Hbar(50))
    .execute(client);

  // Receipt is enough — we only need the new account ID. Record would include transfers/fees but costs more.
  const receipt = await txResponse.getReceipt(client);
  const accountId = receipt.accountId.toString();

  console.log(`✅ ${label.padEnd(8)} → ${accountId}`);
  console.log(`   ${hashscan.account(accountId)}`);
  return { accountId, privateKey: privateKey.toStringRaw() };
}

async function main() {
  // Idempotent: re-running should not create new accounts and burn HBAR
  if (process.env.MERCHANT_ID && process.env.CUSTOMER_ID) {
    console.log("Accounts already in .env — skipping creation.");
    console.log(`MERCHANT_ID=${process.env.MERCHANT_ID}`);
    console.log(`CUSTOMER_ID=${process.env.CUSTOMER_ID}`);
    return;
  }

  const merchant = await createAccount("merchant");
  const customer = await createAccount("customer");

  appendEnv(
    {
      MERCHANT_ID: merchant.accountId,
      MERCHANT_KEY: merchant.privateKey,
      CUSTOMER_ID: customer.accountId,
      CUSTOMER_KEY: customer.privateKey,
    },
    "accounts created"
  );

  console.log("\n📝 IDs + keys appended to .env");
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
