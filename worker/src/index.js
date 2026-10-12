// CRO Compare API: anonymous community quotes + feedback on Cloudflare Workers + D1.
// Mirrors the PocketBase paths the page already calls, so only config.js needs to change.

const SERVICES = ["sanger", "plasmid", "rnaseq", "amplicon", "ic50", "screen", "viability", "reporter", "immunoonc"];
const CURRENCIES = ["USD", "EUR", "GBP", "CAD"];
const KINDS = ["price", "missing", "idea", "other"];
const WRITES_PER_HOUR = 10;
const WINDOW_S = 3600;
const MAX_BODY = 4000;

const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...extra } });

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const h = { "Vary": "Origin" };
  if (origin && allowed.includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
    h["Access-Control-Max-Age"] = "86400";
  }
  return h;
}

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// Returns true while this client is under its hourly write allowance.
async function allow(env, request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const k = (await sha256(ip + (env.SALT || ""))).slice(0, 32);
  const w = Math.floor(Date.now() / 1000 / WINDOW_S);
  await env.DB.prepare("INSERT INTO rate (k, w, n) VALUES (?, ?, 1) ON CONFLICT(k, w) DO UPDATE SET n = n + 1").bind(k, w).run();
  const row = await env.DB.prepare("SELECT n FROM rate WHERE k = ? AND w = ?").bind(k, w).first();
  if (Math.random() < 0.02) await env.DB.prepare("DELETE FROM rate WHERE w < ?").bind(w - 2).run();
  return row.n <= WRITES_PER_HOUR;
}

async function readJson(request) {
  const len = Number(request.headers.get("Content-Length") || 0);
  if (len > MAX_BODY) return { error: json({ message: "Body too large" }, 413) };
  const text = await request.text();
  if (text.length > MAX_BODY) return { error: json({ message: "Body too large" }, 413) };
  try {
    const v = JSON.parse(text);
    if (v === null || typeof v !== "object" || Array.isArray(v)) throw new Error("not an object");
    return { body: v };
  } catch {
    return { error: json({ message: "Invalid JSON" }, 400) };
  }
}

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function validQuote(b) {
  const service = str(b.service, 40), provider = str(b.provider, 120), currency = str(b.currency, 3);
  const price = Number(b.price);
  if (!SERVICES.includes(service)) return "service";
  if (!provider) return "provider";
  if (!CURRENCIES.includes(currency)) return "currency";
  if (!(price >= 0.01 && price <= 10_000_000)) return "price";
  let days = null, qty = null;
  if (b.days !== undefined && b.days !== null && b.days !== "") {
    days = Math.round(Number(b.days));
    if (!(days >= 0 && days <= 1000)) return "days";
  }
  if (b.qty !== undefined && b.qty !== null && b.qty !== "") {
    qty = Math.round(Number(b.qty));
    if (!(qty >= 1 && qty <= 1_000_000)) return "qty";
  }
  return { service, provider, price, currency, days, qty };
}

function validFeedback(b) {
  const kind = str(b.kind, 10), message = str(b.message, 2000);
  if (!KINDS.includes(kind)) return "kind";
  if (message.length < 3) return "message";
  const service = str(b.service, 40);
  if (service && !SERVICES.includes(service)) return "service";
  return { kind, message, service: service || null, provider: str(b.provider, 160) || null, contact: str(b.contact, 200) || null };
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function route(request, url, env) {
  const { pathname } = url, method = request.method;

  if (pathname === "/api/health" && method === "GET") return json({ code: 200, message: "API is healthy." });

  if (pathname === "/api/collections/quotes/records") {
    if (method === "GET") {
      const { results } = await env.DB.prepare("SELECT service, provider, price, currency FROM quotes ORDER BY id DESC LIMIT 500").all();
      return json({ items: results, totalItems: results.length }, 200, { "Cache-Control": "public, max-age=60" });
    }
    if (method === "POST") {
      const r = await readJson(request);
      if (r.error) return r.error;
      const q = validQuote(r.body);
      if (typeof q === "string") return json({ message: "Invalid " + q }, 400);
      if (!(await allow(env, request))) return json({ message: "Too many requests" }, 429);
      const ins = await env.DB.prepare("INSERT INTO quotes (service, provider, price, currency, days, qty) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(q.service, q.provider, q.price, q.currency, q.days, q.qty).run();
      return json({ id: String(ins.meta && ins.meta.last_row_id != null ? ins.meta.last_row_id : "") });
    }
  }

  if (pathname === "/api/collections/feedback/records" && method === "POST") {
    const r = await readJson(request);
    if (r.error) return r.error;
    const f = validFeedback(r.body);
    if (typeof f === "string") return json({ message: "Invalid " + f }, 400);
    if (!(await allow(env, request))) return json({ message: "Too many requests" }, 429);
    const ins = await env.DB.prepare("INSERT INTO feedback (kind, service, provider, message, contact) VALUES (?, ?, ?, ?, ?)")
      .bind(f.kind, f.service, f.provider, f.message, f.contact).run();
    return json({ id: String(ins.meta && ins.meta.last_row_id != null ? ins.meta.last_row_id : "") });
  }

  // Owner-only: GET /admin/feedback with  Authorization: Bearer <ADMIN_TOKEN>
  if (pathname === "/admin/feedback" && method === "GET") {
    const auth = request.headers.get("Authorization") || "";
    if (!env.ADMIN_TOKEN || !safeEqual(auth, "Bearer " + env.ADMIN_TOKEN)) return json({ message: "Not found" }, 404);
    const { results } = await env.DB.prepare("SELECT * FROM feedback ORDER BY id DESC LIMIT 200").all();
    return json({ items: results });
  }

  return json({ message: "Not found" }, 404);
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      const res = await route(request, new URL(request.url), env);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (e) {
      return json({ message: "Server error" }, 500, cors);
    }
  }
};
