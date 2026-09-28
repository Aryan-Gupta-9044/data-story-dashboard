# Field Notes — Data Story Dashboard

Theme 5 / Problem 5 submission: upload a dataset (or pick a sample), filter it,
watch KPIs/charts/table update together, and export what you're looking at.

The UI is deliberately not the generic "AI dashboard" look — no rounded card
grid, no gradient washes, no drop shadows. It's built as a ledger/notebook:
hairline rules, serif marginalia for the auto-generated insights, monospace
for every raw number, and an asymmetric filter-rail + content layout. See
`IMPLEMENTATION_PLAN.md` for the design reasoning.

## Stack

- **Frontend:** React + Vite, Tailwind CSS, Recharts, Lucide icons
- **Backend:** Node.js + Express
- **Database:** Supabase (Postgres + Storage)

## Quick start (zero config, no accounts)

```bash
# terminal 1
cd backend  && npm install && npm run dev     # http://localhost:8787, auto-seeds 2 sample datasets
# terminal 2
cd frontend && cp .env.example .env && npm install && npm run dev   # http://localhost:5173
```

Uploads persist to `backend/data/store.json` (git-ignored). Delete it to reset.

## Optional: use Supabase instead of the local store

1. Create a project, run `supabase/schema.sql` in the SQL editor.
2. Put `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`.
3. Start the server (it seeds on boot) or run `npm run seed`. `GET /health` reports `"store": "supabase"`.

## Features
KPI strip (4 metrics), 4 charts with switchable types (area/line/bar, bar/line/area,
donut/pie/bar, custom x/y builder), type-aware filters (date range, multi-select,
min/max sliders), debounced search, sortable/paginated table, anomaly badges (IQR outliers),
auto insights, CSV export of filtered rows, PDF/PNG dashboard report, dark mode, mobile filter drawer.

## API

| Method | Route                | Purpose                                   |
|--------|-----------------------|--------------------------------------------|
| POST   | `/upload`             | Upload a `.csv`/`.json` file (≤10MB)      |
| GET    | `/datasets`           | List datasets (metadata only)             |
| GET    | `/datasets/:id`       | One dataset's metadata                    |
| DELETE | `/datasets/:id`       | Remove a dataset and its records          |
| POST   | `/analytics/filter`   | Filtered/searched/sorted/paginated rows, KPIs, insights, chart data |
| GET    | `/export`             | CSV download of the current filtered set  |

## Notes on scope

- Column types (numeric / date / categorical / string) are auto-detected on upload and drive which filter renders.
- Insights and anomaly flags are rule-based arithmetic over the *filtered* rows, with no external AI call.
- Storage sits behind `backend/src/lib/store.js`; routes never touch a DB directly.
- Verified in a sandbox: API smoke tests, production build, and a headless-browser run
  (filter, search, PDF export, dark mode, mobile viewport). See `PLAN.md` for status and roadmap.
