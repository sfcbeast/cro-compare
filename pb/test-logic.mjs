// Unit tests for pb_public/logic.js against the real catalog. Run: node pb/test-logic.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
globalThis.window = {};
require("./pb_public/data.js");
const L = require("./pb_public/logic.js")(window);
const { OFFERS } = window;

let fail = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  " + extra)); if (!ok) fail++; };
const near = (a, b, eps = 0.005) => Math.abs(a - b) < eps;
const offer = (service, provider) => OFFERS.find(o => o.service === service && o.provider === provider);
const ST = (o = {}) => ({ q: "", svc: "", aud: "external", qty: 1, scope: "all", sort: "price", region: "", type: "", budget: 0, ...o });

// ---- formatting
check("fmt whole dollars", L.fmt("USD", 5) === "$5");
check("fmt cents", L.fmt("USD", 5.5) === "$5.50");
check("fmt thousands", L.fmt("USD", 1423.5) === "$1,423.50");
check("fmt CAD symbol", L.fmt("CAD", 19.5) === "C$19.50");

// ---- tiers
const chi = offer("sanger", "University of Chicago DNA Sequencing Core");
check("UChicago industry, 20 samples -> $10.45", L.pickTier(chi, "industry", 20).t.price === 10.45);
check("UChicago academic, 100 samples -> $5", L.pickTier(chi, "external", 100).t.price === 5);
check("UChicago academic, 1 sample -> $8.75", L.pickTier(chi, "external", 1).t.price === 8.75);
const asu = offer("rnaseq", "ASU Genomics Core (Lexogen 3' mRNA library prep)");
const asuInd = L.pickTier(asu, "industry", 1);
check("industry falls back to external rate and says so", asuInd && asuInd.t.price === 108 && asuInd.exact === false);
const boise = offer("amplicon", "Boise State Sequencing Core");
check("minimum order: no pick below 100", L.pickTier(boise, "external", 10) === null);
check("minimum order: entry tier reports the minimum", L.entryTier(boise, "external").minQty === 100);
check("quote-only offer has no pick", L.pickTier(offer("sanger", "Eton Bioscience"), "external", 1) === null);
check("tier table lists every tier", L.tierTable(chi).length === 6);

// ---- volume tips
const mgh = offer("sanger", "MGH CCIB DNA Core");
const tip = L.volumeTip(mgh, L.pickTier(mgh, "external", 80), 80);
check("MGH tip at 80 samples: 95 costs $342 < $460", tip && tip.minQty === 95 && near(tip.total, 342) && near(tip.current, 460), JSON.stringify(tip));
check("no tip when already at bulk tier", L.volumeTip(mgh, L.pickTier(mgh, "external", 100), 100) === null);
const byu = offer("sanger", "BYU Genomics & Bioinformatics Center");
check("no tip when bulk tier would cost more in total", L.volumeTip(byu, L.pickTier(byu, "external", 10), 10) === null);

// ---- filtering, ranking
let rows = L.sortRows(L.rowsFor("sanger", ST({ qty: 100 })), "price");
check("Sanger @100 academic: cheapest is Nevada ($5/unit tie broken by name)", rows[0].o.provider.startsWith("Nevada") || rows[0].o.provider.startsWith("MGH"), rows[0].o.provider);
check("Sanger @100 academic: MGH bulk $3.60 -> $360", near(rows.find(r => r.o.provider.startsWith("MGH")).total, 360));
check("quote-only rows sort last", rows[rows.length - 1].total === null);
check("full-service filter hides partial scope", L.rowsFor("rnaseq", ST({ scope: "full" })).every(r => !r.o.partial));
check("partial rows exist when not filtered", L.rowsFor("rnaseq", ST()).some(r => r.o.partial));
check("region filter: Canada plasmid -> only Guelph", (r => r.length === 1 && r[0].o.provider.includes("Guelph"))(L.rowsFor("plasmid", ST({ region: "CA" }))));
check("region filter: UK & Europe includes Novogene and Eurofins EU", (r => r.some(x => x.o.provider.includes("Novogene")) && r.some(x => x.o.provider.includes("(EU)")))(L.rowsFor("plasmid", ST({ region: "UK-EU" }))));
check("type filter: Commercial only", L.rowsFor("plasmid", ST({ type: "Commercial" })).every(r => r.o.type === "Commercial"));
check("budget flags over-budget offers", (r => r.find(x => x.o.provider.startsWith("UT Dallas")).overBudget && !r.find(x => x.o.provider.startsWith("Nevada")).overBudget)(L.rowsFor("sanger", ST({ qty: 100, budget: 600 }))));
check("search by provider name keeps only that provider", (r => r.length === 1 && r[0].o.provider.includes("Plasmidsaurus"))(L.rowsFor("plasmid", ST({ q: "plasmidsaurus" }))));
check("search by service word keeps all providers", L.rowsFor("plasmid", ST({ q: "nanopore" })).length === OFFERS.filter(o => o.service === "plasmid").length);
check("serviceVisible: ngs finds RNA-seq", (s => L.serviceVisible(s, ST({ q: "ngs" })))(window.SERVICES.find(s => s.id === "rnaseq")));
check("serviceVisible: svc filter excludes others", !L.serviceVisible(window.SERVICES.find(s => s.id === "sanger"), ST({ svc: "plasmid" })));

const fast = L.sortRows(L.rowsFor("plasmid", ST()), "fast").map(r => r.o.provider);
check("fastest plasmid first is a 1-day provider", [offer("plasmid", "University of Guelph Genomics"), offer("plasmid", "Eurofins Genomics (US)")].some(o => o.provider === fast[0]), fast[0]);
check("providers without stated turnaround sort after those with it", fast.indexOf("Azenta / Genewiz (Plasmid-EZ)") > fast.indexOf("GenScript (nanopore)"));

