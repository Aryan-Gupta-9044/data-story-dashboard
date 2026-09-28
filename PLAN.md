# PLAN.md — living status doc (update after every work session)

Project: **Field Notes — Data Story Dashboard** (Vision2Web, Theme 5 / Problem 5)
Stack: React+Vite+Tailwind+Recharts · Express · Supabase (optional) / local JSON store (default)

## Current status: PROTOTYPE RUNNABLE  (last updated: session 2)

Run it (no accounts needed):
```
cd backend  && npm install && npm run dev     # :8787, auto-seeds 2 sample datasets
cd frontend && npm install && npm run dev     # :5173
```

## Checklist vs. hackathon brief
| Requirement | Status |
|---|---|
| CSV/JSON upload, 10MB cap, drag & drop, type validation | DONE |
| 2+ preloaded datasets (Campus Placements, Smart City Energy) | DONE (auto-seeded on boot) |
| Column type detection, null handling, record count | DONE (date detection tightened in s2) |
| Filters: date range / multi-select / min-max slider | DONE (server now returns bounds+distincts) |
| Live sync of KPIs, charts, table | DONE (single /analytics/filter response) |
| 4+ KPI cards | DONE |
| 3+ charts w/ tooltips, legend, responsive | DONE (trend area, bar, donut, custom builder) |
| Searchable, sortable, paginated table | DONE |
| CSV export of filtered subset | DONE |
| PDF / PNG dashboard report export | DONE in s2 (html2canvas + jsPDF) |
| Toasts, error handling, input validation | DONE (search length, pageSize cap, sort whitelist added s2) |
| Auto insights | DONE |
| Custom chart builder (axes + chart type) | DONE |
| Dark/light mode | DONE |
| Anomaly badges | IMPROVED s2 (IQR outliers + top/bottom 5%) |
| Responsive (mobile sidebar) | DONE s2 (collapsible filter drawer) |

## Architecture notes
- `backend/src/lib/store.js` = storage abstraction. If `SUPABASE_URL` + key set -> Supabase; else in-memory + `backend/data/store.json`.
- All routes call the store only; swapping DB doesn't touch route code.
- `/analytics/filter` returns `{columns,kpis,insights,charts,table,meta}`; `meta` = distinct values + numeric bounds + date bounds (unfiltered).

## Verification done (session 2)
- API: type detection, filter+search+sort+custom axis, meta, anomaly flags, CSV export, bad-file / bad-JSON / unknown-dataset errors.
- `vite build` OK. Headless Chromium: dataset load, checkbox filter (300 -> 50), search (-> 14), PDF download, dark mode, 390px mobile.
- NOT verified: Supabase mode (needs a real project), PNG export click-path, a full 10MB upload.

## Known limitations / next steps
1. Rows loaded fully in memory per request (fine <50k rows). Move aggregates to SQL later.
2. No auth; Supabase RLS is open-read for demo.
3. No automated tests yet (add vitest for dataUtils).
4. Ideas: shareable URL state, saved views, per-column quality panel (see ADDITIONAL_FEATURES.md).

## Session log
- s1: scaffold, Supabase-only backend, base UI, design system.
- s2: local store fallback + auto-seed, meta endpoint, hardened validation, better anomalies, report export, mobile drawer, smoke-tested build + API.
