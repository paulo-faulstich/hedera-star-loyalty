import fs from "node:fs";
import path from "node:path";

// Clears token-dependent state from .env so the mint pipeline can be re-run cleanly.
// Does NOT touch accounts (operator/merchant/customer) or their keys.
const RESET_KEYS = ["TOKEN_ID", "CUSTOM_FEE_SET", "TRANSFER_TX_ID", "TOPIC_ID"];

const envPath = path.resolve(process.cwd(), ".env");
const content = fs.readFileSync(envPath, "utf8");
const lines = content.split("\n");

const kept = [];
const cleared = [];
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    kept.push(line);
    continue;
  }
  const key = trimmed.split("=")[0].trim();
  if (RESET_KEYS.includes(key)) {
    cleared.push(key);
  } else {
    kept.push(line);
  }
}

fs.writeFileSync(envPath, kept.join("\n"));

if (cleared.length) {
  console.log(`✅ Cleared from .env: ${cleared.join(", ")}`);
} else {
  console.log("Nothing to clear — .env already clean.");
}
console.log("\nNow re-run, in order:");
console.log("  npm run mint-token");
console.log("  npm run add-fee");
console.log("  npm run associate");
console.log("  npm run create-topic");
console.log("  npm run web    # use the dashboard to issue rewards");
