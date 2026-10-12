# CRO Compare API (Cloudflare Worker + D1)

Hosts the two things a static GitHub Pages site cannot: anonymous community quotes and feedback.
The paths match the local PocketBase server, so the page only needs one config value changed.

## Tested

- `node --no-warnings worker/test.mjs`: 33 checks (validation, rate limit, CORS, admin access) against a real SQLite database.
- Also run under Cloudflare's local runtime (`wrangler dev --local`, real D1 binding) and driven from the real page: a shared quote was stored per unit and read back as the community median.

Not yet done: deploying to your Cloudflare account (needs your login).

## Deploy (one time, about 10 minutes)

```
cd worker
npx wrangler login
npx wrangler d1 create cro-compare
```
Copy the `database_id` it prints into `wrangler.toml`, then:

```
npx wrangler d1 execute cro-compare --remote --file=schema.sql
npx wrangler secret put ADMIN_TOKEN      # any long random string; used to read feedback
npx wrangler secret put SALT             # any long random string; salts the hashed-IP rate limiter
npx wrangler deploy
```
It prints a URL like `https://cro-compare-api.<your-subdomain>.workers.dev`. Then:

1. Put that URL in `pb/pb_public/config.js` as `window.API_BASE`.
2. Run `./publish.ps1` to update the GitHub Pages site.

## Read feedback

```
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" https://cro-compare-api.<your-subdomain>.workers.dev/admin/feedback
```

## Behaviour

| | |
|---|---|
| Writes | 10 per hour per client (quotes and feedback share the allowance), counted by salted hash of the IP; raw IPs are never stored |
| Validation | known service and currency, price 0.01 to 10,000,000, days 0 to 1000, qty 1 to 1,000,000, body under 4 KB |
| Public reads | the latest 500 quotes, only service, provider, price and currency; feedback is never public |
| CORS | only the origins in `ALLOWED_ORIGINS` in `wrangler.toml` |

Cloudflare's free-plan limits change from time to time; check the current numbers before relying on them.
