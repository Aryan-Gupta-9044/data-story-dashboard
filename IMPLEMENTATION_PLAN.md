# Implementation Plan — Field Notes (Data Story Dashboard)

## 1. Architecture

```
Browser (React/Vite)  --REST-->  Express API  --service role-->  Supabase (Postgres + Storage)
     |
     +-- direct anon-key reads only where RLS allows it (not required to run the app)
```

- **Why Supabase for the database:** one managed Postgres instance, RLS for
  read policies, and a Storage bucket for raw file retention, without
  standing up separate infra. `dataset_records.data` is JSONB so a dataset
  with any column shape lands in the same two tables (`datasets`,
  `dataset_records`) — no per-dataset migration.
- **Why a thin Express layer instead of calling Supabase straight from the
  browser:** upload parsing (CSV/JSON → typed rows), validation, and the
  service-role insert have to happen somewhere that isn't the browser. The
  service-role key never reaches the client; the frontend only ever talks to
  the Express API (plus optional anon-key reads if you wire them up later).
- **Why JSONB rows instead of a normalized table per dataset:** the brief's
  "upload any CSV/JSON" requirement means the column set isn't known ahead
  of time. JSONB plus a `columns` metadata array on `datasets` gives generic
  storage and still lets Postgres index into it (`gin` index on `data`).

## 2. Data flow for one filter/search/sort action

1. Frontend debounces the change and POSTs the full filter/sort/search/page
   state to `/analytics/filter`.
2. Backend loads the dataset's rows once, applies filters → search → sort in
   memory (`dataUtils.js`), then derives everything the UI needs from that
   *one* filtered array: KPIs, the three chart datasets, rule-based insights,
   anomaly flags, and the current page of the table.
3. One response drives KPI strip, all charts, the insights panel, and the
   table in sync — there's no separate "recompute KPIs" call that could drift
   out of step with the table.

For datasets past a few tens of thousands of rows, the "load all rows into
memory per request" step is the thing to replace first — see
`ADDITIONAL_FEATURES.md` for the streaming/aggregation-in-SQL follow-up.

## 3. Design system — why it doesn't look templated

**Subject grounding:** the sample datasets are a campus placement drive and a
city's energy grid — the kind of thing an analyst actually annotates by hand.
The design treats the app as *that analyst's working notebook*, not a
marketing dashboard, which is where every visual decision below comes from.

**Color** (4 base + 2 accent):
| Token | Hex | Role |
|---|---|---|
| paper | `#EDEFE9` | light background |
| ink | `#1B2430` | primary text / dark-mode surfaces |
| inkdeep | `#10161F` | dark-mode background |
| slate | `#5B6472` | secondary text, borders |
| teal | `#2F6F6B` | primary data series, focus ring |
| amber | `#D98E36` | anomaly flags, insight rule marker |
| coral | `#B4433A` | error toasts, tertiary series |

Deliberately not the warm-cream + terracotta pairing (`#F4F1EA` / `#D97757`)
that reads as an AI-generated default, and not a near-black + neon-accent
theme either — this is cooler and quieter, closer to a printed ledger than a
SaaS marketing page.

**Type:**
- *Source Serif 4* — the insight/marginalia narrative text only. Serif reads
  as "written observation," distinguishing an auto-generated sentence from
  the surrounding UI chrome.
- *IBM Plex Sans* — all UI labels, buttons, filter controls.
- *IBM Plex Mono* — every raw number: KPI figures and every table cell,
  because tabular data reads better in a monospaced, tabular-figure face.

**Layout:** asymmetric three-zone frame — a narrow fixed filter rail on the
left (the "margin"), a flexible chart/table area, and a slim insights column
that sits beside the charts like a note in the margin rather than a modal or
a card. KPIs render as an underlined ledger row (numbers with labels,
separated by hairline verticals) instead of a grid of rounded, shadowed
cards. No border-radius, no box-shadow anywhere in the stylesheet, no
gradient fills — only 1px hairline rules (`.rule`), consistent with a
notebook page rather than the "SaaS-card kit" default.

**What was deliberately left out:** no tracked-out all-caps eyebrows, no
middle-dot metadata strings, no arrow glyphs on buttons, no page-load
stagger animation. The one motion moment is the loading-state opacity dip on
the chart area while a new filter query is in flight — motion that answers
an action, not decoration.

## 4. Security / robustness checklist

- File type is checked by extension **and** MIME on the backend (`multer`
  `fileFilter`), independent of whatever the client already checked.
- 10MB cap enforced by `multer.limits.fileSize`, not just a UI hint.
- Free-text search is a plain case-insensitive substring match executed in
  application code against already-fetched JSON — there is no string
  concatenation into a SQL statement anywhere in the codebase, so there is no
  SQL-injection surface from the search box. React escapes all rendered
  values by default, so table content can't execute as HTML (no
  `dangerouslySetInnerHTML` is used anywhere in the frontend).
- A centralized Express error handler returns `{ error }` JSON for every
  failure path (bad file, empty parse, Supabase error), which the frontend
  turns into a dismissible toast rather than a blank screen.
- Missing/null values are replaced with a type-appropriate placeholder at
  upload time (`cleanRows`) instead of dropping the row, so partial records
  still show up rather than silently vanishing.
