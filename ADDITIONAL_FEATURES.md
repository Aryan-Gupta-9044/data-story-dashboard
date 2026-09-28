# Additional Features Worth Considering

Beyond the brief's own "stand out to judges" list (auto-generated insights,
custom chart builder, dark mode + PDF export, anomaly highlighting — all
implemented in this build), here are further extensions:

1. **Saved views / shareable filter state.** Serialize the current
   `filters` + `sort` + `customAxis` object into the URL query string, so a
   specific filtered view can be bookmarked or sent to a teammate instead of
   re-built by hand.

2. **Column-level annotations.** Let a viewer attach a short note to a
   specific column (e.g. "packaging change affected this metric from
   March") that shows up as a small marker on that column's header and in
   any chart using it — turns the dashboard into an actual shared notebook
   rather than a one-way report.

3. **Diff between two filtered views.** Snapshot the current KPIs, run a
   second filter, and show a compact "+12% / -3 records" comparison strip —
   useful for "this quarter vs last quarter" style questions without
   building a whole comparison mode.

4. **Aggregation in SQL instead of in memory.** Once a dataset gets into the
   hundreds of thousands of rows, move `sumBy`/`countBy`/percentile
   calculations into Postgres (a SQL function or a materialized view keyed
   by dataset_id) instead of pulling every row into the Express process on
   each filter call. The route/response shape in `analytics.js` wouldn't
   need to change, only what happens inside `loadRows`.

5. **Scheduled re-imports.** For a dataset that's actually a live export
   from another system (a CSV dropped into cloud storage on a schedule), add
   a Supabase Edge Function that watches the `datasets` storage bucket and
   re-runs the same parse/clean pipeline as `/upload` automatically, so the
   dashboard tracks a source of truth instead of a one-time snapshot.

6. **Per-column data-quality summary.** A small expandable panel per column
   showing null %, distinct count, and (for numeric columns) a mini
   histogram — helps a viewer trust the KPIs above it before acting on them.

7. **Keyboard-first table navigation.** Arrow keys to move between cells,
   `/` to focus the search box, `[`/`]` for prev/next page — small, but it
   turns the table from "look at this" into "work in this."
