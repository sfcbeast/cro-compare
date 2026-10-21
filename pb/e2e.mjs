// End-to-end browser tests. Starts a throwaway PocketBase (port 8092, temp data dir, migrations applied)
// and drives a real headless Edge through the page. Run: node pb/e2e.mjs
// Optional: SHOTS=1 node pb/e2e.mjs  saves screenshots to pb/shots/ for visual review.
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const EDGE = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
if (!EDGE) { console.error("Microsoft Edge not found"); process.exit(2); }
const PB_PORT = 8092, DBG_PORT = 9340, BASE = `http://127.0.0.1:${PB_PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- servers ----
const dataDir = mkdtempSync(join(tmpdir(), "cro-e2e-data-"));
const pbDir = join(here, "pb_migrations");
// PocketBase expects migrations next to its data dir; run it from `pb/` with a temp --dir.
const pb = spawn(join(here, "pocketbase.exe"), ["serve", `--http=127.0.0.1:${PB_PORT}`, `--dir=${dataDir}`, `--migrationsDir=${pbDir}`, `--publicDir=${join(here, "pb_public")}`], { cwd: here, stdio: "ignore" });
const userDir = mkdtempSync(join(tmpdir(), "cro-e2e-edge-"));
const edge = spawn(EDGE, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${DBG_PORT}`, `--user-data-dir=${userDir}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const cleanup = () => { try { pb.kill(); } catch {} try { edge.kill(); } catch {} setTimeout(() => { try { rmSync(dataDir, { recursive: true, force: true }); rmSync(userDir, { recursive: true, force: true }); } catch {} }, 800); };
process.on("exit", cleanup);

for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + "/api/health")).ok) break; } catch {} await sleep(250); }
let tabs; for (let i = 0; i < 60; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${DBG_PORT}/json`)).json(); if (tabs.some(t => t.type === "page")) break; } catch {} await sleep(250); }
const ws = new WebSocket(tabs.find(t => t.type === "page").webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);

