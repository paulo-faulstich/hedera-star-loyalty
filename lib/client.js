import { Client, PrivateKey } from "@hashgraph/sdk";
import dotenv from "dotenv";

dotenv.config();

// Always use fromStringECDSA — the generic fromString() can misdetect the key type and silently produce INVALID_SIGNATURE at execute time.
export const operatorKey = PrivateKey.fromStringECDSA(process.env.OPERATOR_KEY);

export function buildClient() {
  return Client.forTestnet().setOperator(process.env.OPERATOR_ID, operatorKey);
}

export function loadKey(envVar) {
  const value = process.env[envVar];
  if (!value) throw new Error(`Missing env var: ${envVar}`);
  return PrivateKey.fromStringECDSA(value);
}
