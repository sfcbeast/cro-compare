// CRO Compare: user interface. Pricing rules live in logic.js (tested separately).
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const L = CROLogic(window);
  const { SERVICES, OFFERS, SERVICE_META, FX_TO_USD, VERIFIED_ON } = window;
  const { fmt } = L;
  const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");
  const SHORT = { sanger: "Sanger", plasmid: "Whole plasmid", rnaseq: "RNA-seq", amplicon: "16S / ITS", ic50: "IC50 / toxicity", screen: "Cell screening", viability: "Viability", reporter: "Reporter assays", immunoonc: "Immuno-oncology" };
  const COUNTRY = { US: "United States", CA: "Canada", UK: "United Kingdom", EU: "Europe", AU: "Australia" };
  const AUD_NAME = { external: "academic lab", industry: "industry user" };

  // ---------- state, mirrored in the URL so any view can be shared ----------
  const DEFAULTS = { q: "", svc: "", aud: "external", qty: 1, scope: "all", sort: "price", view: "cards", region: "", type: "", budget: 0 };
  const KEYS = Object.keys(DEFAULTS);
  let S = readHash();

  function readHash() {
    const st = { ...DEFAULTS };
    let sp;
    try { sp = new URLSearchParams(location.hash.slice(1)); } catch (e) { return st; }
    const take = (k, ok) => { if (sp.has(k) && ok(sp.get(k))) st[k] = sp.get(k); };
    take("q", v => v.length <= 80);
    take("svc", v => SERVICES.some(s => s.id === v));
    take("aud", v => v === "external" || v === "industry");
    take("scope", v => v === "all" || v === "full");
    take("sort", v => ["price", "fast", "name"].includes(v));
    take("view", v => v === "cards" || v === "table");
    take("region", v => L.REGIONS.some(r => r[0] === v));
    take("type", v => L.TYPES.includes(v));
    const qty = parseInt(sp.get("qty"), 10); if (qty >= 1 && qty <= 100000) st.qty = qty;
    const budget = parseFloat(sp.get("budget")); if (budget > 0 && budget < 1e9) st.budget = budget;
    return st;
  }
  function writeHash() {
    const sp = new URLSearchParams();
    KEYS.forEach(k => { if (S[k] !== DEFAULTS[k]) sp.set(k, S[k]); });
    try { history.replaceState(null, "", sp.toString() ? "#" + sp : location.pathname + location.search); } catch (e) { /* ignore */ }
  }
  // opts.keepFields: do not rewrite the inputs (used while the user is typing in one).
  function setState(patch, opts = {}) {
    Object.assign(S, patch);
    writeHash();
    if (!opts.keepFields) syncControls();
    else syncChrome();
    render();
    if ("aud" in patch) renderRequests();
  }
  const isFiltered = () => ["q", "svc", "scope", "sort", "region", "type", "budget"].some(k => S[k] !== DEFAULTS[k]);

  // ---------- small helpers ----------
  let toastTimer;
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }
  const checkedOn = o => o.checked || VERIFIED_ON;
  const ageDays = o => Math.floor((Date.now() - new Date(checkedOn(o))) / 864e5);
  const offerKey = o => o.service + "|" + o.provider;
  const findOffer = key => { const i = key.indexOf("|"); return OFFERS.find(o => o.service === key.slice(0, i) && o.provider === key.slice(i + 1)); };
  const badge = (cls, text, title) => `<span class="badge ${cls}"${title ? ` title="${esc(title)}"` : ""}>${esc(text)}</span>`;
  const countOffers = sid => OFFERS.filter(o => o.service === sid).length;

  // ---------- hero stats, chips, static controls ----------
  function buildStatic() {
    const orgs = new Set(OFFERS.map(o => o.org)).size, priced = OFFERS.filter(o => o.tiers.length).length;
    const latest = OFFERS.map(checkedOn).sort().pop();
    $("stats").innerHTML = [`<b>${OFFERS.length}</b> listings`, `<b>${orgs}</b> providers`, `<b>${priced}</b> with a public price`, `prices checked <b>${esc(latest)}</b>`]
      .map(t => `<li>${t}</li>`).join("");
    $("region").innerHTML = L.REGIONS.map(([v, n]) => `<option value="${v}">${n}</option>`).join("");
    $("type").innerHTML = '<option value="">Any type</option>' + L.TYPES.map(t => `<option>${t}</option>`).join("");
    const cats = [...new Set(SERVICES.map(s => s.category))];
    $("chips").innerHTML = `<button type="button" class="chip" data-svc="" aria-pressed="true">All services <span class="n">${OFFERS.length}</span></button>` +
      cats.map(c => `<span class="chipgroup">${esc(c)}</span>` + SERVICES.filter(s => s.category === c).map(s =>
        `<button type="button" class="chip" data-svc="${s.id}" aria-pressed="false">${esc(SHORT[s.id])} <span class="n">${countOffers(s.id)}</span></button>`).join("")).join("") +
      '<button type="button" class="chip help" id="helpMe">Not sure? Help me choose</button>';
    $("goalGrid").innerHTML = SERVICES.map(s => `<button type="button" class="goalbtn" data-goal="${s.id}"><b>${esc(s.name)}</b><span>${esc(SERVICE_META[s.id].goal)}</span></button>`).join("");
  }

  function syncChrome() {
    document.querySelectorAll("#aud button").forEach(b => b.setAttribute("aria-checked", String(b.dataset.aud === S.aud)));
    document.querySelectorAll("#chips [data-svc]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.svc === S.svc)));
    $("viewCards").setAttribute("aria-pressed", String(S.view === "cards"));
    $("viewTable").setAttribute("aria-pressed", String(S.view === "table"));
    const extra = [S.region, S.type, S.budget].filter(Boolean).length;
    $("moreCount").textContent = extra ? "(" + extra + ")" : "";
    $("clearBtn").hidden = !isFiltered();
  }
  function syncControls() {
    const put = (id, v) => { const el = $(id); if (el.value !== String(v)) el.value = v; };
    put("q", S.q); put("qty", S.qty); put("sort", S.sort); put("region", S.region); put("type", S.type); put("budget", S.budget || "");
    $("fullOnly").checked = S.scope === "full";
    if ([S.region, S.type, S.budget].some(Boolean)) $("more").open = true;
    syncChrome();
  }

  // ---------- results ----------
  let lastGroups = [];
  let community = {};

  function render() {
    const groups = SERVICES.filter(s => L.serviceVisible(s, S))
      .map(s => ({ s, rows: L.sortRows(L.rowsFor(s.id, S), S.sort) })).filter(g => g.rows.length);
    lastGroups = groups;
    const n = groups.reduce((a, g) => a + g.rows.length, 0);
    $("resultCount").textContent = n
      ? `${plural(n, "offer")} in ${plural(groups.length, "service")} · ${plural(S.qty, "sample")} · ${AUD_NAME[S.aud]}${S.budget ? " · budget " + fmt("USD", S.budget) : ""}`
      : "No offers match these filters";
    $("results").innerHTML = groups.length ? groups.map(groupHTML).join("") : emptyHTML();
    $("printHead").textContent = `CRO Compare · printed ${new Date().toISOString().slice(0, 10)} · ${plural(S.qty, "sample")} · ${AUD_NAME[S.aud]} rates` +
      (S.budget ? ` · budget ${fmt("USD", S.budget)}` : "") + ". Prices copied from provider pages; confirm before ordering.";
    renderPlanner(); renderTray();
  }

  function emptyHTML() {
    return `<div class="empty"><h3>No offers match</h3><p class="muted">Try removing a filter. ${S.budget ? "Your budget may be too low for this many samples." : ""}</p>
      <p style="margin-top:12px"><button class="btn primary" data-clear="1">Clear filters</button></p></div>`;
  }

  function groupHTML({ s, rows }) {
    const bv = L.bestValue(rows), st = L.serviceStats(rows);
    const daysCount = rows.filter(r => r.o.days != null && !r.o.partial).length;
    const isCheapest = r => bv.pricedCount >= 2 && bv.cheapest && r === bv.cheapest;
    const isFastest = r => daysCount >= 2 && bv.fastest && r === bv.fastest;
    const tiles = [];
    if (bv.cheapest) tiles.push(`<div class="tile good"><div class="k">Lowest total</div><div class="v">${esc(bv.cheapest.o.provider)}</div>
      <div class="s">${fmt("USD", bv.cheapest.total)} for ${plural(S.qty, SERVICE_UNIT(s))}${bv.pricedCount === 1 ? ". Only public full-service price" : ""}</div></div>`);
    if (daysCount >= 2 && bv.fastest) tiles.push(`<div class="tile"><div class="k">Fastest stated</div><div class="v">${esc(bv.fastest.o.provider)}</div><div class="s">${esc(bv.fastest.o.turn)}</div></div>`);
    if (bv.spread && bv.spread.ratio >= 1.1) tiles.push(`<div class="tile"><div class="k">Price spread</div><div class="v">${bv.spread.ratio.toFixed(1)}× cheapest to dearest</div>
      <div class="s">Choosing ${esc(bv.spread.cheapest.o.provider)} saves about ${fmt("USD", bv.spread.save)}</div></div>`);
    let callout = "";
    const priced = rows.filter(r => r.total != null);
    if (!bv.cheapest && priced.length && priced.every(r => r.overBudget)) {
      callout = `<div class="callout"><span>Every priced offer here is over your ${fmt("USD", S.budget)} budget. The cheapest is ${fmt("USD", Math.min(...priced.map(r => r.total)))}.</span></div>`;
    } else if (!priced.length) {
      callout = `<div class="callout"><span><b>No public price for these ${rows.length} providers.</b> One structured request reaches all of them, and you can log what they quote.</span>
        <button class="btn primary sm" data-quote-all="${s.id}">Ask all ${rows.length} providers</button></div>`;
    }
    const body = S.view === "table" ? tableHTML(rows, s, isCheapest, isFastest) : rows.map(r => cardHTML(r, s, isCheapest(r), isFastest(r))).join("");
    return `<section class="svc-block" id="svc-${s.id}" aria-labelledby="h-${s.id}">
      <div class="svc-head"><div><h2 id="h-${s.id}">${esc(s.name)}</h2><p class="svc-goal">${esc(SERVICE_META[s.id].goal)}</p></div>
        <div class="svc-actions"><span class="pill">${plural(st.providers, "provider")}${st.priced ? " · " + st.priced + " priced" : " · quote only"}</span>
        ${rows.length > 1 && priced.length ? `<button class="btn sm" data-quote-all="${s.id}">Ask all providers</button>` : ""}</div></div>
      ${tiles.length ? `<div class="best">${tiles.join("")}</div>` : ""}${callout}${body}${curveHTML(s, rows)}</section>`;
  }
  const SERVICE_UNIT = s => s.unit.replace("per ", "").replace("quote", "unit");

  function metaHTML(r) {
    const o = r.o, bits = [esc(o.type), esc(COUNTRY[o.country] || o.country)];
    if (o.turn) bits.push("Turnaround: " + esc(o.turn));
    if (o.tiers.length) {
      const stale = ageDays(o) > 90;
      bits.push(`<span class="${stale ? "stale" : ""}">Checked ${esc(checkedOn(o))}${stale ? ` (${ageDays(o)} days ago, confirm before ordering)` : ""}</span>`);
    }
    return `<div class="meta">${bits.map(b => `<span>${b}</span>`).join("")}</div>`;
  }

  function badgesHTML(r, cheapest, fastest) {
    const b = [];
    if (cheapest) b.push(badge("good", "Lowest price"));
    if (fastest) b.push(badge("brand", "Fastest stated"));
    if (r.o.partial) b.push(badge("warn", "Partial scope", "Covers only part of the work; not comparable with full-service prices"));
    if (r.pick && !r.pick.exact) b.push(badge("warn", "Industry rate not listed", "Showing the external-user rate because no industry rate is published"));
    if (!r.o.verified) b.push(badge("warn", "Unverified"));
    if (r.overBudget) b.push(badge("danger", "Over budget"));
    return b.length ? `<span class="badges">${b.join("")}</span>` : "";
  }

  function priceHTML(r, s) {
    const unitWord = esc(s.unit);
    if (r.pick) {
      const t = r.pick.t, range = t.priceHigh ? `${fmt(t.currency, t.price)}–${fmt(t.currency, t.priceHigh)}` : fmt(t.currency, t.price);
      return `<div class="price"><span class="amt">${range}</span><span class="per">${unitWord}${t.first != null ? ` (the first one ${fmt(t.currency, t.first)})` : ""}</span>` +
        ((S.qty > 1 || t.first != null) && !t.priceHigh ? `<span class="tot">${fmt(t.currency, L.lineCost(t, S.qty))} for ${S.qty}</span>` : "") +
        (t.currency !== "USD" ? `<span class="usdeq">≈ ${fmt("USD", r.total)}${S.qty > 1 ? " total" : ""}</span>` : "") + `</div>`;
    }
    const c = community[offerKey(r.o)], entry = L.entryTier(r.o, S.aud);
    const head = entry && (entry.minQty || 1) > S.qty ? `From ${plural(entry.minQty, "sample")}: ${fmt(entry.currency, entry.price)} each` : "Quote only";
    const sub = c ? `Community: about ${fmt("USD", c.median)} median · ${plural(c.n, "quote")}${c.n > 1 ? ` (${fmt("USD", c.min)}–${fmt("USD", c.max)})` : ""}` : "";
    return `<div class="quote"><span class="amt">${head}</span>${sub ? `<span class="sub">${sub}</span>` : ""}</div>`;
  }

  function tiersHTML(o) {
    if (o.tiers.length < 2) return "";
    const rows = L.tierTable(o).map(t => `<tr><td>${esc(t.who)}</td><td class="num">${t.from > 1 ? "from " + t.from : "any"}</td><td class="num">${fmt(t.currency, t.price)}${t.first != null ? ` (first ${fmt(t.currency, t.first)})` : ""}</td></tr>`).join("");
    return `<details class="tiers"><summary>All price tiers</summary><table class="mini"><thead><tr><th>Who</th><th class="num">Samples</th><th class="num">Price each</th></tr></thead><tbody>${rows}</tbody></table></details>`;
  }

  function cardHTML(r, s, cheapest, fastest) {
    const o = r.o, key = offerKey(o), tip = L.volumeTip(o, r.pick, S.qty);
    return `<article class="card${cheapest ? " best-card" : ""}${r.overBudget ? " over" : ""}">
      <div class="card-top"><div><span class="name">${esc(o.provider)}</span>${badgesHTML(r, cheapest, fastest)}${metaHTML(r)}</div>${priceHTML(r, s)}</div>
      ${o.note ? `<p class="note">${esc(o.note)}</p>` : ""}
      ${tip ? `<p class="tip"><b>Tip:</b> ordering ${tip.minQty} samples costs ${fmt(tip.currency, tip.total)}, less than ${fmt(tip.currency, tip.current)} for ${S.qty}.</p>` : ""}
      ${tiersHTML(o)}
      <div class="card-foot">
        <div class="left"><label class="cmpchk"><input type="checkbox" data-cmp="${esc(key)}" ${compare.includes(key) ? "checked" : ""}> Compare</label></div>
        <div class="right"><button class="btn sm primary" data-quote="${s.id}" data-prov="${esc(o.provider)}">Request quote</button>
          <a href="${esc(o.source)}" target="_blank" rel="noopener" data-src>Source</a>
          <button class="linkbtn" data-report="${s.id}|${esc(o.provider)}">Report a problem</button></div>
      </div></article>`;
  }

  function tableHTML(rows, s, isCheapest, isFastest) {
    const body = rows.map(r => {
      const o = r.o, key = offerKey(o), t = r.pick && r.pick.t, cheapest = isCheapest(r);
      const entry = L.entryTier(o, S.aud);
      const unitCell = t ? fmt(t.currency, t.price) + (t.first != null ? `<span class="sm">first one ${fmt(t.currency, t.first)}</span>` : "") + (t.currency !== "USD" ? `<span class="sm">≈ ${fmt("USD", r.unit)}</span>` : "")
        : (entry && (entry.minQty || 1) > S.qty ? `<span class="sm">from ${entry.minQty}: ${fmt(entry.currency, entry.price)}</span>Quote only` : "Quote only");
      return `<tr class="${cheapest ? "best-row" : ""}${r.overBudget ? " over" : ""}">
        <td><input type="checkbox" data-cmp="${esc(key)}" aria-label="Compare ${esc(o.provider)}" ${compare.includes(key) ? "checked" : ""}></td>
        <td><b>${esc(o.provider)}</b> ${badgesHTML(r, cheapest, isFastest(r))}<span class="sm">${esc(o.type)} · ${esc(COUNTRY[o.country] || o.country)}</span></td>
        <td class="num">${unitCell}</td>
        <td class="num">${r.total != null ? "<b>" + fmt("USD", r.total) + "</b>" : "–"}</td>
        <td>${o.turn ? esc(o.turn) : "–"}</td>
        <td>${o.partial ? "Partial" : "Full"}</td>
        <td>${o.tiers.length ? esc(checkedOn(o)) : "–"}</td>
        <td><button class="btn sm" data-quote="${s.id}" data-prov="${esc(o.provider)}">Quote</button> <a href="${esc(o.source)}" target="_blank" rel="noopener" data-src>Source</a></td></tr>`;
    }).join("");
    return `<div class="tablewrap"><table class="cmp"><caption class="sr-only">${esc(s.name)} offers for ${plural(S.qty, "sample")}</caption>
      <thead><tr><th><span class="sr-only">Compare</span></th><th>Provider</th><th class="num">${esc(s.unit)}</th><th class="num">Total for ${S.qty}</th><th>Turnaround</th><th>Scope</th><th>Checked</th><th></th></tr></thead><tbody>${body}</tbody></table></div>`;
  }

  // ---------- cost curve ----------
  const COLORS = ["#2f7de1", "#e5484d", "#2da66a", "#d9822b", "#8e6bf2", "#16a3a3", "#d6409f", "#8a8f98"];
  function curveHTML(s, rows) {
    const c = L.curveSeries(rows, S.aud, S.qty);
    if (!c) return "";
    const { series, maxN, maxY } = c, W = 640, H = 220, Lm = 56, R = 12, T = 10, B = 28;
    const X = n => Lm + (n - 1) / (maxN - 1) * (W - Lm - R), Y = v => T + (1 - v / maxY) * (H - T - B);
    const paths = series.map((x, i) => `<path d="${x.pts.map((p, j) => (j ? "L" : "M") + X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1)).join("")}" fill="none" stroke="${COLORS[i % COLORS.length]}" stroke-width="2"/>`).join("");
    const grid = [0, .5, 1].map(f => `<line x1="${Lm}" x2="${W - R}" y1="${Y(maxY * f)}" y2="${Y(maxY * f)}" stroke="var(--line)"/><text x="${Lm - 6}" y="${Y(maxY * f) + 4}" text-anchor="end" font-size="11" style="fill:var(--text-2)">${fmt("USD", Math.round(maxY * f))}</text>`).join("");
    const xs = [1, Math.round(maxN / 2), maxN].map(n => `<text x="${X(n)}" y="${H - 8}" text-anchor="${n === 1 ? "start" : n === maxN ? "end" : "middle"}" font-size="11" style="fill:var(--text-2)">${n} samples</text>`).join("");
    const mark = S.qty <= maxN ? `<line x1="${X(S.qty)}" x2="${X(S.qty)}" y1="${T}" y2="${H - B}" stroke="var(--text-2)" stroke-dasharray="4 3"/>` : "";
    const legend = series.map((x, i) => `<span><i style="background:${COLORS[i % COLORS.length]}"></i>${esc(x.name)}</span>`).join("");
    return `<details class="curve"><summary>Cost curve: total cost (USD) against number of samples</summary>
      <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Total cost against sample count for ${esc(s.name)}">${grid}${mark}${paths}${xs}</svg>
      <div class="legend">${legend}</div><p class="muted small">Dashed line: your sample count. Full-service, priced offers only, at ${AUD_NAME[S.aud]} rates. Steps show where bulk prices begin.</p></details>`;
  }

  // ---------- compare tray and side-by-side ----------
  let compare = [];
  function toggleCompare(key, on) {
    const o = findOffer(key);
    if (on) {
      if (compare.length && findOffer(compare[0]).service !== o.service) { compare = []; toast("Compare works within one service. Started a new comparison."); }
      if (compare.length >= 4) { toast("You can compare up to 4 offers."); return false; }
      if (!compare.includes(key)) compare.push(key);
    } else compare = compare.filter(k => k !== key);
    renderTray();
    return true;
  }
  function renderTray() {
    $("tray").hidden = compare.length === 0;
    $("trayNames").textContent = compare.map(k => findOffer(k).provider).join(" · ");
    $("trayGo").disabled = compare.length < 2;
    $("trayGo").textContent = compare.length < 2 ? "Pick one more" : `Compare ${compare.length}`;
    document.querySelectorAll("[data-cmp]").forEach(cb => { cb.checked = compare.includes(cb.dataset.cmp); });
  }
  function openCompare() {
    const neutral = { ...S, q: "", region: "", type: "", budget: 0, scope: "all" };
    const items = compare.map(k => { const o = findOffer(k); return { o, r: L.rowsFor(o.service, neutral).find(x => x.o === o) }; });
    const s = SERVICES.find(x => x.id === items[0].o.service);
    const totals = items.map(i => i.r.total).filter(t => t != null);
    const win = totals.length > 1 ? Math.min(...totals) : null;
    const row = (label, fn, cls) => `<tr><th scope="row">${label}</th>${items.map(i => `<td class="${cls ? cls(i) : ""}">${fn(i)}</td>`).join("")}</tr>`;
    $("cmpSub").textContent = `${s.name} · ${plural(S.qty, "sample")} · ${AUD_NAME[S.aud]} rates. The lowest total is highlighted.`;
    $("cmpTable").innerHTML = `<thead><tr><th scope="col"><span class="sr-only">Attribute</span></th>${items.map(i => `<th scope="col">${esc(i.o.provider)}</th>`).join("")}</tr></thead><tbody>` +
      row("Price each", i => i.r.pick ? fmt(i.r.pick.t.currency, i.r.pick.t.price) + (i.r.pick.t.currency !== "USD" ? ` (≈ ${fmt("USD", i.r.unit)})` : "") : "Quote only") +
      row(`Total for ${S.qty}`, i => i.r.total != null ? fmt("USD", i.r.total) : "–", i => (win != null && i.r.total === win ? "win" : "")) +
      row("Price tiers", i => i.o.tiers.length ? L.tierTable(i.o).map(t => `${esc(t.who)}${t.from > 1 ? " from " + t.from : ""}: ${fmt(t.currency, t.price)}${t.first != null ? ` (first ${fmt(t.currency, t.first)})` : ""}`).join("<br>") : "None published") +
      row("Turnaround", i => i.o.turn ? esc(i.o.turn) : "Not stated") +
      row("Scope", i => i.o.partial ? "Partial: " + esc(i.o.note || "") : "Full service") +
      row("Type and place", i => esc(i.o.type) + " · " + esc(COUNTRY[i.o.country] || i.o.country)) +
      row("Notes", i => esc(i.o.note || "–")) +
      row("Price checked", i => i.o.tiers.length ? esc(checkedOn(i.o)) : "–") +
      row("Source", i => `<a href="${esc(i.o.source)}" target="_blank" rel="noopener">Provider page</a>`) +
      row("", i => `<button class="btn sm primary" data-quote="${i.o.service}" data-prov="${esc(i.o.provider)}">Request quote</button>`) + "</tbody>";
    $("cmp").showModal();
  }

  // ---------- project planner ----------
  const PLAN_KEY = "cro_plan";
  let plan = (() => {
    try {
      const p = JSON.parse(localStorage.getItem(PLAN_KEY) || "null");
      if (Array.isArray(p) && p.length) return p.filter(l => SERVICES.some(s => s.id === l.service)).map(l => ({ service: l.service, qty: Math.max(1, parseInt(l.qty, 10) || 1) }));
    } catch (e) { /* ignore */ }
    return [{ service: "plasmid", qty: 12 }, { service: "rnaseq", qty: 6 }];
  })();
  const savePlan = () => { try { localStorage.setItem(PLAN_KEY, JSON.stringify(plan)); } catch (e) { /* storage unavailable */ } };

  function renderPlanner() {
    const pc = L.planCalc(plan, S.aud);
    const lines = pc.rows.map((r, i) => `<div class="pline">
      <select data-pl="svc" data-i="${i}" aria-label="Service">${SERVICES.map(s => `<option value="${s.id}" ${s.id === r.l.service ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select>
      <input type="number" min="1" data-pl="qty" data-i="${i}" value="${r.l.qty}" aria-label="Quantity, ${esc(r.svc.unit)}">
      <span class="muted small">${esc(SERVICE_UNIT(r.svc))}s</span>
      <button class="btn sm" data-pl="del" data-i="${i}">Remove</button></div>`).join("");
    let result = "";
    if (pc.priced.length) {
      const mixLines = pc.priced.map(r => `<li>${esc(r.svc.name)} × ${r.l.qty}: <b>${esc(r.opts[0].o.provider)}</b> (${fmt(r.opts[0].t.currency, r.opts[0].t.price)} each, about ${fmt("USD", r.opts[0].cost)})</li>`).join("");
      const sing = pc.single.length
        ? `Single provider for every line: ${pc.single.slice(0, 4).map(x => `${esc(x.org)} about ${fmt("USD", x.total)}`).join(" · ")}${pc.single[0].total > pc.mix * 1.001 ? ` · mixing saves about ${fmt("USD", pc.single[0].total - pc.mix)}` : ""}`
        : "No single provider covers every line, so you would split the order.";
      result = `<div class="card planres"><div class="name">Cheapest overall (mixing providers): about ${fmt("USD", pc.mix)}</div><ul>${mixLines}</ul><p class="muted small" style="margin-top:8px">${sing}</p></div>`;
    }
    if (pc.missing.length) result += `<p class="muted">No public full-service price for: ${pc.missing.map(r => esc(r.svc.name) + " × " + r.l.qty).join("; ")}. Use "Request quote" for these.</p>`;
    $("planner").innerHTML = lines + '<p style="margin:4px 0 12px"><button class="btn sm" data-pl="add">Add a line</button></p>' + result;
  }

  // ---------- quote requests ----------
  const store = {
    get() { try { return JSON.parse(localStorage.getItem("cro_requests") || "[]"); } catch (e) { return []; } },
    set(v) { try { localStorage.setItem("cro_requests", JSON.stringify(v)); } catch (e) { alert("Could not save in this browser."); } }
  };
  const dlg = $("dlg"), BIG = ["design", "notes"];
  let current = null;

  function openForm(sid, prov, all) {
    const s = SERVICES.find(x => x.id === sid);
    current = { sid };
    $("dlgTitle").textContent = "Request a quote: " + s.name;
    $("dlgFields").innerHTML = L.REQUEST_FIELDS.map(([k, l, p]) => BIG.includes(k)
      ? `<div><label for="f_${k}">${l}</label><textarea id="f_${k}" rows="2" placeholder="${esc(p)}"></textarea></div>`
      : `<div><label for="f_${k}">${l}</label><input id="f_${k}" placeholder="${esc(p)}"></div>`).join("");
    $("dlgProvs").innerHTML = OFFERS.filter(o => o.service === sid).map(o =>
      `<label class="chk"><input type="checkbox" value="${esc(o.provider)}" ${all || o.provider === prov ? "checked" : ""}>${esc(o.provider)}</label>`).join("");
    $("dlgAsk").innerHTML = L.askList(sid).map(a => `<li>${esc(a)}</li>`).join("");
    $("dlgOut").value = ""; $("dlgCopy").textContent = "Copy request";
    dlg.showModal();
  }
  const formValues = () => { const v = {}; L.REQUEST_FIELDS.forEach(([k]) => { v[k] = $("f_" + k).value; }); return v; };
  const brief = () => L.briefText(current.sid, formValues());

  function renderRequests() {
    const list = store.get();
    $("requests").innerHTML = list.length ? list.map(r => {
      const s = SERVICES.find(x => x.id === r.service);
      const got = Object.entries(r.quotes).sort((a, b) => a[1].price * FX_TO_USD[a[1].currency] - b[1].price * FX_TO_USD[b[1].currency]);
      const cheapest = got.length > 1 ? got[0][0] : null;
      return `<div class="card"><div class="card-top"><div><span class="name">${esc(s.name)}</span><div class="meta"><span>${esc(r.date)}</span><span>${plural(r.providers.length, "provider")}</span><span>${plural(got.length, "quote")} logged</span></div></div>
        <div class="actions" style="margin:0"><button class="btn sm" data-copy="${r.id}">Copy request</button><button class="btn sm" data-del="${r.id}">Delete</button></div></div>
        ${r.providers.map(p => {
          const q = r.quotes[p], o = OFFERS.find(o => o.provider === p && o.service === r.service);
          const cm = community[r.service + "|" + p], chk = q && o ? L.quoteCheck(o, q, S.aud, cm ? cm.median : null) : "";
          return `<div class="qrow"><b>${esc(p)}</b> ${o ? `<a href="${esc(o.source)}" target="_blank" rel="noopener">contact page</a>` : ""} ${p === cheapest ? badge("good", "Cheapest quote") : ""}
            ${q ? `<div class="meta"><span>Quoted ${fmt(q.currency, q.price)} total for ${plural(q.units || 1, "unit")} (${fmt(q.currency, q.price / (q.units || 1))} each)</span>${q.days ? `<span>${esc(q.days)} days</span>` : ""}${q.notes ? `<span>${esc(q.notes)}</span>` : ""}</div>${chk ? `<div class="meta"><span>Check: ${esc(chk)}</span></div>` : ""}` : ""}
            <div class="qform"><input class="qp" type="number" step="any" min="0" placeholder="Total quoted price" aria-label="Total quoted price" value="${q ? q.price : ""}"><input class="qu" type="number" min="1" placeholder="Units (samples)" aria-label="Number of units quoted" value="${q ? q.units || 1 : ""}"><select class="qc" aria-label="Currency">${Object.keys(FX_TO_USD).map(c => `<option ${q && q.currency === c ? "selected" : ""}>${c}</option>`).join("")}</select>
            <input class="qd" placeholder="Days" aria-label="Turnaround in days" value="${q ? esc(q.days) : ""}"><input class="qn" placeholder="Notes" aria-label="Notes" value="${q ? esc(q.notes) : ""}"><button class="btn sm" data-saveq="${r.id}|${esc(p)}">Save</button></div>
            ${q && q.shared ? '<div class="share">Shared anonymously. Thank you.</div>' : '<label class="share"><input class="qs" type="checkbox" checked> Share price anonymously (no name, notes or contact details) to help others compare</label>'}</div>`;
        }).join("")}</div>`;
    }).join("") : '<div class="empty"><p class="muted">No requests yet. Click "Request quote" on any provider.</p></div>';
  }

  // ---------- community quotes ----------
  const API_ROOT = (window.API_BASE || "") + "/api/collections";
  const API = API_ROOT + "/quotes/records";
  // The static GitHub Pages site has no API until config.js points at one: skip the requests that would only fail.
  const API_OFF = location.hostname.endsWith(".github.io") && !window.API_BASE;
  async function loadCommunity() {
    if (API_OFF) return;
    try {
      const res = await fetch(API + "?perPage=500&sort=-created&fields=service,provider,price,currency");
      if (!res.ok) return;
      community = L.communityStats((await res.json()).items || []);
      render();
      if (!$("requests").contains(document.activeElement)) renderRequests();
    } catch (e) { /* offline: the site still works from the built-in data */ }
  }
  async function shareQuote(service, provider, q) {
    try {
      const units = q.units || 1, per = Math.round(q.price / units * 100) / 100;
      if (!(per >= 0.01)) return false;
      const body = { service, provider, price: per, currency: q.currency, qty: units };
      if (q.days !== "" && !isNaN(+q.days)) body.days = +q.days;
      const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return res.ok;
    } catch (e) { return false; }
  }

  // ---------- feedback ----------
  const fb = $("fb");
  let fbCtx = { service: "", provider: "" };
  function openFeedback(kind, sid, prov) {
    fbCtx = { service: sid || "", provider: prov || "" };
    $("fbKind").value = kind;
    $("fbAbout").textContent = prov ? "About: " + prov + (sid ? " (" + SERVICES.find(s => s.id === sid).name + ")" : "") : "";
    $("fbMsg").value = ""; $("fbWeb").value = ""; $("fbStatus").textContent = ""; $("fbSend").disabled = false;
    fb.showModal();
  }
  async function sendFeedback() {
    const message = $("fbMsg").value.trim();
    if (message.length < 3) { $("fbStatus").textContent = "Please add a few words of detail."; return; }
    if ($("fbWeb").value) { fb.close(); return; } // honeypot: a person never fills this
    const body = { kind: $("fbKind").value, message, service: fbCtx.service, provider: fbCtx.provider, contact: $("fbContact").value.trim() };
    $("fbSend").disabled = true; $("fbStatus").textContent = "Sending...";
    try {
      if (API_OFF) throw new Error("no API on the static site");
      const res = await fetch(API_ROOT + "/feedback/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.status === 429) { $("fbStatus").textContent = "Too many submissions from this network. Please try again later."; $("fbSend").disabled = false; return; }
      if (!res.ok) throw new Error("status " + res.status);
      $("fbStatus").textContent = "Thank you. This has been sent."; $("fbMsg").value = "";
    } catch (err) {
      // No API reachable (for example the static site): fall back to a pre-filled GitHub issue.
      const title = "[" + body.kind + "] " + (body.provider || "General");
      const text = (body.service ? "Service: " + body.service + "\n" : "") + (body.provider ? "Provider: " + body.provider + "\n" : "") + "\n" + message;
      $("fbStatus").innerHTML = 'The feedback server is not reachable from this page. <a target="_blank" rel="noopener" href="https://github.com/' + esc(window.REPO) +
        "/issues/new?title=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(text) + '">Open a pre-filled GitHub issue instead</a> (needs a free GitHub account).';
      $("fbSend").disabled = false;
    }
  }

  // ---------- events ----------
  function bind() {
    $("q").addEventListener("input", e => setState({ q: e.target.value.slice(0, 80) }, { keepFields: true }));
    $("sort").addEventListener("change", e => setState({ sort: e.target.value }));
    $("region").addEventListener("change", e => setState({ region: e.target.value }));
    $("type").addEventListener("change", e => setState({ type: e.target.value }));
    $("fullOnly").addEventListener("change", e => setState({ scope: e.target.checked ? "full" : "all" }));
    $("budget").addEventListener("input", e => { const b = parseFloat(e.target.value); setState({ budget: b > 0 ? b : 0 }, { keepFields: true }); });
    const qtyVal = () => Math.min(100000, Math.max(1, parseInt($("qty").value, 10) || 1));
    $("qty").addEventListener("input", () => setState({ qty: qtyVal() }, { keepFields: true }));
    $("qty").addEventListener("blur", () => { $("qty").value = S.qty; });
    $("qtyUp").onclick = () => setState({ qty: Math.min(100000, S.qty + 1) });
    $("qtyDown").onclick = () => setState({ qty: Math.max(1, S.qty - 1) });
    $("aud").addEventListener("click", e => { const b = e.target.closest("[data-aud]"); if (b) setState({ aud: b.dataset.aud }); });
    $("chips").addEventListener("click", e => {
      if (e.target.closest("#helpMe")) { $("guide").showModal(); return; }
      const b = e.target.closest("[data-svc]"); if (b) setState({ svc: b.dataset.svc });
    });
    $("goalGrid").addEventListener("click", e => {
      const b = e.target.closest("[data-goal]"); if (!b) return;
      $("guide").close(); setState({ svc: b.dataset.goal }); $("results").scrollIntoView();
    });
    $("guideClose").onclick = () => $("guide").close();
    $("viewCards").onclick = () => setState({ view: "cards" });
    $("viewTable").onclick = () => setState({ view: "table" });
    $("clearBtn").onclick = () => setState({ q: "", svc: "", scope: "all", sort: "price", region: "", type: "", budget: 0 });
    $("csv").onclick = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([L.csvFor(lastGroups, S)], { type: "text/csv" }));
      a.download = "cro-compare.csv"; a.click(); URL.revokeObjectURL(a.href);
    };
    $("printBtn").onclick = () => window.print();
    $("linkBtn").onclick = async () => {
      try { await navigator.clipboard.writeText(location.href); toast("Link to this view copied"); } catch (e) { toast("Copy the address bar to share this view"); }
    };
    $("themeBtn").onclick = () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("cro_theme", next); } catch (e) { /* ignore */ }
      syncTheme();
    };
    document.querySelectorAll("[data-scroll]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); $(a.dataset.scroll).scrollIntoView(); }));
    document.addEventListener("keydown", e => {
      if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !document.querySelector("dialog[open]")) { e.preventDefault(); $("q").focus(); }
    });

    // results area: quote, report, compare, clear
    $("results").addEventListener("change", e => {
      const cb = e.target.closest("[data-cmp]"); if (!cb) return;
      if (!toggleCompare(cb.dataset.cmp, cb.checked)) cb.checked = false;
    });
    $("trayGo").onclick = openCompare;
    $("trayClear").onclick = () => { compare = []; renderTray(); };
    $("cmpClose").onclick = () => $("cmp").close();

    // planner
    $("planner").addEventListener("change", e => {
      const el = e.target.closest("[data-pl]"); if (!el) return;
      const i = +el.dataset.i;
      if (el.dataset.pl === "svc") plan[i].service = el.value;
      if (el.dataset.pl === "qty") plan[i].qty = Math.max(1, parseInt(el.value, 10) || 1);
      savePlan(); renderPlanner();
    });
    $("planner").addEventListener("click", e => {
      const el = e.target.closest("button[data-pl]"); if (!el) return;
      if (el.dataset.pl === "del") plan.splice(+el.dataset.i, 1);
      if (el.dataset.pl === "add") plan.push({ service: "sanger", qty: 1 });
      savePlan(); renderPlanner();
    });

    // quote dialog
    $("dlgBuild").onclick = () => { $("dlgOut").value = brief(); };
    $("dlgCopy").onclick = async () => {
      $("dlgOut").value = brief();
      try { await navigator.clipboard.writeText($("dlgOut").value); } catch (e) { $("dlgOut").select(); document.execCommand("copy"); }
      $("dlgCopy").textContent = "Copied";
    };
    $("dlgSave").onclick = () => {
      const provs = [...$("dlgProvs").querySelectorAll("input:checked")].map(i => i.value);
      if (!provs.length) return alert("Pick at least one provider.");
      const fields = {}; L.REQUEST_FIELDS.forEach(([k]) => { fields[k] = $("f_" + k).value.trim(); });
      const list = store.get();
      list.unshift({ id: Date.now(), date: new Date().toISOString().slice(0, 10), service: current.sid, fields, text: brief(), providers: provs, quotes: {} });
      store.set(list); dlg.close(); renderRequests();
      $("req-h").scrollIntoView(); toast("Saved to My quote requests");
    };
    $("dlgClose").onclick = () => dlg.close();

    // feedback
    const fbStart = e => { e.preventDefault(); openFeedback("idea"); };
    $("fbOpen").onclick = fbStart; $("fbOpen2").onclick = fbStart;
    $("providerBtn").onclick = () => { openFeedback("other"); $("fbMsg").value = "I represent: \nListing(s) to correct or add: \nLink to our current price page or list: \n"; };
    $("fbClose").onclick = () => fb.close();
    $("fbSend").onclick = sendFeedback;

    // everything else that is click-driven
    document.addEventListener("click", e => {
      const q = e.target.closest("[data-quote]"); if (q) { if ($("cmp").open) $("cmp").close(); return openForm(q.dataset.quote, q.dataset.prov); }
      const qa = e.target.closest("[data-quote-all]"); if (qa) return openForm(qa.dataset.quoteAll, null, true);
      const rp = e.target.closest("[data-report]"); if (rp) { e.preventDefault(); const [sid, prov] = rp.dataset.report.split("|"); return openFeedback("price", sid, prov); }
      if (e.target.closest("[data-clear]")) return $("clearBtn").onclick();
      const d = e.target.closest("[data-del]");
      if (d) { if (confirm("Delete this request?")) { store.set(store.get().filter(r => r.id != d.dataset.del)); renderRequests(); } return; }
      const c = e.target.closest("[data-copy]");
      if (c) { const r = store.get().find(x => x.id == c.dataset.copy); navigator.clipboard.writeText(r.text).then(() => { c.textContent = "Copied"; }); return; }
      const sv = e.target.closest("[data-saveq]");
      if (sv) {
        const [id, prov] = sv.dataset.saveq.split("|"), box = sv.closest(".qrow");
        const list = store.get(), r = list.find(x => x.id == id), price = parseFloat(box.querySelector(".qp").value);
        if (isNaN(price) || price <= 0) return alert("Enter the total quoted price.");
        const units = Math.max(1, Math.round(parseFloat(box.querySelector(".qu").value) || 1));
        const qd = { price, units, currency: box.querySelector(".qc").value, days: box.querySelector(".qd").value, notes: box.querySelector(".qn").value };
        const share = box.querySelector(".qs") && box.querySelector(".qs").checked && !(r.quotes[prov] && r.quotes[prov].shared);
        qd.shared = !!(r.quotes[prov] && r.quotes[prov].shared);
        r.quotes[prov] = qd;
        if (share) shareQuote(r.service, prov, qd).then(ok => { qd.shared = ok; store.set(list); renderRequests(); loadCommunity(); });
        store.set(list); renderRequests();
      }
    });
  }

  function syncTheme() {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    $("themeBtn").setAttribute("aria-pressed", String(dark));
    $("themeBtn").textContent = dark ? "Light" : "Dark";
  }

  // ---------- start ----------
  buildStatic(); bind(); syncTheme(); syncControls(); render(); renderRequests(); loadCommunity();
})();
