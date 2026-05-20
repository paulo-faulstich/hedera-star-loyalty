import fs from "node:fs";
import path from "node:path";

const ENV_PATH = path.resolve(process.cwd(), ".env");

export function appendEnv(entries, comment) {
  const lines = Object.entries(entries)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const header = comment
    ? `\n# ${comment} ${new Date().toISOString()}\n`
    : "\n";
  fs.appendFileSync(ENV_PATH, `${header}${lines}\n`);
}
