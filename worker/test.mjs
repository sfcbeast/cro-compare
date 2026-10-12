// Runs the Worker's real code against a real SQLite database (node:sqlite) through a small D1-shaped shim.
// Run: node worker/test.mjs
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import worker from "./src/index.js";

const db = new DatabaseSync(":memory:");
db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
const DB = {
  prepare(sql) {
    let params = [];
    const st = {
      bind(...p) { params = p; return st; },
      async run() { const r = db.prepare(sql).run(...params); return { success: true, meta: { last_row_id: Number(r.lastInsertRowid) } }; },
      async all() { return { results: db.prepare(sql).all(...params).map(r => ({ ...r })) }; },
      async first() { const r = db.prepare(sql).get(...params); return r ? { ...r } : null; }
    };
    return st;
  }
};
const env = { DB, ADMIN_TOKEN: "secret-token", SALT: "s", ALLOWED_ORIGINS: "https://sfcbeast.github.io,http://127.0.0.1:8091" };

let fail = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  " + extra)); if (!ok) fail++; };
const call = (path, { method = "GET", body, ip = "1.1.1.1", origin, headers = {}, raw } = {}) =>
  worker.fetch(new Request("https://api.test" + path, {
    method,
    body: method === "GET" || method === "OPTIONS" ? undefined : (raw !== undefined ? raw : body ? JSON.stringify(body) : undefined),
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": ip, ...(origin ? { Origin: origin } : {}), ...headers }
  }), env);
const Q = "/api/collections/quotes/records", F = "/api/collections/feedback/records";
const good = { service: "plasmid", provider: "Eurofins Genomics (US)", price: 15, currency: "USD", days: 1, qty: 10 };

check("health", (await call("/api/health")).status === 200);
check("create quote", (await call(Q, { method: "POST", body: good })).status === 200);
const list = await (await call(Q)).json();
check("list returns it, public fields only", list.items.length === 1 && list.items[0].price === 15 && !("id" in list.items[0]) && !("created" in list.items[0]), JSON.stringify(list));

for (const [name, patch] of [["bad service", { service: "junk" }], ["zero price", { price: 0 }], ["negative price", { price: -5 }],
  ["huge price", { price: 1e9 }], ["bad currency", { currency: "JPY" }], ["text price", { price: "abc" }],
  ["empty provider", { provider: "" }], ["bad days", { days: 5000 }], ["bad qty", { qty: 0 }]]) {
  const r = await call(Q, { method: "POST", ip: "2.2.2.2", body: { ...good, ...patch } });
  check("rejects " + name, r.status === 400, "got " + r.status);
}
check("rejects invalid JSON", (await call(Q, { method: "POST", ip: "2.2.2.2", raw: "{nope" })).status === 400);
check("rejects JSON array", (await call(Q, { method: "POST", ip: "2.2.2.2", raw: "[1]" })).status === 400);
check("rejects oversized body", (await call(Q, { method: "POST", ip: "2.2.2.2", raw: JSON.stringify({ ...good, provider: "x".repeat(5000) }) })).status === 413);
check("invalid requests did not use up the allowance", (await call(Q, { method: "POST", ip: "2.2.2.2", body: good })).status === 200);

// 10 writes per hour per IP; 1.1.1.1 has used 1 already
let last = 0;
for (let i = 0; i < 9; i++) last = (await call(Q, { method: "POST", body: good })).status;
check("10th write allowed", last === 200, "got " + last);
check("11th write blocked (429)", (await call(Q, { method: "POST", body: good })).status === 429);
check("other client unaffected", (await call(Q, { method: "POST", ip: "3.3.3.3", body: good })).status === 200);
check("feedback shares the allowance", (await call(F, { method: "POST", body: { kind: "idea", message: "hello there" } })).status === 429);

check("feedback ok", (await call(F, { method: "POST", ip: "4.4.4.4", body: { kind: "price", service: "sanger", provider: "X", message: "price is old", contact: "a@b.co" } })).status === 200);
check("feedback bad kind", (await call(F, { method: "POST", ip: "4.4.4.4", body: { kind: "bogus", message: "hello" } })).status === 400);
check("feedback short message", (await call(F, { method: "POST", ip: "4.4.4.4", body: { kind: "idea", message: "x" } })).status === 400);
check("feedback cannot be listed publicly", (await call(F)).status === 404);
check("admin without token hidden", (await call("/admin/feedback")).status === 404);
check("admin wrong token hidden", (await call("/admin/feedback", { headers: { Authorization: "Bearer nope" } })).status === 404);
const adm = await call("/admin/feedback", { headers: { Authorization: "Bearer secret-token" } });
const admBody = await adm.json();
check("admin with token lists feedback", adm.status === 200 && admBody.items.length === 1 && admBody.items[0].contact === "a@b.co");

const cors = await call("/api/health", { origin: "https://sfcbeast.github.io" });
check("CORS allows the site", cors.headers.get("Access-Control-Allow-Origin") === "https://sfcbeast.github.io");
const bad = await call("/api/health", { origin: "https://evil.example" });
check("CORS omitted for other origins", bad.headers.get("Access-Control-Allow-Origin") === null);
const pre = await call(Q, { method: "OPTIONS", origin: "https://sfcbeast.github.io" });
check("preflight 204", pre.status === 204 && pre.headers.get("Access-Control-Allow-Methods").includes("POST"));
check("unknown path 404", (await call("/nope")).status === 404);
check("PUT not allowed", (await call(Q, { method: "PUT", body: good })).status === 404);

const rows = db.prepare("SELECT k FROM rate").all();
check("no raw IPs stored", rows.length > 0 && rows.every(r => /^[0-9a-f]{32}$/.test(r.k)));
console.log(fail ? "\n" + fail + " FAILED" : "\nall passed");
process.exit(fail ? 1 : 0);
