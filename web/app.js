// ---------- state + config ----------
let cfg;
let API;
let live = true; // false = read-only snapshot (no Node server behind the page)
const state = {
  token: null,
  accounts: {}, // operator | merchant | customer -> account info
  transfers: [], // transaction records (carry assessed_custom_fees)
  messages: [], // HCS messages
};

const VIEWS = ["home", "brand", "member", "platform"];
const DEFAULT_VIEW = "home";
const $ = (id) => document.getElementById(id);

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

const fmtNum = (n) =>
  Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });

function fmtHbar(tinybar) {
  return `${(Number(tinybar) / 1e8).toFixed(2)} ℏ`;
}

function fmtTs(consensusTs) {
  return new Date(parseFloat(consensusTs) * 1000)
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d+Z$/, " UTC");
}

function fmtRelativeTs(consensusTs) {
  const date = new Date(parseFloat(consensusTs) * 1000);
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${Math.max(sec, 0)}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function tokenBalanceOf(account) {
  const t = (account?.balance?.tokens || []).find(
    (x) => x.token_id === cfg.tokenId
  );
  return t ? fmtUnits(t.balance, 6) : "0";
}

function decodeMessage(m) {
  if (m.payload !== undefined) return m.payload; // snapshot rows are pre-decoded
  try {
    return JSON.parse(atob(m.message));
  } catch {
    return null;
  }
}

// SDK id "0.0.1@123.456" -> mirror node id "0.0.1-123-456"
function mirrorTxId(sdkId) {
  const [account, ts] = String(sdkId).split("@");
  return ts ? `${account}-${ts.replace(".", "-")}` : null;
}

// ---------- data fetch ----------
async function fetchAll() {
  if (!live) {
    const s = window.SNAPSHOT;
    state.token = s.token;
    state.accounts = s.accounts;
    state.transfers = s.transfers;
    state.messages = s.events;
    setStatus(`Testnet snapshot · ${s.takenAt}`);
    return;
  }

  setStatus("Refreshing…");
  const [token, opAcc, mrAcc, cstAcc, messages] = await Promise.all([
    getJSON(`${API}/tokens/${cfg.tokenId}`),
    getJSON(`${API}/accounts/${cfg.operator}`),
    getJSON(`${API}/accounts/${cfg.merchant}`),
    getJSON(`${API}/accounts/${cfg.customer}`),
    getJSON(`${API}/topics/${cfg.topicId}/messages?limit=50&order=desc`),
  ]);
  const msgs = messages.messages || [];

  // Each audit event names its transfer. Looking the record up by id keeps old
  // transfers visible: the list endpoint only returns a recent time window.
  // The detail endpoint is also the one that carries assessed_custom_fees.
  const txIds = msgs
    .map((m) => mirrorTxId(decodeMessage(m)?.transfer_tx))
    .filter(Boolean)
    .slice(0, 20);
  const transfers = (
    await Promise.all(
      txIds.map((id) =>
        getJSON(`${API}/transactions/${id}`)
          .then((d) => d.transactions[0])
          .catch(() => null)
      )
    )
  ).filter(Boolean);

  state.token = token;
  state.accounts = { operator: opAcc, merchant: mrAcc, customer: cstAcc };
  state.transfers = transfers;
  state.messages = msgs;
  setStatus(`Live · updated ${new Date().toLocaleTimeString()}`);
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

function eventStats() {
  const payloads = state.messages.map(decodeMessage).filter(Boolean);
  const sum = (ev) =>
    payloads
      .filter((p) => p.event === ev)
      .reduce((s, p) => s + (Number(p.amount_human) || 0), 0);
  const rewards = payloads.filter((p) => p.event === "reward");
  const rewarded = sum("reward");
  const redeemed = sum("redeem");
  return {
    count: rewards.length,
    rewarded,
    redeemed,
    redemptionRate: rewarded ? redeemed / rewarded : 0,
  };
}

// Customer balance after each audit event, oldest first
function balanceSeries() {
  const feeRate = (() => {
    const f = state.token.custom_fees?.fractional_fees?.[0];
    return f ? f.amount.numerator / f.amount.denominator : 0;
  })();
  let bal = 0;
  const points = [{ bal: 0, label: "start" }];
  for (const m of [...state.messages].reverse()) {
    const p = decodeMessage(m);
    if (!p) continue;
    const amt = Number(p.amount_human) || 0;
    if (p.to === cfg.customer) {
      const fee = (p.assessed_fees || []).reduce(
        (s, f) => s + (Number(f.amount_human) || 0),
        p.assessed_fees ? 0 : amt * feeRate
      );
      bal += amt - fee;
    } else if (p.from === cfg.customer) bal -= amt;
    else continue;
    points.push({ bal, label: p.event });
  }
  return points;
}

// ---------- shared pieces ----------
function dial(pct, value, label) {
  const p = Math.max(0, Math.min(1, pct || 0));
  const r = 84;
  const c = 2 * Math.PI * r;
  const a = (-90 + 360 * p) * (Math.PI / 180);
  const kx = 100 + r * Math.cos(a);
  const ky = 100 + r * Math.sin(a);
  return `
    <div class="dial">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r="${r}" class="dial-arc"
          stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 100 100)" />
        <circle cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" r="9" class="dial-knob" />
      </svg>
      <div class="dial-core">
        <span class="dial-value">${value}</span>
        <span class="dial-label">${label}</span>
      </div>
    </div>`;
}

function areaChart(points) {
  const W = 640, H = 250, padX = 16, padTop = 30, padBottom = 18;
  const max = Math.max(...points.map((p) => p.bal), 1);
  const xs = (i) => padX + (i * (W - 2 * padX)) / Math.max(points.length - 1, 1);
  const ys = (v) => H - padBottom - (v / max) * (H - padTop - padBottom);
  let line = `M ${xs(0)} ${ys(points[0].bal)}`;
  for (let i = 1; i < points.length; i++) {
    const x0 = xs(i - 1), x1 = xs(i), mid = (x0 + x1) / 2;
    line += ` C ${mid} ${ys(points[i - 1].bal)} ${mid} ${ys(points[i].bal)} ${x1} ${ys(points[i].bal)}`;
  }
  const last = points.length - 1;
  const area = `${line} L ${xs(last)} ${H} L ${xs(0)} ${H} Z`;
  const dots = points
    .slice(1, -1)
    .map((p, i) => `<circle cx="${xs(i + 1)}" cy="${ys(p.bal)}" r="3.5" class="chart-dot" />`)
    .join("");
  return `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Member balance after each audit event">
      <path d="${area}" class="chart-area" />
      <path d="${line}" class="chart-line" />
      ${dots}
      <circle cx="${xs(last)}" cy="${ys(points[last].bal)}" r="10" class="chart-knob" />
    </svg>`;
}

const ICON = {
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
};

function feed(items, emptyText) {
  if (!items.length) return `<p class="empty">${emptyText}</p>`;
  return `<ul class="feed">${items
    .map(
      (i) => `
      <li class="feed-item">
        <span class="feed-dot ${i.accent ? "on" : ""}">${i.accent ? ICON.up : ICON.down}</span>
        <div class="feed-body"><div>${i.line}</div><div class="feed-meta">${i.meta}</div></div>
        <span class="feed-amt ${i.accent ? "pos" : ""}">${i.amt}</span>
      </li>`
    )
    .join("")}</ul>`;
}

// ---------- home view ----------
function renderHome() {
  const sym = state.token.symbol;
  const s = eventStats();
  $("hero-dial").innerHTML = dial(
    s.redemptionRate,
    `${Math.round(s.redemptionRate * 100)}<small>%</small>`,
    "redemption rate"
  );
  $("hero-stat-rewards").textContent = `${fmtNum(s.rewarded)} ${sym}`;
  $("hero-stat-royalty").textContent =
    `${fmtUnits(totalRoyaltyEarnedUnits().toString(), 6)} ${sym}`;
  $("hero-stat-events").textContent = state.messages.length.toString();
}

// ---------- brand view ----------
function renderBrand() {
  const sym = state.token.symbol;
  const royalty = fmtUnits(totalRoyaltyEarnedUnits().toString(), 6);
  const s = eventStats();
  const decimals = parseInt(state.token.decimals);
  const supply = Number(fmtUnits(state.token.total_supply, decimals));
  const treasury = Number(tokenBalanceOf(state.accounts.merchant));
  const treasuryPct = supply ? (treasury / supply) * 100 : 0;

  $("brand-token-chip").textContent = `${sym} · ${cfg.tokenId}`;

  $("brand-kpis").innerHTML = `
    <div class="card kpi">
      <div class="kpi-label">Royalty earned</div>
      <div class="kpi-value accent-text">${royalty} <span class="kpi-unit">${sym}</span></div>
      <div class="kpi-hint">1% fee on third-party transfers</div>
    </div>
    <div class="card kpi">
      <div class="kpi-label">Rewards issued</div>
      <div class="kpi-value">${fmtNum(s.rewarded)} <span class="kpi-unit">${sym}</span></div>
      <div class="kpi-hint">${s.count} reward${s.count === 1 ? "" : "s"} so far</div>
    </div>
    <div class="card kpi">
      <div class="kpi-label">Treasury balance</div>
      <div class="kpi-value">${fmtNum(treasury)} <span class="kpi-unit">${sym}</span></div>
      <div class="meter" title="${treasuryPct.toFixed(2)}% of supply"><i style="width:${treasuryPct.toFixed(2)}%"></i></div>
      <div class="kpi-hint">of ${fmtNum(supply)} total supply</div>
    </div>
    <div class="card kpi kpi-ring">
      <div>
        <div class="kpi-label">Redemption rate</div>
        <div class="kpi-hint">${fmtNum(s.redeemed)} of ${fmtNum(s.rewarded)} ${sym} redeemed</div>
      </div>
      ${dial(s.redemptionRate, `${Math.round(s.redemptionRate * 100)}<small>%</small>`, "")}
    </div>`;

  const series = balanceSeries();
  $("brand-chart").innerHTML = areaChart(series);
  $("brand-chart-now").innerHTML =
    `<strong>${tokenBalanceOf(state.accounts.customer)}</strong> ${sym} now`;

  // customers: one account wired in this prototype
  const lastSeen = state.messages.length
    ? fmtRelativeTs(state.messages[0].consensus_timestamp)
    : "—";
  $("brand-customers").innerHTML = `
    <div class="well customer">
      <div>
        <div class="mono">${cfg.customer}</div>
        <div class="feed-meta">Last activity: ${lastSeen}</div>
      </div>
      <div class="customer-bal"><strong>${tokenBalanceOf(state.accounts.customer)}</strong> ${sym}</div>
    </div>
    <p class="note">A real implementation would index customers by token association. Here only the customer account from <code>.env</code> is wired.</p>`;

  const items = state.messages.map((m) => {
    const p = decodeMessage(m) || {};
    const amt = Number(p.amount_human) || 0;
    const meta = `${fmtRelativeTs(m.consensus_timestamp)} · seq #${m.sequence_number}`;
    if (p.event === "reward") {
      const fee = (p.assessed_fees || []).reduce((s2, f) => s2 + (Number(f.amount_human) || 0), 0);
      return { accent: true, line: `Reward issued to customer`, meta: `${meta} · ${fee} ${sym} royalty`, amt: `+${fmtNum(amt)} ${sym}` };
    }
    if (p.event === "redeem")
      return { accent: false, line: `Customer redeemed with the brand`, meta: `${meta} · no fee`, amt: `−${fmtNum(amt)} ${sym}` };
    return { accent: true, line: `${(p.event || "event").replace(/_/g, " ")}`, meta, amt: `${fmtNum(amt)} ${sym}` };
  });
  $("brand-activity").innerHTML = feed(items, "No activity yet.");
}

// ---------- member view ----------
function renderMember() {
  const sym = state.token.symbol;
  const balance = tokenBalanceOf(state.accounts.customer);
  const series = balanceSeries();
  const earned = series.reduce(
    (s, p, i) => s + Math.max(0, i ? p.bal - series[i - 1].bal : 0),
    0
  );
  const held = earned ? Number(balance) / earned : 0;
  $("member-dial").innerHTML = dial(held, balance, `${sym} balance`);
  $("member-note").innerHTML =
    `${Math.round(held * 100)}% of what you earned is still in your wallet.<br /><span class="mono">${cfg.customer}</span>`;

  const items = state.messages
    .map((m) => ({ m, p: decodeMessage(m) }))
    .filter(({ p }) => p && (p.to === cfg.customer || p.from === cfg.customer))
    .map(({ m, p }) => {
      const amt = fmtNum(Number(p.amount_human) || 0);
      const meta = fmtRelativeTs(m.consensus_timestamp);
      if (p.from === cfg.customer)
        return { accent: false, line: "You redeemed with the brand", meta, amt: `−${amt} ${sym}` };
      return { accent: true, line: p.event === "reward" ? "You earned a reward from the brand" : "You received a loyalty bonus", meta, amt: `+${amt} ${sym}` };
    });
  $("member-activity").innerHTML = feed(
    items,
    `No activity yet. Once you earn or redeem ${sym}, it shows up here.`
  );
}

// ---------- platform view ----------
function renderPlatform() {
  const token = state.token;
  const sym = token.symbol;
  const decimals = parseInt(token.decimals);

  const fractional = token.custom_fees?.fractional_fees || [];
  const feesHtml = fractional.length
    ? fractional
        .map((f) => {
          const pct = ((parseInt(f.amount.numerator) / parseInt(f.amount.denominator)) * 100).toFixed(2);
          return `${pct}% → ${f.collector_account_id} <span class="muted">(${f.net_of_transfers ? "exclusive" : "inclusive"})</span>`;
        })
        .join("<br />")
    : "none";

  $("token-card").innerHTML = `
    <dl class="spec">
      <dt>Name</dt><dd>${token.name} (${sym})</dd>
      <dt>Token ID</dt><dd class="mono">${cfg.tokenId}</dd>
      <dt>Type</dt><dd class="mono">${token.type}</dd>
      <dt>Decimals</dt><dd>${decimals}</dd>
      <dt>Total supply</dt><dd>${fmtNum(fmtUnits(token.total_supply, decimals))} ${sym}</dd>
      <dt>Supply type</dt><dd class="mono">${token.supply_type}</dd>
      <dt>Treasury</dt><dd class="mono">${token.treasury_account_id}</dd>
      <dt>Custom fees</dt><dd>${feesHtml}</dd>
      <dt>Audit topic</dt><dd class="mono">${cfg.topicId}</dd>
    </dl>`;

  const accounts = [
    { label: "Operator", id: cfg.operator, role: "payer / platform pool", key: "operator" },
    { label: "Merchant", id: cfg.merchant, role: "treasury + fee collector", key: "merchant" },
    { label: "Customer", id: cfg.customer, role: "loyalty recipient", key: "customer" },
  ];
  $("balances").innerHTML = accounts
    .map((a) => {
      const acc = state.accounts[a.key];
      return `
        <div class="card account">
          <div>
            <h3>${a.label}</h3>
            <p class="feed-meta"><span class="mono">${a.id}</span> · ${a.role}</p>
          </div>
          <div class="account-bal">
            <div><strong>${fmtNum(tokenBalanceOf(acc))}</strong> ${sym}</div>
            <div class="feed-meta">${fmtHbar(acc.balance.balance)}</div>
          </div>
        </div>`;
    })
    .join("");

  $("transfers").innerHTML = state.transfers.length
    ? `<table>
        <thead><tr><th>Consensus timestamp</th><th>Token movements</th><th>Assessed custom fees</th></tr></thead>
        <tbody>${state.transfers
          .map((tx) => {
            const moves =
              (tx.token_transfers || [])
                .filter((t) => t.token_id === cfg.tokenId)
                .map((t) => `<div><span class="mono">${t.account}</span> <strong class="${parseInt(t.amount) >= 0 ? "pos" : ""}">${parseInt(t.amount) >= 0 ? "+" : "−"}${fmtUnits(String(t.amount).replace("-", ""), 6)}</strong></div>`)
                .join("") || `<span class="muted">no ${sym} movement</span>`;
            const fees =
              (tx.assessed_custom_fees || [])
                .map((f) => `<div><strong>${fmtUnits(f.amount, 6)} ${sym}</strong> → <span class="mono">${f.collector_account_id}</span><div class="feed-meta">effective payer: ${(f.effective_payer_account_ids || []).join(", ") || "—"}</div></div>`)
                .join("") || '<span class="muted">none (exemption)</span>';
            return `<tr><td class="mono">${fmtTs(tx.consensus_timestamp)}</td><td>${moves}</td><td>${fees}</td></tr>`;
          })
          .join("")}</tbody>
      </table>`
    : '<p class="empty">No transfers yet.</p>';

  $("topic-messages").innerHTML = state.messages.length
    ? `<table>
        <thead><tr><th>Seq</th><th>Consensus timestamp</th><th>Payload</th></tr></thead>
        <tbody>${state.messages
          .map((m) => {
            const p = decodeMessage(m);
            const body = p
              ? `<span class="tag ${p.event === "reward" ? "on" : ""}">${p.event || "event"}</span><pre>${JSON.stringify(p, null, 2)}</pre>`
              : '<span class="muted">(not JSON)</span>';
            return `<tr><td class="mono">#${m.sequence_number}</td><td class="mono">${fmtTs(m.consensus_timestamp)}</td><td>${body}</td></tr>`;
          })
          .join("")}</tbody>
      </table>`
    : '<p class="empty">No messages yet.</p>';
}

// ---------- router ----------
function currentView() {
  const hash = location.hash.replace("#", "");
  return VIEWS.includes(hash) ? hash : DEFAULT_VIEW;
}

function renderActive() {
  if (!state.token) return;
  const view = currentView();
  if (view === "home") renderHome();
  else if (view === "brand") renderBrand();
  else if (view === "member") renderMember();
  else renderPlatform();
}

function applyRoute() {
  const view = currentView();
  for (const v of VIEWS) $(`view-${v}`).hidden = v !== view;
  for (const n of document.querySelectorAll(".nav-item")) {
    n.classList.toggle("active", n.dataset.view === view);
  }
  renderActive();
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", applyRoute);

// ---------- actions ----------
function bindAction(formId, endpoint, resultId, label) {
  const form = $(formId);
  const resultEl = $(resultId);
  const btn = form.querySelector('button[type="submit"]');
  const input = form.querySelector('input[name="amount"]');

  for (const q of form.querySelectorAll(".quick button")) {
    q.addEventListener("click", () => {
      input.value = q.dataset.amt;
      form.querySelectorAll(".quick button").forEach((b) => b.classList.toggle("on", b === q));
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!live) {
      resultEl.innerHTML =
        '<div class="msg">Read-only snapshot. Start the server with <code>npm run web</code> to sign this on testnet.</div>';
      return;
    }
    const amount = Number(new FormData(form).get("amount"));
    btn.disabled = true;
    btn.textContent = "Submitting…";
    resultEl.innerHTML = '<div class="msg">Waiting for consensus…</div>';

    try {
      const data = await postJSON(endpoint, { amount });
      const sym = state.token.symbol;
      const feeLine = data.assessedFees.length
        ? data.assessedFees
            .map((f) => `<strong>${f.amount_human} ${sym}</strong> → ${f.collector} <span class="muted">(payer: ${f.effective_payers.join(", ") || "—"})</span>`)
            .join("<br />")
        : "none assessed (exemption applied)";

      resultEl.innerHTML = `
        <div class="msg ok">
          <div><strong>Confirmed.</strong></div>
          <div>Tx: <a href="${data.hashscan}" target="_blank" rel="noopener" class="mono">${data.transferTx}</a></div>
          <div>Fee: ${feeLine}</div>
          <div class="feed-meta">Audit message: ${data.messageTx}${data.topupTx ? ` · topup: ${data.topupTx}` : ""}</div>
        </div>`;

      await new Promise((r) => setTimeout(r, 1800)); // mirror node lags consensus by a few seconds
      await fetchAll();
      renderActive();
    } catch (err) {
      resultEl.innerHTML = `<div class="msg err">${err.message}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  });
}

