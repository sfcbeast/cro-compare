// Creates the `quotes` collection (anonymous community quotes). Run once with the server up.
const base = "http://127.0.0.1:8091", { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
const j = async (p, o = {}, t) => { const r = await fetch(base + p, { ...o, headers: { "Content-Type": "application/json", ...(t ? { Authorization: t } : {}) } }); const b = await r.json().catch(() => ({})); if (!r.ok) throw new Error(p + " " + r.status + " " + JSON.stringify(b)); return b; };
const { token } = await j("/api/collections/_superusers/auth-with-password", { method: "POST", body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }) });
const body = {
  name: "quotes", type: "base",
  fields: [
    { name: "service", type: "select", required: true, maxSelect: 1, values: ["sanger","plasmid","rnaseq","ic50","viability","reporter","immunoonc"] },
    { name: "provider", type: "text", required: true, max: 120 },
    { name: "price", type: "number", required: true, min: 0.01, max: 10000000 },
    { name: "currency", type: "select", required: true, maxSelect: 1, values: ["USD", "EUR", "GBP", "CAD"] },
    { name: "days", type: "number", min: 0, max: 1000 },
    { name: "qty", type: "number", min: 1, max: 1000000 },
    { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
  ],
  listRule: "", viewRule: "", createRule: "@request.body.price > 0 && @request.body.price < 10000000", updateRule: null, deleteRule: null
};
try { await j("/api/collections/quotes", { method: "DELETE" }, token); } catch {}
console.log((await j("/api/collections", { method: "POST", body: JSON.stringify(body) }, token)).name, "created");
