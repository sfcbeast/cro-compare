// Validates pb_public/data.js. Run: node pb/check-data.mjs   (exits 1 on any problem)
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
globalThis.window = {};
require("./pb_public/data.js");
const { OFFERS, SERVICES, FX_TO_USD, SERVICE_META } = window;
const errs = [], seen = new Set();
const FOR = ["external", "industry", "any"];
for (const s of SERVICES) if (!SERVICE_META[s.id]) errs.push(`service ${s.id}: missing SERVICE_META`);
for (const o of OFFERS) {
  const id = `${o.service}|${o.provider}`;
  if (seen.has(id)) errs.push(`${id}: duplicate`); seen.add(id);
  if (!SERVICES.some(s => s.id === o.service)) errs.push(`${id}: unknown service`);
  if (!/^https?:\/\//.test(o.source || "")) errs.push(`${id}: missing/invalid source`);
  if (o.checked && !/^\d{4}-\d{2}-\d{2}$/.test(o.checked)) errs.push(`${id}: bad checked date`);
  if (!Array.isArray(o.tiers)) { errs.push(`${id}: tiers must be an array`); continue; }
  for (const t of o.tiers) {
    if (!FOR.includes(t.for)) errs.push(`${id}: bad tier audience "${t.for}"`);
    if (!(t.price > 0)) errs.push(`${id}: bad price ${t.price}`);
    if (!FX_TO_USD[t.currency]) errs.push(`${id}: unknown currency ${t.currency}`);
    if (t.minQty !== undefined && !(Number.isInteger(t.minQty) && t.minQty > 1)) errs.push(`${id}: bad minQty`);
    if (t.first !== undefined && !(t.first >= t.price)) errs.push(`${id}: first-unit price must be a number at least the per-unit price`);
  }
  // each audience's tiers must have a base tier (no minQty) or the card would hide the price for small orders silently
  for (const a of FOR) {
    const ts = o.tiers.filter(t => t.for === a);
    if (ts.length && !ts.some(t => !t.minQty) && !/minimum/i.test(o.note || "")) errs.push(`${id}: ${a} tiers all have minQty but note does not mention a minimum`);
    const prices = ts.sort((x, y) => (x.minQty || 1) - (y.minQty || 1)).map(t => t.price);
    for (let i = 1; i < prices.length; i++) if (prices[i] > prices[i - 1]) errs.push(`${id}: ${a} bulk tier costs more than a smaller tier`);
  }
  if (!o.verified && !o.tiers.length) errs.push(`${id}: unverified entry`);
  if (o.verified === false) errs.push(`${id}: unverified offers must not ship`);
}
const byService = {};
OFFERS.forEach(o => byService[o.service] = (byService[o.service] || 0) + 1);
console.log(`${OFFERS.length} offers, ${SERVICES.length} services`, byService);
console.log(`priced: ${OFFERS.filter(o => o.tiers.length).length}, quote-only: ${OFFERS.filter(o => !o.tiers.length).length}, partial scope: ${OFFERS.filter(o => o.partial).length}`);
if (errs.length) { console.error("PROBLEMS:\n" + errs.join("\n")); process.exit(1); }
console.log("data OK");