// ---------- chrome ----------
function setStatus(text) {
  $("status-text").textContent = text;
  $("header-status").classList.toggle("is-snapshot", !live);
}

function applyBranding() {
  const { name, symbol } = state.token;
  document.title = `${name} Loyalty`;
  document.querySelectorAll(".token-name").forEach((el) => (el.textContent = name));
  document.querySelectorAll(".token-sym").forEach((el) => (el.textContent = symbol));
}

// ---------- boot ----------
async function main() {
  live = !new URLSearchParams(location.search).has("snapshot");
  if (live) {
    try {
      cfg = await getJSON("/api/config");
    } catch {
      live = false; // no server behind the page: fall back to the snapshot
    }
  }
  if (!live) cfg = window.SNAPSHOT.cfg;
  API = `${cfg.mirrorNode}/api/v1`;

  $("hashscan-link").href = `https://hashscan.io/testnet/token/${cfg.tokenId}`;
  $("mirror-url").textContent = cfg.mirrorNode;
  bindAction("reward-form", "/api/reward", "reward-result", "Reward");
  bindAction("redeem-form", "/api/redeem", "redeem-result", "Redeem");

  if (!location.hash) history.replaceState(null, "", `${location.search}#${DEFAULT_VIEW}`);

  try {
    await fetchAll();
  } catch (err) {
    setStatus("Mirror node unreachable");
    throw err;
  }
  applyBranding();
  applyRoute();
}

main();
