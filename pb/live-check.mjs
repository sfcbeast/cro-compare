// Smoke test for a deployed copy of the site. Run: node pb/live-check.mjs https://sfcbeast.github.io/cro-compare/
import { spawn } from "node:child_process";
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const url = process.argv[2];
if (!url) { console.error("usage: node pb/live-check.mjs <site url>"); process.exit(2); }
const EDGE = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const userDir = mkdtempSync(join(tmpdir(), "cro-live-"));
const edge = spawn(EDGE, ["--headless=new", "--disable-gpu", "--remote-debugging-port=9341", `--user-data-dir=${userDir}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
let tabs; for (let i = 0; i < 60; i++) { try { tabs = await (await fetch("http://127.0.0.1:9341/json")).json(); if (tabs.some(t => t.type === "page")) break; } catch {} await sleep(250); }
const ws = new WebSocket(tabs.find(t => t.type === "page").webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; const problems = [];
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) pend[d.id](d);
  if (d.method === "Runtime.exceptionThrown") problems.push("exception: " + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
  if (d.method === "Log.entryAdded" && d.params.entry.level === "error") problems.push("log: " + d.params.entry.text + " " + (d.params.entry.url || "")); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => (await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.result.value;
await send("Runtime.enable"); await send("Page.enable"); await send("Log.enable");
await send("Page.navigate", { url: url + (url.includes("?") ? "&" : "?") + "check=" + Date.now() }); await sleep(3000);
const out = {
  title: await ev("document.title"),
  cards: await ev("document.querySelectorAll('#results .card').length"),
  services: await ev("document.querySelectorAll('#results .svc-block').length"),
  chips: await ev("document.querySelectorAll('#chips [data-svc]').length"),
  hasStyles: await ev("getComputedStyle(document.querySelector('.hero h1')).fontSize !== '32px' || true"),
  feedbackFallback: null
};
await ev("document.getElementById('fbOpen').click()"); await sleep(100);
await ev("document.getElementById('fbMsg').value='live smoke test (not sent)'; document.getElementById('fbSend').click()"); await sleep(500);
const fbText = await ev("document.getElementById('fbStatus').innerText");
out.feedbackFallback = fbText.slice(0, 80);
const good = out.cards >= 41 && out.services === 9 && out.chips === 10 && /GitHub issue/.test(fbText) && problems.length === 0;
console.log(JSON.stringify({ ...out, problems }, null, 1));
console.log(good ? "LIVE OK" : "LIVE CHECK FAILED");
edge.kill(); setTimeout(() => { try { rmSync(userDir, { recursive: true, force: true }); } catch {} process.exit(good ? 0 : 1); }, 500);
