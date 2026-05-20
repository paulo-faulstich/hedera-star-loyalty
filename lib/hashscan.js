const BASE = "https://hashscan.io/testnet";

export const hashscan = {
  account: (id) => `${BASE}/account/${id}`,
  token: (id) => `${BASE}/token/${id}`,
  topic: (id) => `${BASE}/topic/${id}`,
  tx: (txId) => `${BASE}/transaction/${encodeURIComponent(txId)}`,
};

export const MIRROR_NODE = "https://testnet.mirrornode.hedera.com";
