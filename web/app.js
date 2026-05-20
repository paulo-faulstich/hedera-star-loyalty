// ---------- state + config ----------
let cfg;
let API;
const state = {
  token: null,
  accounts: {}, // operator | merchant | customer -> account info
  transfers: [], // detail-endpoint transactions (have assessed_custom_fees)
  messages: [], // raw HCS messages
};

const VIEWS = ["home", "brand", "member", "platform"];
const DEFAULT_VIEW = "home";

// ---------- helpers ----------
async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `${res.status} ${res.statusText}`);
  }
  return data;
}

function fmtUnits(raw, decimals = 6) {
  const n = BigInt(raw);
  const div = 10n ** BigInt(decimals);
  const whole = n / div;
  const frac = (n % div).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

function fmtHbar(tinybar) {
  return `${(Number(tinybar) / 1e8).toFixed(4)} ℏ`;
}

function fmtTs(consensusTs) {
  return new Date(parseFloat(consensusTs) * 1000)
    .toISOString()
    .replace("T", " ")
    .replace("Z", "");
}

function fmtRelativeTs(consensusTs) {
  const date = new Date(parseFloat(consensusTs) * 1000);
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return date.toLocaleString();
}

function tokenBalanceOf(account) {
  const t = (account?.balance?.tokens || []).find(
    (x) => x.token_id === cfg.tokenId
  );
  return t ? fmtUnits(t.balance, 6) : "0";
}

function decodeMessage(m) {
  try {
    return JSON.parse(atob(m.message));
  } catch {
    return null;
  }
}

// ---------- data fetch ----------
async function fetchAll() {
  setStatus("Refreshing…");

  const [token, opAcc, mrAcc, cstAcc, transferList, messages] =
    await Promise.all([
      getJSON(`${API}/tokens/${cfg.tokenId}`),
      getJSON(`${API}/accounts/${cfg.operator}`),
      getJSON(`${API}/accounts/${cfg.merchant}`),
      getJSON(`${API}/accounts/${cfg.customer}`),
      getJSON(
        `${API}/transactions?account.id=${cfg.customer}&transactiontype=cryptotransfer&limit=20&order=desc`
      ),
      getJSON(`${API}/topics/${cfg.topicId}/messages?limit=50&order=desc`),
    ]);

  // detail endpoint is required to read assessed_custom_fees
  const transfers = transferList.transactions?.length
    ? await Promise.all(
        transferList.transactions.map((tx) =>
          getJSON(`${API}/transactions/${tx.transaction_id}`).then(
            (d) => d.transactions[0]
          )
        )
      )
    : [];

  state.token = token;
  state.accounts = { operator: opAcc, merchant: mrAcc, customer: cstAcc };
  state.transfers = transfers;
  state.messages = messages.messages || [];

  setStatus(`Updated ${new Date().toLocaleTimeString()}`);
}

// ---------- derived metrics ----------
function totalRoyaltyEarnedUnits() {
  let total = 0n;
  for (const tx of state.transfers) {
    for (const fee of tx.assessed_custom_fees || []) {
      if (
        fee.collector_account_id === cfg.merchant &&
        fee.token_id === cfg.tokenId
      ) {
        total += BigInt(fee.amount);
      }
    }
  }
  return total;
}

function rewardStats() {
  const rewards = state.messages
    .map(decodeMessage)
    .filter((p) => p?.event === "reward");
  const totalAmount = rewards.reduce(
    (sum, p) => sum + (Number(p.amount_human) || 0),
    0
  );
  return { count: rewards.length, totalAmount };
}

// ---------- brand view ----------
function renderBrand() {
  renderBrandKpis();
  renderBrandCustomers();
  renderBrandActivity();
}

function renderBrandKpis() {
  const royalty = fmtUnits(totalRoyaltyEarnedUnits().toString(), 6);
  const { count, totalAmount } = rewardStats();
  const supplyHuman = fmtUnits(state.token.total_supply, parseInt(state.token.decimals));
  const treasuryBalance = tokenBalanceOf(state.accounts.merchant);

  document.getElementById("brand-kpis").innerHTML = `
    <div class="kpi">
      <div class="kpi-label">Royalty earned</div>
      <div class="kpi-value">${royalty} <span class="kpi-unit">${state.token.symbol}</span></div>
      <div class="kpi-hint">from 1% fee on third-party transfers</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Rewards issued</div>
      <div class="kpi-value">${totalAmount} <span class="kpi-unit">${state.token.symbol}</span></div>
      <div class="kpi-hint">${count} reward${count === 1 ? "" : "s"} so far</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Treasury balance</div>
      <div class="kpi-value">${treasuryBalance} <span class="kpi-unit">${state.token.symbol}</span></div>
      <div class="kpi-hint">of ${supplyHuman} total supply</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Token</div>
      <div class="kpi-value kpi-value-sm">${state.token.symbol}</div>
      <div class="kpi-hint">${cfg.tokenId} · <a href="#platform">schema</a></div>
    </div>
  `;
}

function renderBrandCustomers() {
  // Just one customer in this prototype, but the layout supports more
  const acc = state.accounts.customer;
  const balance = tokenBalanceOf(acc);
  const customerMsgs = state.messages
    .map(decodeMessage)
    .filter((p) => p && (p.to === cfg.customer || p.from === cfg.customer));
  const lastSeen = customerMsgs.length
    ? fmtRelativeTs(state.messages[0].consensus_timestamp)
    : "—";

  document.getElementById("brand-customers").innerHTML = `
    <div class="customer-row">
      <div>
        <div class="customer-name">Customer ${cfg.customer}</div>
        <div class="muted small">Last activity: ${lastSeen}</div>
      </div>
      <div class="customer-balance">
        <div class="balance-num">${balance}</div>
        <div class="muted small">${state.token.symbol}</div>
      </div>
    </div>
    <p class="muted small" style="margin-top:1rem">
      A real implementation would index customers by token association. For now,
      only the customer account from .env is wired.
    </p>
  `;
}

function renderBrandActivity() {
  const events = state.messages.map((m) => ({
    seq: m.sequence_number,
    ts: m.consensus_timestamp,
    payload: decodeMessage(m),
  }));

  if (!events.length) {
    document.getElementById("brand-activity").innerHTML =
      "<em>No activity yet.</em>";
    return;
  }

  const items = events
    .map((e) => {
      const p = e.payload || {};
      const ev = p.event || "event";
      const amt = p.amount_human ?? "?";
      let line = "";
      let dot = "•";
      if (ev === "reward") {
        line = `Issued <strong>${amt} ${state.token.symbol}</strong> reward to customer · <strong>${(amt * 0.01).toFixed(2)} ${state.token.symbol}</strong> royalty earned`;
        dot = "↑";
      } else if (ev === "redeem") {
        line = `Customer redeemed <strong>${amt} ${state.token.symbol}</strong> · no fee (direct redemption)`;
        dot = "↓";
      } else {
        line = `Initial <strong>${amt} ${state.token.symbol}</strong> ${ev.replace(/_/g, " ")}`;
        dot = "·";
      }
      return `
        <li class="activity-item activity-${ev}">
          <span class="activity-dot">${dot}</span>
          <div class="activity-content">
            <div>${line}</div>
            <div class="muted small">${fmtRelativeTs(e.ts)} · seq #${e.seq}</div>
          </div>
        </li>
      `;
    })
    .join("");

  document.getElementById("brand-activity").innerHTML = `<ul class="activity-feed">${items}</ul>`;
}

// ---------- member view ----------
function renderMember() {
  renderMemberBalance();
  renderMemberActivity();
}

function renderMemberBalance() {
  const balance = tokenBalanceOf(state.accounts.customer);
  document.getElementById("member-balance-card").innerHTML = `
    <div class="hero-label">Your balance</div>
    <div class="hero-balance">${balance} <span class="hero-unit">${state.token.symbol}</span></div>
    <div class="muted small">${state.token.name} loyalty · account ${cfg.customer}</div>
  `;
}

function renderMemberActivity() {
  const events = state.messages
    .map((m) => ({
      seq: m.sequence_number,
      ts: m.consensus_timestamp,
      payload: decodeMessage(m),
    }))
    .filter(
      (e) =>
        e.payload &&
        (e.payload.to === cfg.customer || e.payload.from === cfg.customer)
    );

  if (!events.length) {
    document.getElementById("member-activity").innerHTML =
      `<em>No activity yet. Once you earn or redeem ${state.token.symbol}, it shows up here.</em>`;
    return;
  }

  const items = events
    .map((e) => {
      const p = e.payload || {};
      const ev = p.event;
      const amt = p.amount_human ?? "?";
      let line = "";
      let dot = "·";

      if (ev === "reward" && p.to === cfg.customer) {
        line = `<strong>You earned ${amt} ${state.token.symbol}</strong> from the brand`;
        dot = "+";
      } else if (ev === "redeem" && p.from === cfg.customer) {
        line = `<strong>You redeemed ${amt} ${state.token.symbol}</strong> with the brand`;
        dot = "−";
      } else if (ev === "loyalty_transfer" && p.to === cfg.customer) {
        line = `<strong>You received ${amt} ${state.token.symbol}</strong> · initial loyalty bonus`;
        dot = "+";
      } else {
        line = `${ev}: ${amt} ${state.token.symbol}`;
      }

      return `
        <li class="activity-item member-item member-${ev}">
          <span class="activity-dot">${dot}</span>
          <div class="activity-content">
            <div>${line}</div>
            <div class="muted small">${fmtRelativeTs(e.ts)}</div>
          </div>
        </li>
      `;
    })
    .join("");

  document.getElementById("member-activity").innerHTML = `<ul class="activity-feed">${items}</ul>`;
}

// ---------- platform view ----------
function renderPlatform() {
  renderTokenCard();
  renderBalances();
  renderTransfers();
  renderTopicMessages();
}

function renderTokenCard() {
  const token = state.token;
  const decimals = parseInt(token.decimals);
  const totalSupply = fmtUnits(token.total_supply, decimals);

  let feesHtml = "<em>none</em>";
  const fractional = token.custom_fees?.fractional_fees || [];
  if (fractional.length) {
    feesHtml = `<ul>${fractional
      .map((f) => {
        const pct = (
          (parseInt(f.amount.numerator) / parseInt(f.amount.denominator)) *
          100
        ).toFixed(2);
        const mode = f.net_of_transfers ? "exclusive" : "inclusive";
        return `<li>${pct}% → ${f.collector_account_id} <span class="muted">(${mode})</span></li>`;
      })
      .join("")}</ul>`;
  }

  document.getElementById("token-card").innerHTML = `
    <h3>${token.name} (${token.symbol})</h3>
    <dl>
      <dt>Token ID</dt><dd>${cfg.tokenId}</dd>
      <dt>Type</dt><dd>${token.type}</dd>
      <dt>Decimals</dt><dd>${decimals}</dd>
      <dt>Total supply</dt><dd>${totalSupply} ${token.symbol}</dd>
      <dt>Supply type</dt><dd>${token.supply_type}</dd>
      <dt>Treasury</dt><dd>${token.treasury_account_id}</dd>
      <dt>Custom fees</dt><dd>${feesHtml}</dd>
    </dl>
  `;
}

function renderBalances() {
  const accounts = [
    { label: "Operator", id: cfg.operator, role: "payer / platform pool", key: "operator" },
    { label: "Merchant", id: cfg.merchant, role: "treasury + fee collector", key: "merchant" },
    { label: "Customer", id: cfg.customer, role: "loyalty recipient", key: "customer" },
  ];

  const cards = accounts
    .map((a) => {
      const acc = state.accounts[a.key];
      const hbar = fmtHbar(acc.balance.balance);
      const tokenBal = tokenBalanceOf(acc);
      return `
        <div class="card">
          <h3>${a.label}</h3>
          <p class="account-id">${a.id} <span class="muted">· ${a.role}</span></p>
          <p>HBAR: <strong>${hbar}</strong></p>
          <p>${state.token.symbol}: <strong>${tokenBal}</strong></p>
        </div>
      `;
    })
    .join("");
  document.getElementById("balances").innerHTML = cards;
}

function renderTransfers() {
  if (!state.transfers.length) {
    document.getElementById("transfers").innerHTML =
      "<em>No transfers yet.</em>";
    return;
  }

  const rows = state.transfers
    .map((tx) => {
      const movements =
        (tx.token_transfers || [])
          .filter((t) => t.token_id === cfg.tokenId)
          .map(
            (t) =>
              `<div>${t.account}: <strong>${
                parseInt(t.amount) >= 0 ? "+" : ""
              }${fmtUnits(t.amount, 6)} ${state.token.symbol}</strong></div>`
          )
          .join("") || "<em>(no ${state.token.symbol} movement)</em>";
      const fees =
        (tx.assessed_custom_fees || [])
          .map((f) => {
            const payers = (f.effective_payer_account_ids || []).join(", ");
            return `<div>${fmtUnits(f.amount, 6)} ${state.token.symbol} → ${f.collector_account_id}<div class="muted" style="font-size:0.75rem">effective payer: ${payers || "—"}</div></div>`;
          })
          .join("") || "<em>none</em>";
      return `
        <tr>
          <td>${fmtTs(tx.consensus_timestamp)}</td>
          <td>${movements}</td>
          <td>${fees}</td>
        </tr>`;
    })
    .join("");

  document.getElementById("transfers").innerHTML = `
    <table>
      <thead><tr><th>Consensus timestamp</th><th>Token movements</th><th>Assessed custom fees</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderTopicMessages() {
  if (!state.messages.length) {
    document.getElementById("topic-messages").innerHTML =
      "<em>No messages yet.</em>";
    return;
  }
  const rows = state.messages
    .map((m) => {
      const parsed = decodeMessage(m);
      const tag = parsed?.event
        ? `<span class="event-tag event-${parsed.event}">${parsed.event}</span>`
        : "";
      const payload = parsed
        ? `${tag}<pre>${JSON.stringify(parsed, null, 2)}</pre>`
        : `<em>(not JSON)</em>`;
      return `
        <tr>
          <td>#${m.sequence_number}</td>
          <td>${fmtTs(m.consensus_timestamp)}</td>
          <td>${payload}</td>
        </tr>`;
    })
    .join("");
  document.getElementById("topic-messages").innerHTML = `
    <table>
      <thead><tr><th>Seq</th><th>Consensus timestamp</th><th>Payload</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ---------- router ----------
function currentView() {
  const hash = location.hash.replace("#", "");
  return VIEWS.includes(hash) ? hash : DEFAULT_VIEW;
}

function renderActive() {
  if (!state.token) return; // data not loaded yet
  const view = currentView();
  if (view === "home") renderHome();
  else if (view === "brand") renderBrand();
  else if (view === "member") renderMember();
  else if (view === "platform") renderPlatform();
}

function renderHome() {
  const royalty = fmtUnits(totalRoyaltyEarnedUnits().toString(), 6);
  const { count, totalAmount } = rewardStats();
  document.getElementById("hero-stat-rewards").textContent =
    `${totalAmount} ${state.token.symbol}`;
  document.getElementById("hero-stat-royalty").textContent =
    `${royalty} ${state.token.symbol}`;
  document.getElementById("hero-stat-events").textContent =
    state.messages.length.toString();
}

function applyRoute() {
  const view = currentView();
  for (const v of VIEWS) {
    document.getElementById(`view-${v}`).hidden = v !== view;
  }
  for (const n of document.querySelectorAll(".nav-item")) {
    n.classList.toggle("active", n.dataset.view === view);
  }
  renderActive();
}

window.addEventListener("hashchange", applyRoute);

// ---------- actions ----------
function bindAction(formId, endpoint, resultId, originalLabel) {
  const form = document.getElementById(formId);
  const resultEl = document.getElementById(resultId);
  const btn = form.querySelector("button");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const amount = Number(new FormData(form).get("amount"));
    btn.disabled = true;
    btn.textContent = "Submitting…";
    resultEl.innerHTML = '<div class="pending">⏳ Waiting for consensus…</div>';

    try {
      const data = await postJSON(endpoint, { amount });

      const feeLine = data.assessedFees.length
        ? data.assessedFees
            .map(
              (f) =>
                `<strong>${f.amount_human} ${state.token.symbol}</strong> → ${f.collector} <span class="muted">(payer: ${f.effective_payers.join(", ") || "—"})</span>`
            )
            .join("<br>")
        : `<em>no fee assessed (exemption applied)</em>`;

      const topupLine = data.topupTx
        ? `<div class="muted" style="font-size:0.78rem">↳ topup: ${data.topupTx}</div>`
        : "";

      resultEl.innerHTML = `
        <div class="success">
          <div>✅ Confirmed.</div>
          ${topupLine}
          <div><strong>Tx:</strong> <a href="${data.hashscan}" target="_blank" rel="noopener">${data.transferTx}</a></div>
          <div><strong>Fee:</strong> ${feeLine}</div>
          <div class="muted" style="font-size:0.78rem">Audit message: ${data.messageTx}</div>
        </div>
      `;

      await new Promise((r) => setTimeout(r, 1800));
      await fetchAll();
      renderActive();
    } catch (err) {
      resultEl.innerHTML = `<div class="error">❌ ${err.message}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  });
}

// ---------- chrome ----------
function setStatus(text) {
  document.getElementById("status-text").textContent = text;
}

function setStaticLinks() {
  document.getElementById("hashscan-link").href =
    `https://hashscan.io/testnet/token/${cfg.tokenId}`;
  document.getElementById("mirror-url").textContent = cfg.mirrorNode;
}

function applyBranding() {
  if (!state.token) return;
  const name = state.token.name;
  const symbol = state.token.symbol;
  document.title = `${name} Loyalty`;
  document.querySelectorAll(".token-name").forEach((el) => {
    el.textContent = name;
  });
  document.querySelectorAll(".token-sym").forEach((el) => {
    el.textContent = symbol;
  });
}

// ---------- boot ----------
async function main() {
  try {
    cfg = await getJSON("/api/config");
    API = `${cfg.mirrorNode}/api/v1`;
  } catch (err) {
    document.body.innerHTML =
      '<div class="error">Could not reach server. Start it with <code>npm run web</code>.</div>';
    throw err;
  }

  setStaticLinks();
  bindAction("reward-form", "/api/reward", "reward-result", "Reward");
  bindAction("redeem-form", "/api/redeem", "redeem-result", "Redeem");

  if (!location.hash) location.hash = `#${DEFAULT_VIEW}`;

  await fetchAll();
  applyBranding();
  applyRoute();
}

main();