let nextId = 0; const pending = {}; let problems = [];
ws.onmessage = m => {
  const d = JSON.parse(m.data);
  if (d.id && pending[d.id]) pending[d.id](d);
  if (d.method === "Runtime.exceptionThrown") problems.push("exception: " + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
  if (d.method === "Log.entryAdded" && d.params.entry.level === "error") problems.push("log: " + d.params.entry.text + " " + (d.params.entry.url || ""));
};
const send = (method, params = {}) => new Promise(r => { const i = ++nextId; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error("page error: " + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text)); return r.result.result.value; };
await send("Runtime.enable"); await send("Page.enable"); await send("Log.enable");

let navCount = 0;
async function load(hash = "", { width = 1280, height = 900, theme } = {}) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await send("Page.navigate", { url: `${BASE}/?n=${++navCount}${hash}` });
  await sleep(1400);
  if (theme) { await ev(`document.documentElement.setAttribute('data-theme','${theme}')`); await sleep(100); }
}
const $count = sel => ev(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
const $text = sel => ev(`(document.querySelector(${JSON.stringify(sel)})||{}).innerText||''`);
const click = sel => ev(`document.querySelector(${JSON.stringify(sel)}).click()`);
const setVal = (sel, v) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.value=${JSON.stringify(String(v))};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
const shot = async name => { if (!process.env.SHOTS) return; mkdirSync(join(here, "shots"), { recursive: true }); const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(join(here, "shots", name + ".png"), Buffer.from(r.result.data, "base64")); };

let fail = 0, total = 0;
async function test(name, fn) {
  total++; problems = [];
  try { await fn(); if (problems.length) throw new Error("console problems: " + problems.join(" | ")); console.log("PASS " + name); }
  catch (e) { fail++; console.log("FAIL " + name + "\n     " + e.message); }
}
const eq = (a, b, what) => { if (a !== b) throw new Error(`${what || "value"}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (c, what) => { if (!c) throw new Error(what || "assertion failed"); };

// ============================ tests ============================
await test("loads cleanly: 41 listings, 9 services, no console errors", async () => {
  await load("", { theme: "light" });
  eq(await $count("#results .card"), 41, "cards");
  eq(await $count("#results .svc-block"), 9, "service sections");
  eq(await $count("#chips [data-svc]"), 10, "chips (all + 9)");
  ok((await $text("#stats")).includes("41") && (await $text("#stats")).includes("listings"), "stats");
  await shot("01-desktop-light");
});

await test("service chip filters to one service and is reflected in the URL", async () => {
  await load();
  await click('#chips [data-svc="sanger"]'); await sleep(150);
  eq(await $count("#results .svc-block"), 1, "sections");
  ok((await ev("location.hash")).includes("svc=sanger"), "hash");
  eq(await ev(`document.querySelector('#chips [data-svc="sanger"]').getAttribute('aria-pressed')`), "true", "pressed");
  await click('#chips [data-svc=""]'); await sleep(150);
  eq(await $count("#results .svc-block"), 9, "back to all");
});

await test("industry rate and sample count change the price (UChicago tiers)", async () => {
  await load("#svc=sanger");
  await click('#aud [data-aud="industry"]'); await setVal("#qty", 20); await sleep(200);
  const card = await ev(`[...document.querySelectorAll('#results .card')].find(c=>c.innerText.includes('University of Chicago')).innerText`);
  ok(card.includes("$10.45") && card.includes("$209"), "industry 20 samples should be $10.45 each, $209 total: " + card.slice(0, 120));
  await setVal("#qty", 100); await click('#aud [data-aud="external"]'); await sleep(200);
  const c2 = await ev(`[...document.querySelectorAll('#results .card')].find(c=>c.innerText.includes('University of Chicago')).innerText`);
  ok(c2.includes("$5") && c2.includes("$500"), "academic 100 samples should be $5 each, $500 total");
});

await test("typing in the sample box does not rewrite the field underneath the user", async () => {
  await load();
  await setVal("#qty", ""); await sleep(150);
  eq(await ev(`document.getElementById('qty').value`), "", "field left empty while typing");
  eq(await ev(`document.getElementById('resultCount').innerText.includes('1 sample')`), true, "treated as 1 sample");
  await ev(`document.getElementById('qty').dispatchEvent(new Event('blur'))`);
  eq(await ev(`document.getElementById('qty').value`), "1", "normalised on blur");
});

await test("stepper buttons change the sample count", async () => {
  await load();
  await click("#qtyUp"); await click("#qtyUp"); await sleep(100);
  eq(await ev(`document.getElementById('qty').value`), "3");
  await click("#qtyDown"); await click("#qtyDown"); await click("#qtyDown"); await sleep(100);
  eq(await ev(`document.getElementById('qty').value`), "1", "never below 1");
});

await test("Full service only hides partial-scope offers", async () => {
  await load("#svc=rnaseq");
  ok((await $count("#results .badge.warn")) > 0, "partial badges present at first");
  await click("#fullOnly"); await sleep(150);
  const txt = await $text("#results");
  ok(!txt.includes("Partial scope"), "no partial scope left");
  ok(txt.includes("Plasmidsaurus"), "full-service offer remains");
});

await test("table view shows a sortable-looking comparison table", async () => {
  await load("#svc=plasmid&view=table&qty=10");
  eq(await $count("table.cmp"), 1, "table");
  ok((await $count("table.cmp tbody tr")) >= 8, "rows");
  ok((await $text("table.cmp thead")).toLowerCase().includes("total for 10"), "total column header");
  ok((await ev("location.hash")).includes("view=table"), "view in URL");
  await shot("02-table-view");
});

await test("region and type filters narrow the list", async () => {
  await load("#svc=plasmid&region=CA");
  eq(await $count("#results .card"), 1, "Canada only");
  ok((await $text("#results")).includes("Guelph"));
  await load("#svc=plasmid&type=Commercial");
  ok((await ev(`[...document.querySelectorAll('#results .meta')].every(m=>!m.innerText.includes('Core facility'))`)), "no core facilities when Commercial");
});

await test("budget marks over-budget offers and explains when nothing fits", async () => {
  await load("#svc=sanger&qty=100&budget=600");
  ok((await $count("#results .badge.danger")) > 0, "over-budget badge");
  await load("#svc=sanger&qty=100&budget=5");
  ok((await $text("#results")).includes("over your"), "callout when all over budget");
});

await test("search finds a provider and keeps only that provider", async () => {
  await load();
  await setVal("#q", "plasmidsaurus"); await sleep(200);
  const names = await ev(`[...document.querySelectorAll('#results .card .name')].map(n=>n.textContent)`);
  ok(names.length === 2 && names.every(n => n.includes("Plasmidsaurus")), "both Plasmidsaurus offers only: " + names.join(", "));
  await setVal("#q", "zzzzzz"); await sleep(150);
  ok((await $text("#results")).includes("No offers match"), "empty state");
  await click("#results [data-clear]"); await sleep(150);
  eq(await $count("#results .svc-block"), 9, "cleared");
});

await test("best-value tiles: lowest total, fastest, and an honest note when only one price exists", async () => {
  await load("#svc=plasmid&qty=10");
  const t = (await $text(".best")).toLowerCase();
  ok(t.includes("lowest total") && t.includes("fastest stated"), t);
  await load("#svc=rnaseq");
  ok((await $text(".best")).toLowerCase().includes("only public full-service price"), "single price note");
});

await test("quote-only services offer one request to all providers", async () => {
  await load("#svc=viability");
  ok((await $text(".callout")).includes("No public price"), "callout");
  await click("[data-quote-all]"); await sleep(200);
  eq(await ev(`document.getElementById('dlg').open`), true, "dialog open");
  eq(await $count("#dlgProvs input:checked"), 4, "all four providers ticked");
  await click("#dlgClose");
});

await test("compare tray: pick offers, open side-by-side, lowest total highlighted", async () => {
  await load("#svc=sanger&qty=50");
  await ev(`document.querySelectorAll('#results [data-cmp]')[0].click()`); await sleep(80);
  eq(await ev(`document.getElementById('tray').hidden`), false, "tray visible");
  eq(await ev(`document.getElementById('trayGo').disabled`), true, "needs two");
  await ev(`document.querySelectorAll('#results [data-cmp]')[1].click()`); await sleep(80);
  eq(await ev(`document.getElementById('trayGo').disabled`), false, "enabled with two");
  await click("#trayGo"); await sleep(200);
  eq(await ev(`document.getElementById('cmp').open`), true, "dialog");
  eq(await $count("#cmpTable thead th"), 3, "attribute + 2 providers");
  eq(await $count("#cmpTable td.win"), 1, "one highlighted winner");
  await shot("03-compare-dialog");
  await click("#cmpClose");
  await click("#trayClear"); await sleep(80);
  eq(await ev(`document.getElementById('tray').hidden`), true, "tray hidden after clear");
});

await test("compare is limited to 4 and to one service", async () => {
  await load("#svc=sanger");
  for (let i = 0; i < 5; i++) await ev(`document.querySelectorAll('#results [data-cmp]')[${i}].click()`);
  await sleep(100);
  eq(await $count("#results [data-cmp]:checked"), 4, "max 4");
  await click('#chips [data-svc=""]'); await sleep(100);
  await ev(`document.querySelector('#svc-plasmid [data-cmp]').click()`); await sleep(100);
  eq(await $count("#results [data-cmp]:checked"), 1, "new service starts a fresh comparison");
});

await test("project planner computes and edits", async () => {
  await load();
  await ev(`localStorage.setItem('cro_plan', JSON.stringify([{service:'plasmid',qty:10},{service:'rnaseq',qty:8}]))`);
  await load();
  const t = await $text("#planner");
  ok(t.includes("about $500") && t.includes("Plasmidsaurus about $550"), t);
  await ev(`(()=>{const i=document.querySelector('#planner input[data-pl=qty]');i.value='20';i.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(100);
  ok((await $text("#planner")).includes("about $600"), "20 plasmids at $10 + 8 RNA-seq at $50 = $600");
  await click('#planner [data-pl="add"]'); await sleep(100);
  eq(await $count("#planner .pline"), 3, "line added");
});

await test("service guide opens, picks a service, and closes", async () => {
  await load();
  await click("#helpMe"); await sleep(150);
  eq(await ev(`document.getElementById('guide').open`), true);
  eq(await $count("#goalGrid .goalbtn"), 9, "nine goals");
  await click('#goalGrid [data-goal="amplicon"]'); await sleep(200);
  eq(await ev(`document.getElementById('guide').open`), false, "closed");
  eq(await $count("#results .svc-block"), 1, "filtered to one service");
});

await test("quote request -> log a quote -> sanity check -> share to the community", async () => {
  await load("#svc=plasmid");
  await ev(`document.querySelector('[data-quote="plasmid"][data-prov="University of Guelph Genomics"]').click()`); await sleep(150);
  await setVal("#f_compounds", "10 plasmids");
  await click("#dlgBuild"); await sleep(80);
  const text = await ev(`document.getElementById('dlgOut').value`);
  ok(text.includes("10 plasmids") && text.includes("1. "), "request text");
  await click("#dlgSave"); await sleep(250);
  eq(await $count("#requests .qrow"), 1, "one provider row");
  await ev(`(()=>{const b=document.querySelector('.qrow');b.querySelector('.qp').value='300';b.querySelector('.qu').value='10';b.querySelector('[data-saveq]').click()})()`); await sleep(1200);
  const r = await $text("#requests");
  ok(r.includes("111% above their public price"), "sanity check text: " + r.slice(0, 300));
  ok(r.includes("Shared anonymously"), "shared");
  // community median should now show on... the shared provider has a public price, so check the API instead
  const api = await (await fetch(BASE + "/api/collections/quotes/records")).json();
  eq(api.items.length, 1, "one stored quote"); eq(api.items[0].price, 30, "stored per unit");
});

await test("feedback: validation, success, honeypot, and offline fallback", async () => {
  await load();
  await click("#fbOpen"); await sleep(100);
  await click("#fbSend"); await sleep(50);
  ok((await $text("#fbStatus")).includes("few words"), "empty message rejected");
  await setVal("#fbMsg", "E2E test message"); await click("#fbSend"); await sleep(700);
  ok((await $text("#fbStatus")).includes("Thank you"), "sent");
  await click("#fbClose"); await click("#fbOpen"); await sleep(80);
  await setVal("#fbMsg", "bot"); await setVal("#fbWeb", "spam"); await click("#fbSend"); await sleep(150);
  eq(await ev(`document.getElementById('fb').open`), false, "honeypot closes silently");
  await click("#fbOpen"); await sleep(80);
  await ev(`window.__f = window.fetch; window.fetch = () => Promise.reject(new Error('offline'))`);
  await setVal("#fbMsg", "offline test"); await click("#fbSend"); await sleep(300);
  ok((await $text("#fbStatus")).includes("pre-filled GitHub issue"), "fallback offered");
  await ev(`window.fetch = window.__f`);
  await click("#fbClose");
  await load(); await ev(`document.querySelector('[data-report]').click()`); await sleep(100);
  ok((await $text("#fbAbout")).startsWith("About:"), "per-card report knows its provider");
});

await test("CSV export contains a header and every visible offer", async () => {
  await load("#svc=sanger&qty=20");
  await ev(`window.__csv = null; const orig = URL.createObjectURL; URL.createObjectURL = b => { b.text().then(t => window.__csv = t); return orig.call(URL, b); }`);
  await click("#csv"); await sleep(300);
  const csv = await ev("window.__csv");
  ok(csv && csv.split("\n")[0].startsWith('service,provider'), "header");
  eq(csv.split("\n").length - 1, await $count("#results .card"), "one line per card");
});

await test("theme toggle switches and remembers", async () => {
  await load("", { theme: "light" });
  await click("#themeBtn"); await sleep(100);
  eq(await ev(`document.documentElement.getAttribute('data-theme')`), "dark");
  eq(await ev(`localStorage.getItem('cro_theme')`), "dark", "saved");
  await shot("04-desktop-dark");
  await load(); // fresh load picks the saved theme
  eq(await ev(`document.documentElement.getAttribute('data-theme')`), "dark", "restored");
  await ev(`localStorage.removeItem('cro_theme')`);
});

await test("a shared URL restores every control", async () => {
  await load("#svc=plasmid&aud=industry&qty=20&view=table&scope=full&sort=fast&region=UK-EU&type=Commercial&budget=500");
  eq(await ev(`document.getElementById('qty').value`), "20");
  eq(await ev(`document.querySelector('#aud [aria-checked=true]').dataset.aud`), "industry");
  eq(await ev(`document.getElementById('fullOnly').checked`), true);
  eq(await ev(`document.getElementById('sort').value`), "fast");
  eq(await ev(`document.getElementById('region').value`), "UK-EU");
  eq(await ev(`document.getElementById('type').value`), "Commercial");
  eq(await ev(`document.getElementById('budget').value`), "500");
  eq(await ev(`document.getElementById('more').open`), true, "more filters opened");
  eq(await $count("table.cmp"), 1, "table view");
});

await test("junk in the URL is ignored safely", async () => {
  await load("#svc=<script>&aud=hacker&qty=-5&view=evil&budget=abc&q=" + "x".repeat(200));
  eq(await $count("#results .svc-block"), 0 + await $count("#results .svc-block"));
  eq(await ev(`document.querySelector('#aud [aria-checked=true]').dataset.aud`), "external", "default user type");
  eq(await ev(`document.getElementById('qty').value`), "1");
});

await test("keyboard: / focuses the search box", async () => {
  await load();
  await ev(`document.body.focus(); document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }))`); await sleep(80);
  eq(await ev(`document.activeElement.id`), "q");
});

await test("print header is filled in", async () => {
  await load("#qty=12&aud=industry");
  const t = await ev(`document.getElementById('printHead').textContent`);
  ok(t.includes("12 samples") && t.includes("industry") && t.includes("confirm before ordering"), t);
});

await test("accessibility basics: every field has a name, every button has text, headings in order", async () => {
  await load();
  const unnamed = await ev(`[...document.querySelectorAll('input,select,textarea')].filter(e => e.type !== 'hidden' && !e.closest('[aria-hidden=true]') && !(e.labels && e.labels.length) && !e.getAttribute('aria-label') && !e.closest('[role=radiogroup]')).map(e => e.id || e.className)`);
  eq(unnamed.length, 0, "unlabelled fields: " + unnamed.join(", "));
  const emptyBtns = await ev(`[...document.querySelectorAll('button')].filter(b => !b.innerText.trim() && !b.getAttribute('aria-label')).length`);
  eq(emptyBtns, 0, "buttons without a name");
  eq(await $count("h1"), 1, "one h1");
  eq(await ev(`document.documentElement.lang`), "en");
});

await test("phone-sized screen: no sideways scrolling and everything still reachable", async () => {
  await load("", { width: 375, height: 800, theme: "light" });
  const w = await ev(`({sw: document.documentElement.scrollWidth, iw: window.innerWidth})`);
  ok(w.sw <= w.iw + 1, `page is ${w.sw}px wide on a ${w.iw}px screen`);
  await shot("05-phone-light");
  await load("#svc=sanger&view=table", { width: 375, height: 800 });
  const w2 = await ev(`({sw: document.documentElement.scrollWidth, iw: window.innerWidth})`);
  ok(w2.sw <= w2.iw + 1, `table view overflows the page: ${w2.sw} vs ${w2.iw}`);
  await shot("06-phone-table");
});

await test("print layout hides controls, keeps results and the print header", async () => {
  await load("#svc=sanger&qty=20");
  await send("Emulation.setEmulatedMedia", { media: "print" });
  const d = sel => ev(`getComputedStyle(document.querySelector(${JSON.stringify(sel)})).display`);
  eq(await d(".filters"), "none", "filters hidden"); eq(await d(".top"), "none", "top bar hidden");
  eq(await d("#planner-sec"), "none", "planner hidden"); eq(await d(".chips"), "none", "chips hidden");
  eq(await d("#printHead"), "block", "print header shown");
  ok((await d(".card")) !== "none", "cards remain");
  const bg = await ev("getComputedStyle(document.body).backgroundColor");
  eq(bg, "rgb(255, 255, 255)", "white page");
  await shot("13-print-media");
  await send("Emulation.setEmulatedMedia", { media: "" });
});

await test("screenshots of key states (only with SHOTS=1)", async () => {
  if (!process.env.SHOTS) return;
  await load("#svc=plasmid&qty=10", { theme: "light", height: 1500 }); await shot("07-plasmid-cards");
  await load("#svc=plasmid&qty=10", { theme: "dark", height: 1500 }); await shot("07b-plasmid-cards-dark");
  await load("#svc=rnaseq", { theme: "light", height: 1500 }); await shot("08-rnaseq");
  await load("#svc=viability", { theme: "light", height: 1100 }); await shot("09-quote-only");
  await load("#svc=viability", { theme: "light", height: 2900 }); await shot("10-lower-sections");
  await load("#svc=sanger&view=table&qty=50", { theme: "light", height: 1100 }); await shot("11-table-sanger");
  await load("", { width: 375, height: 1500, theme: "light" }); await shot("12-phone-tall");
});

console.log(`\n${total - fail}/${total} passed${fail ? ", " + fail + " FAILED" : ""}`);
cleanup();
setTimeout(() => process.exit(fail ? 1 : 0), 300);
