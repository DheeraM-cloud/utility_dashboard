# Pudukkottai Utility GIS — MongoDB Atlas version

Same dashboard, same API shape, different database. This version uses
**MongoDB Atlas** (via Mongoose) instead of Postgres — if you've already
got the Postgres version running, only `src/db.js`, `src/models/`,
`src/lib/wardPivot.js`, and the route files changed internally; the
frontend and API contract are identical.

```
Excel (.xls) --import script--> MongoDB Atlas --Express API--> Frontend (fetch)
```

## What's in here

```
src/models/Asset.js    Mongoose schema for one utility asset
src/db.js               Mongoose connection
src/lib/wardPivot.js    Shared aggregation pipeline (per-ward counts, used by /api/wards and /api/insights)
src/lib/categorize.js   Shared asset-name -> category mapping
scripts/import.js        One-off script: Excel -> reprojected coordinates -> MongoDB
src/routes/              /api/assets, /api/wards, /api/stats, /api/insights
src/server.js            Express app (connects to Mongo, then serves API + static frontend)
public/index.html        Frontend (unchanged from the Postgres version)
data/                    Drop your .xls/.xlsx file here for the import script
```

## API

Identical shape to the Postgres version:

| Route | Returns |
|---|---|
| `GET /api/stats` | City totals: asset count, ward count, per-category counts |
| `GET /api/assets?ward=&category=` | Point data for the map: `{lat, lon, category, ward}` |
| `GET /api/wards` | Per-ward pivot: counts per category + `Total`, plus each ward's bounding box |
| `GET /api/insights` | The four "Field Notes" findings, computed live from the aggregation pipeline — not hardcoded text |

`/api/wards` and `/api/insights` both run the same aggregation pipeline
(`src/lib/wardPivot.js`) which groups documents by `wardNo` and counts
each category with `$cond`/`$sum`, the Mongo equivalent of the SQL
`GROUP BY` + `SUM(CASE WHEN ...)` used in the Postgres version.

## Set up MongoDB Atlas (free tier is enough)

1. Create a free account at atlas.mongodb.com and create a new **free (M0) cluster**.
2. **Database Access** → add a database user with a username/password (not your Atlas login).
3. **Network Access** → add an IP entry. For getting started, `0.0.0.0/0` (allow from anywhere) is simplest; for production, restrict it to your hosting provider's IPs if they publish a static range, or at least revisit this before going live with real users.
4. **Database → Connect → Drivers** → copy the connection string, it looks like:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```
5. Add a database name to the path (Atlas doesn't require this, Mongoose does need somewhere to put collections):
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/pudukkottai?retryWrites=true&w=majority
   ```
   That's your `MONGODB_URI`. You don't need to create the database or collection up front — the import script creates both the first time it inserts a document.

## Run it locally

```bash
npm install
cp .env.example .env
# edit .env and paste your MONGODB_URI

# put the municipality's Excel file in ./data/, then:
npm run import

npm start
# -> http://localhost:3000
```

## Deploying it for real

### Render / Railway (simplest — one service, both API and frontend)

1. Push this repo to GitHub.
2. Set up your Atlas cluster as above (Atlas is a separate managed service — you don't host Mongo yourself).
3. In Render/Railway: create a **Web Service** from the repo.
   - Build command: `npm install`
   - Start command: `npm start`
   - Env var: `MONGODB_URI` = your Atlas connection string.
4. Once deployed, run the import once from the platform's shell (or from your own machine, pointed at the same `MONGODB_URI`):
   ```bash
   node scripts/import.js data/your-file.xls
   ```
5. Visit the deployed URL — that's your live dashboard, reading straight from Atlas.

### Frontend and backend deployed separately

Same idea as the Postgres version's README: deploy `src/` + `scripts/` +
`package.json` as the API service, deploy `public/index.html` as a
static site elsewhere (Vercel/Netlify), set
`window.API_BASE = 'https://your-api-host'` before the main `<script>`
tag in `index.html`, and add CORS on the backend:

```js
const cors = require('cors'); // npm install cors
app.use(cors({ origin: 'https://your-frontend.vercel.app' }));
```

## Re-importing after the source data changes

`scripts/import.js` clears and reloads the `assets` collection every
time it runs, so it's safe to re-run whenever the municipality's sheet
is updated — the API and frontend reflect the new data on the very next
request, no redeploy needed.

## Notes

- Source coordinates are UTM Zone 44N (EPSG:32644), reprojected to WGS84 at import time via `proj4` — same as the Postgres version.
- Asset names are normalised into 7 categories (`src/lib/categorize.js`); anything unmapped falls into `"Other"`.
- If you're switching an existing deployment from Postgres to this version, note the frontend (`public/index.html`) doesn't need to change at all — the API contract is identical between both versions.
