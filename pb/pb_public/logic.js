// Pure comparison logic: no DOM, no network. Used by app.js in the browser and by test-logic.mjs in Node.
// Usage: const L = CROLogic(window)   (window carries OFFERS, SERVICES, FX_TO_USD, SERVICE_META, VERIFIED_ON)
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else root.CROLogic = factory;
})(typeof self !== "undefined" ? self : this, function CROLogic(data) {
  const { OFFERS, SERVICES, FX_TO_USD, SERVICE_META } = data;
  const SYM = { USD: "$", EUR: "€", GBP: "£", CAD: "C$" };

  const usd = (t, v) => v * FX_TO_USD[t.currency];
  // Cost of `qty` units under one tier, in the tier's own currency. A tier may carry `first`: the price of the
  // first unit when it differs from the rest (for example "$633.70 for the first sample, $423.80 each additional").
  const lineCost = (t, qty) => (t.first != null ? t.first + (qty - 1) * t.price : t.price * qty);
  // Round to cents first: 34.7 * 200 is 6940.000000000001 in floating point and must still read "$6,940".
  const fmt = (cur, v) => {
    const c = Math.round(v * 100) / 100;
    return SYM[cur] + c.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(c) ? 0 : 2, maximumFractionDigits: 2 });
  };

  // ---- tiers -------------------------------------------------------------
  // Pick the tier that applies to this user type and quantity. `exact:false` means an external rate was
  // used because no rate was listed for the requested (industry) user type.
  function pickTier(offer, aud, qty) {
    const fits = t => qty >= (t.minQty || 1);
    const best = list => list.filter(fits).sort((a, b) => (b.minQty || 1) - (a.minQty || 1))[0];
    let t = best(offer.tiers.filter(x => x.for === aud));
    if (t) return { t, exact: true };
    t = best(offer.tiers.filter(x => x.for === "any"));
    if (t) return { t, exact: true };
    t = best(offer.tiers.filter(x => x.for === "external"));
    if (t) return { t, exact: false };
    return null;
  }

  // The lowest tier that exists for this user type, even if the quantity is below its minimum.
  function entryTier(offer, aud) {
    return offer.tiers.filter(t => [aud, "any", "external"].includes(t.for))
      .sort((a, b) => (a.minQty || 1) - (b.minQty || 1))[0] || null;
  }

  // All tiers for display, grouped by who they apply to.
  const AUD_LABEL = { external: "Academic / external", industry: "Industry", any: "All users" };
  function tierTable(offer) {
    return offer.tiers.slice().sort((a, b) =>
      ["external", "industry", "any"].indexOf(a.for) - ["external", "industry", "any"].indexOf(b.for) || (a.minQty || 1) - (b.minQty || 1))
      .map(t => ({ who: AUD_LABEL[t.for], from: t.minQty || 1, price: t.price, first: t.first, currency: t.currency, label: t.label || "" }));
  }

  // If ordering more unlocks a bulk tier whose total is lower than the current total, return it.
  function volumeTip(offer, pick, qty) {
    if (!pick || pick.t.priceHigh) return null;
    const cur = lineCost(pick.t, qty);
    let best = null;
    offer.tiers.filter(t => t.for === pick.t.for && t.currency === pick.t.currency && (t.minQty || 1) > qty).forEach(t => {
      const total = lineCost(t, t.minQty);
      if (total < cur && (!best || total < best.total)) best = { minQty: t.minQty, total, current: cur, currency: pick.t.currency };
    });
    return best;
  }

  // ---- filtering and ranking ---------------------------------------------
  const REGIONS = [["", "Any region"], ["US", "United States"], ["CA", "Canada"], ["UK-EU", "UK & Europe"], ["AU", "Australia"]];
  const regionOf = c => ({ US: "US", CA: "CA", UK: "UK-EU", EU: "UK-EU", AU: "AU" }[c] || "other");
  const TYPES = ["Core facility", "Commercial", "CRO"];

  const serviceText = s => (s.name + " " + s.category + " " + SERVICE_META[s.id].kw + " " + SERVICE_META[s.id].goal).toLowerCase();
  const providerMatches = (o, q) => o.provider.toLowerCase().includes(q) || (o.org || "").toLowerCase().includes(q);

  // Does this service appear for the current search / service filter?
  function serviceVisible(s, st) {
    if (st.svc && s.id !== st.svc) return false;
    const q = (st.q || "").trim().toLowerCase();
    if (!q) return true;
    return serviceText(s).includes(q) || OFFERS.some(o => o.service === s.id && providerMatches(o, q));
  }

  // Offers for one service with the user's filters applied, each with its price pick and totals in USD.
  function rowsFor(sid, st) {
    const s = SERVICES.find(x => x.id === sid);
    const q = (st.q || "").trim().toLowerCase();
    const svcHit = !q || serviceText(s).includes(q);
    return OFFERS.filter(o => o.service === sid
        && !(st.scope === "full" && o.partial)
        && (!st.region || regionOf(o.country) === st.region)
        && (!st.type || o.type === st.type)
        && (svcHit || providerMatches(o, q)))
      .map(o => {
        const pick = pickTier(o, st.aud, st.qty);
        const total = pick ? usd(pick.t, lineCost(pick.t, st.qty)) : null;
        const unit = total == null ? null : total / st.qty; // average per unit, in USD
        return { o, pick, unit, total, overBudget: !!(st.budget > 0 && total != null && total > st.budget) };
      });
  }

  function sortRows(rows, sort) {
    const byName = (a, b) => a.o.provider.localeCompare(b.o.provider);
    const byPrice = (a, b) => (a.total ?? Infinity) - (b.total ?? Infinity);
    const arr = rows.slice();
    if (sort === "name") return arr.sort(byName);
    if (sort === "fast") return arr.sort((a, b) => ((a.o.days ?? Infinity) - (b.o.days ?? Infinity)) || byPrice(a, b) || byName(a, b));
    return arr.sort((a, b) => byPrice(a, b) || byName(a, b));
  }

  // Rows that can honestly be called "the cheapest": priced, verified, full scope, and within budget.
  const eligible = rows => rows.filter(r => r.pick && r.o.verified && !r.o.partial && !r.overBudget && r.total != null);

  function bestValue(rows) {
    const el = eligible(rows).sort((a, b) => a.total - b.total);
    const cheapest = el[0] || null;
    const withDays = rows.filter(r => r.o.days != null && !r.o.partial && !r.overBudget)
      .sort((a, b) => (a.o.days - b.o.days) || ((a.total ?? Infinity) - (b.total ?? Infinity)));
    const fastest = withDays[0] || null;
    let spread = null;
    if (el.length >= 2) {
      const hi = el[el.length - 1];
      spread = { cheapest: el[0], dearest: hi, ratio: hi.total / el[0].total, save: hi.total - el[0].total };
    }
    return { cheapest, fastest, spread, pricedCount: el.length };
  }

  function serviceStats(rows) {
    const priced = rows.filter(r => r.total != null).map(r => r.total);
    return { providers: rows.length, priced: priced.length, lo: priced.length ? Math.min(...priced) : null, hi: priced.length ? Math.max(...priced) : null };
  }

  // Total cost against sample count, for the cost-curve chart.
  function curveSeries(rows, aud, qty) {
    const lines = rows.filter(r => r.o.verified && !r.o.partial && pickTier(r.o, aud, 1) && !pickTier(r.o, aud, 1).t.priceHigh);
    if (lines.length < 2) return null;
    const maxN = Math.min(1000, Math.max(100, qty * 2));
    const series = lines.map(r => {
      const pts = [];
      for (let n = 1; n <= maxN; n++) { const p = pickTier(r.o, aud, n); pts.push([n, usd(p.t, lineCost(p.t, n))]); }
      return { name: r.o.provider, pts };
    });
    const maxY = Math.max(...series.map(x => x.pts[x.pts.length - 1][1]));
    return { series, maxN, maxY };
  }

  // ---- project planner ---------------------------------------------------
  function planCalc(plan, aud) {
    const rows = plan.map(l => ({
      l, svc: SERVICES.find(s => s.id === l.service),
      opts: OFFERS.filter(o => o.service === l.service && o.verified && !o.partial).map(o => {
        const pk = pickTier(o, aud, l.qty);
        return pk && !pk.t.priceHigh ? { o, t: pk.t, cost: usd(pk.t, lineCost(pk.t, l.qty)) } : null;
      }).filter(Boolean).sort((a, b) => a.cost - b.cost)
    }));
    const priced = rows.filter(r => r.opts.length), missing = rows.filter(r => !r.opts.length);
    const mix = priced.reduce((n, r) => n + r.opts[0].cost, 0);
    const orgs = [...new Set(priced.flatMap(r => r.opts.map(x => x.o.org)))];
    const single = orgs.map(org => {
      const picks = priced.map(r => r.opts.find(x => x.o.org === org));
      return picks.every(Boolean) ? { org, total: picks.reduce((n, x) => n + x.cost, 0) } : null;
    }).filter(Boolean).sort((a, b) => a.total - b.total);
    return { rows, priced, missing, mix, single };
  }

  // ---- received quotes ---------------------------------------------------
  // Compare a quote (per unit) with the provider's public price or, failing that, the community median (USD).
  function quoteCheck(offer, q, aud, communityMedian) {
    const per = q.price / (q.units || 1) * FX_TO_USD[q.currency];
    const pk = offer && !offer.partial && pickTier(offer, aud, q.units || 1);
    let ref = null, label = "";
    if (pk && !pk.t.priceHigh) { ref = usd(pk.t, lineCost(pk.t, q.units || 1)) / (q.units || 1); label = "their public price"; }
    else if (communityMedian != null) { ref = communityMedian; label = "the community median"; }
    if (!ref) return "";
    const ratio = per / ref, note = ` (about ${fmt("USD", ref)} per unit)`;
    if (ratio > 1.25) return Math.round((ratio - 1) * 100) + "% above " + label + note + ". Worth asking why.";
    if (ratio < 0.8) return Math.round((1 - ratio) * 100) + "% below " + label + note + ". Check what is excluded.";
    return "in line with " + label + note + ".";
  }

  const median = v => { const a = v.slice().sort((x, y) => x - y), n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; };

  // items: [{service, provider, price, currency}] from the API (price per unit). Unknown offers/currencies are ignored.
  function communityStats(items) {
    const by = {};
    items.forEach(r => {
      if (!OFFERS.some(o => o.service === r.service && o.provider === r.provider) || !FX_TO_USD[r.currency] || !(r.price > 0)) return;
      (by[r.service + "|" + r.provider] = by[r.service + "|" + r.provider] || []).push(r.price * FX_TO_USD[r.currency]);
    });
    const out = {};
    for (const [k, v] of Object.entries(by)) out[k] = { n: v.length, median: median(v), min: Math.min(...v), max: Math.max(...v) };
    return out;
  }

  // ---- quote request text ------------------------------------------------
  const REQUEST_FIELDS = [
    ["target", "Cell line / model", "e.g. HepG2, primary hepatocytes, HEK293 stable line"],
    ["readout", "Assay / readout", "e.g. CellTiter-Glo viability, luciferase reporter, IC50"],
    ["compounds", "Compounds / samples", "number, type, and amount you can supply"],
    ["design", "Design", "concentrations, replicates, time points, controls"],
    ["deliver", "Deliverables", "raw data, curves/IC50, report, plate maps"],
    ["timeline", "Timeline", "e.g. results within 4 weeks"],
    ["budget", "Budget (optional)", "approximate ceiling"],
    ["notes", "Other notes", "anything else a provider should know"]
  ];
  const askList = sid => [...SERVICE_META[sid].ask, ...data.COMMON_ASK];
  function briefText(sid, values) {
    const s = SERVICES.find(x => x.id === sid);
    const lines = ["Hello,", "", "I would like a quote for: " + s.name + "."];
    REQUEST_FIELDS.forEach(([k, label]) => { const v = (values[k] || "").trim(); if (v) lines.push(label + ": " + v); });
    lines.push("", "So that I can compare quotes fairly, please answer:");
    askList(sid).forEach((a, i) => lines.push((i + 1) + ". " + a));
    lines.push("", "Thank you");
    return lines.join("\n");
  }

  // ---- export ------------------------------------------------------------
  function csvFor(groups, st) {
    const q = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const lines = [["service", "provider", "type", "country", "user_type", "samples", "price_per_unit", "currency", "total", "partial_scope", "turnaround", "checked", "source"].join(",")];
    groups.forEach(({ s, rows }) => rows.forEach(({ o, pick }) => {
      const t = pick && pick.t;
      lines.push([s.name, o.provider, o.type, o.country, st.aud, st.qty, t ? t.price : "", t ? t.currency : "quote only",
        t ? +lineCost(t, st.qty).toFixed(2) : "", o.partial ? "yes" : "", o.turn || "", o.checked || data.VERIFIED_ON, o.source].map(q).join(","));
    }));
    return lines.join("\n");
  }

  return { usd, fmt, lineCost, pickTier, entryTier, tierTable, volumeTip, REGIONS, regionOf, TYPES, serviceVisible, rowsFor, sortRows, bestValue,
    serviceStats, curveSeries, planCalc, quoteCheck, median, communityStats, REQUEST_FIELDS, askList, briefText, csvFor, AUD_LABEL };
});
