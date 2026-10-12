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