// ---- best value
let bv = L.bestValue(L.rowsFor("rnaseq", ST()));
check("RNA-seq: cheapest full-service is Plasmidsaurus, never a partial-scope row", bv.cheapest && bv.cheapest.o.provider.includes("Plasmidsaurus"));
check("RNA-seq: only one eligible row, so no spread claim", bv.spread === null && bv.pricedCount === 1);
bv = L.bestValue(L.rowsFor("sanger", ST({ qty: 100 })));
check("Sanger: spread ratio and saving are consistent", bv.spread && near(bv.spread.save, bv.spread.dearest.total - bv.spread.cheapest.total) && bv.spread.ratio > 1);
bv = L.bestValue(L.rowsFor("viability", ST()));
check("quote-only service has no cheapest", bv.cheapest === null);
const none = L.bestValue(L.rowsFor("sanger", ST({ qty: 100, budget: 1 })));
check("budget of $1: nothing eligible", none.cheapest === null);

// ---- cost curve
const cv = L.curveSeries(L.rowsFor("sanger", ST()), "external", 1);
check("curve: series per full-service priced provider, 100 points", cv && cv.series.length >= 4 && cv.maxN === 100 && cv.series[0].pts.length === 100);
check("curve: none when fewer than two providers", L.curveSeries(L.rowsFor("rnaseq", ST({ scope: "full" })), "external", 1) === null);

// ---- planner
let plan = L.planCalc([{ service: "plasmid", qty: 10 }, { service: "rnaseq", qty: 8 }], "external");
check("planner: mixing total $500", near(plan.mix, 500), String(plan.mix));
check("planner: Plasmidsaurus alone $550 and mixing saves $50", plan.single[0].org === "Plasmidsaurus" && near(plan.single[0].total, 550));
plan = L.planCalc([{ service: "plasmid", qty: 12 }, { service: "viability", qty: 3 }], "external");
check("planner: quote-only line reported as missing", plan.missing.length === 1 && plan.missing[0].svc.id === "viability");
plan = L.planCalc([{ service: "plasmid", qty: 12 }], "external");
check("planner: Genewiz Plasmid-EZ ($10 x 12 = $120) beats Guelph (C$19.50 x 12 x 0.73 = $170.82)", near(plan.mix, 120));

// ---- quotes
const guelph = offer("plasmid", "University of Guelph Genomics");
const hi = L.quoteCheck(guelph, { price: 300, units: 10, currency: "USD" }, "external", null);
check("quote check: $30/plasmid is 111% above Guelph public price", hi.startsWith("111% above their public price"), hi);
check("quote check: in line", L.quoteCheck(guelph, { price: 142, units: 10, currency: "USD" }, "external", null).startsWith("in line"));
check("quote check: too low", L.quoteCheck(guelph, { price: 50, units: 10, currency: "USD" }, "external", null).includes("below"));
const nebi = offer("viability", "NEBiolab");
check("quote check: community median used for quote-only", L.quoteCheck(nebi, { price: 900, units: 1, currency: "USD" }, "external", 450).startsWith("100% above the community median"));
check("quote check: nothing to compare with", L.quoteCheck(nebi, { price: 900, units: 1, currency: "USD" }, "external", null) === "");
check("quote check: partial-scope public price is not used", L.quoteCheck(asu, { price: 1000, units: 1, currency: "USD" }, "external", null) === "");

// ---- community stats
const cs = L.communityStats([
  { service: "viability", provider: "NEBiolab", price: 400, currency: "USD" },
  { service: "viability", provider: "NEBiolab", price: 600, currency: "USD" },
  { service: "viability", provider: "NEBiolab", price: 1000, currency: "USD" },
  { service: "viability", provider: "Unknown Co", price: 5, currency: "USD" },
  { service: "viability", provider: "NEBiolab", price: 5, currency: "JPY" },
  { service: "viability", provider: "NEBiolab", price: -3, currency: "USD" }
]);
check("community: median of 3 is 600, junk ignored", cs["viability|NEBiolab"].n === 3 && cs["viability|NEBiolab"].median === 600 && !cs["viability|Unknown Co"]);
check("community: even count median", L.median([1, 2, 3, 4]) === 2.5);

// ---- request text and export
const brief = L.briefText("rnaseq", { compounds: "24 samples", timeline: "4 weeks" });
check("brief: includes fields and numbered questions", brief.includes("RNA-seq") && brief.includes("Compounds / samples: 24 samples") && brief.includes("1. ") && brief.includes("minimum order"));
check("brief: skips empty fields", !brief.includes("Design:"));
const g = [{ s: window.SERVICES.find(s => s.id === "sanger"), rows: L.sortRows(L.rowsFor("sanger", ST({ qty: 20 })), "price") }];
const csv = L.csvFor(g, ST({ qty: 20 }));
check("csv: header + one line per offer", csv.split("\n").length === 1 + g[0].rows.length);
check("csv: quote-only rows say so", csv.includes('"quote only"'));
const tricky = { s: { name: "Svc" }, rows: [{ o: { provider: 'He said "hi", twice', type: "CRO", country: "US", source: "https://x.test" }, pick: null }] };
check("csv: embedded quotes and commas are escaped", L.csvFor([tricky], ST()).includes('"He said ""hi"", twice"'));

console.log(fail ? "\n" + fail + " FAILED" : "\nall passed");
process.exit(fail ? 1 : 0);
