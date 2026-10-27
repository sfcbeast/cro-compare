# CRO Compare

Compare sequencing and cell-based assay providers; request quotes; share anonymous quotes.

## Run locally
`./start.ps1` then open http://127.0.0.1:8091 (admin UI at /_/, credentials in `pb/.admin.env`).

## Update the catalog
Edit `pb/pb_public/data.js`. Only add prices read from the provider's own page; leave `tiers: []` for quote-only providers.

## Deploy (Fly.io)
```
fly launch --no-deploy --copy-config
fly volumes create pb_data --size 1
fly deploy
fly ssh console -C "/pb/pocketbase superuser upsert YOU@EMAIL STRONG_PASSWORD --dir=/pb/pb_data"
```
Migrations in `pb/pb_migrations` create the `quotes` collection and the write rate limit on first start.

## Publish to GitHub Pages (free)
Commit changes, then run `./publish.ps1`. Site: https://sfcbeast.github.io/cro-compare/ (static only; community quotes need the PocketBase server).

## Checks
- `node pb/check-data.mjs` validates the catalog (run before every publish).
- `node --no-warnings worker/test.mjs` runs the API tests against real SQLite.

## More docs
- `worker/README.md`: deploy the free hosted API (Cloudflare Worker + D1).
- `docs/user-research-kit.md`: how to run 5 user sessions.
- `docs/provider-outreach.md` and `docs/listings-to-confirm.csv`: contacting providers.

## Tests (one command)
`npm test` runs, in order: the catalog check, 76 logic tests (`pb/test-logic.mjs`), 33 API tests (`worker/test.mjs`) and 30 browser tests (`pb/e2e.mjs`).
The browser suite starts its own throwaway PocketBase on port 8092 and a headless Edge, so it never touches your data. `SHOTS=1 node pb/e2e.mjs` also saves screenshots to `pb/shots/` for a visual review.

## Code layout (`pb/pb_public/`)
`index.html` markup · `styles.css` design tokens, components, print · `logic.js` pricing rules (no DOM, unit-tested) · `app.js` interface · `data.js` the catalog · `config.js` API address.
