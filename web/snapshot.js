// Read-only snapshot of the real testnet state (mirror node, 27 Nov 2026).
// Used when the page is opened without the Node server, or with ?snapshot.
window.SNAPSHOT = {
  takenAt: "27 Nov 2026",
  cfg: {
    operator: "0.0.9004631",
    merchant: "0.0.9014796",
    customer: "0.0.9014799",
    tokenId: "0.0.9015462",
    topicId: "0.0.9015468",
    mirrorNode: "https://testnet.mirrornode.hedera.com",
  },
  token: {
    name: "Star",
    symbol: "STAR",
    decimals: "6",
    total_supply: "10000000000",
    type: "FUNGIBLE_COMMON",
    supply_type: "FINITE",
    treasury_account_id: "0.0.9014796",
    custom_fees: {
      fractional_fees: [
        { amount: { numerator: 1, denominator: 100 }, collector_account_id: "0.0.9014796", net_of_transfers: false },
      ],
    },
  },
  accounts: {
    operator: { balance: { balance: 87341379566, tokens: [{ token_id: "0.0.9015462", balance: 0 }] } },
    merchant: { balance: { balance: 5000000000, tokens: [{ token_id: "0.0.9015462", balance: 9988220000 }] } },
    customer: { balance: { balance: 5000000000, tokens: [{ token_id: "0.0.9015462", balance: 11780000 }] } },
  },
  transfers: [
    { consensus_timestamp: "1779314106.446472687", token_transfers: [{ token_id: "0.0.9015462", account: "0.0.9014796", amount: 7000000 }, { token_id: "0.0.9015462", account: "0.0.9014799", amount: -7000000 }], assessed_custom_fees: [] },
    { consensus_timestamp: "1779314027.833773000", token_transfers: [{ token_id: "0.0.9015462", account: "0.0.9004631", amount: -15000000 }, { token_id: "0.0.9015462", account: "0.0.9014796", amount: 150000 }, { token_id: "0.0.9015462", account: "0.0.9014799", amount: 14850000 }], assessed_custom_fees: [{ amount: 150000, collector_account_id: "0.0.9014796", token_id: "0.0.9015462", effective_payer_account_ids: ["0.0.9014799"] }] },
    { consensus_timestamp: "1779309963.991560464", token_transfers: [{ token_id: "0.0.9015462", account: "0.0.9014796", amount: 3000000 }, { token_id: "0.0.9015462", account: "0.0.9014799", amount: -3000000 }], assessed_custom_fees: [] },
    { consensus_timestamp: "1779309939.660652288", token_transfers: [{ token_id: "0.0.9015462", account: "0.0.9004631", amount: -5000000 }, { token_id: "0.0.9015462", account: "0.0.9014796", amount: 50000 }, { token_id: "0.0.9015462", account: "0.0.9014799", amount: 4950000 }], assessed_custom_fees: [{ amount: 50000, collector_account_id: "0.0.9014796", token_id: "0.0.9015462", effective_payer_account_ids: ["0.0.9014799"] }] },
    { consensus_timestamp: "1779308347.309217000", token_transfers: [{ token_id: "0.0.9015462", account: "0.0.9004631", amount: -2000000 }, { token_id: "0.0.9015462", account: "0.0.9014796", amount: 20000 }, { token_id: "0.0.9015462", account: "0.0.9014799", amount: 1980000 }], assessed_custom_fees: [{ amount: 20000, collector_account_id: "0.0.9014796", token_id: "0.0.9015462", effective_payer_account_ids: ["0.0.9014799"] }] },
  ],
  events: [
    { sequence_number: 5, consensus_timestamp: "1779314108.493150395", payload: { event: "redeem", from: "0.0.9014799", to: "0.0.9014796", amount_human: 7, token: "0.0.9015462", transfer_tx: "0.0.9004631@1779314098.158442761", assessed_fees: [], ts: "2026-05-20T21:55:08.168Z" } },
    { sequence_number: 4, consensus_timestamp: "1779314030.608808126", payload: { event: "reward", from: "0.0.9004631", to: "0.0.9014799", amount_human: 15, token: "0.0.9015462", transfer_tx: "0.0.9004631@1779314020.434932184", assessed_fees: [{ amount: "150000", amount_human: 0.15, collector: "0.0.9014796", token: "0.0.9015462", effective_payers: ["0.0.9014799"] }], ts: "2026-05-20T21:53:50.166Z" } },
    { sequence_number: 3, consensus_timestamp: "1779309966.271705925", payload: { event: "redeem", from: "0.0.9014799", to: "0.0.9014796", amount_human: 3, token: "0.0.9015462", transfer_tx: "0.0.9004631@1779309959.636626111", assessed_fees: [], ts: "2026-05-20T20:46:05.972Z" } },
    { sequence_number: 2, consensus_timestamp: "1779309941.888398000", payload: { event: "reward", from: "0.0.9004631", to: "0.0.9014799", amount_human: 5, token: "0.0.9015462", transfer_tx: "0.0.9004631@1779309935.551725304", assessed_fees: [{ amount: "50000", amount_human: 0.05, collector: "0.0.9014796", token: "0.0.9015462", effective_payers: ["0.0.9014799"] }], ts: "2026-05-20T20:45:41.642Z" } },
    { sequence_number: 1, consensus_timestamp: "1779308349.644775806", payload: { event: "reward", from: "0.0.9004631", to: "0.0.9014799", amount_human: 2, token: "0.0.9015462", transfer_tx: "0.0.9004631@1779308341.011885042", assessed_fees: [{ amount: "20000", amount_human: 0.02, collector: "0.0.9014796", token: "0.0.9015462", effective_payers: ["0.0.9014799"] }], ts: "2026-05-20T20:19:09.340Z" } },
  ],
};
