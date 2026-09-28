import express from "express";
import { store } from "../lib/store.js";
import {
  applyFilters, applySearch, applySort, computeKpis, computeMeta, pickMetrics,
  countBy, sumBy, generateInsights, flagAnomalies,
} from "../lib/dataUtils.js";

const router = express.Router();

export async function loadDataset(id) {
  const dataset = await store.get(id);
  if (!dataset) {
    const e = new Error("Dataset not found.");
    e.status = 404;
    throw e;
  }
  return { dataset, rows: await store.rows(id) };
}

const clampInt = (v, min, max, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};

// POST /analytics/filter
// body: { datasetId, filters, search, sort:{col,dir}, page, pageSize, customAxis:{x,y} }
router.post("/filter", async (req, res, next) => {
  try {
    const { datasetId, filters, search = "", sort, customAxis } = req.body || {};
    if (!datasetId || typeof datasetId !== "string") return res.status(400).json({ error: "datasetId is required." });
    if (filters && typeof filters !== "object") return res.status(400).json({ error: "filters must be an object." });
    const page = clampInt(req.body.page, 1, 100000, 1);
    const pageSize = clampInt(req.body.pageSize, 1, 200, 25);

    const { dataset, rows } = await loadDataset(datasetId);
    const columns = dataset.columns;
    const names = new Set(columns.map((c) => c.name));
    const safeFilters = Object.fromEntries(Object.entries(filters || {}).filter(([k]) => names.has(k)));

    let filtered = applyFilters(rows, safeFilters);
    filtered = applySearch(filtered, search);
    filtered = applySort(filtered, columns, sort);

    const anomalyFlags = flagAnomalies(filtered, columns);
    const catCol = columns.find((c) => c.type === "categorical");
    const numCol = pickMetrics(columns)[0];
    const dateCol = columns.find((c) => c.type === "date");
    const validAxis = customAxis?.x && customAxis?.y && names.has(customAxis.x) && names.has(customAxis.y);

    const charts = {
      trend: dateCol && numCol ? buildTrend(filtered, dateCol.name, numCol.name) : null,
      breakdown: catCol && numCol ? sumBy(filtered, catCol.name, numCol.name) : null,
      distribution: catCol ? countBy(filtered, catCol.name) : null,
      custom: validAxis ? buildCustom(filtered, columns, customAxis.x, customAxis.y) : null,
    };

    const start = (page - 1) * pageSize;
    res.json({
      columns,
      kpis: computeKpis(filtered, columns),
      insights: generateInsights(filtered, columns),
      metric: numCol?.name || null,
      charts,
      meta: computeMeta(rows, columns), // unfiltered, so slider ranges don't shrink
      table: {
        rows: filtered.slice(start, start + pageSize).map((row, i) => ({ row, anomaly: anomalyFlags[start + i] })),
        total: filtered.length,
        page,
        pageSize,
      },
    });
  } catch (err) {
    next(err);
  }
});

function buildTrend(rows, dateCol, numCol) {
  const byDate = {};
  for (const r of rows) {
    const t = Date.parse(r[dateCol]);
    const v = Number(r[numCol]);
    if (!Number.isFinite(t) || !Number.isFinite(v)) continue;
    const key = new Date(t).toISOString().slice(0, 10);
    byDate[key] = (byDate[key] || 0) + v;
  }
  return Object.entries(byDate).sort(([a], [b]) => (a > b ? 1 : -1)).map(([date, value]) => ({ date, value: Math.round(value * 100) / 100 }));
}

// x may be date/categorical/string. Dates are grouped by day and ordered chronologically.
function buildCustom(rows, columns, x, y) {
  const xType = columns.find((c) => c.name === x)?.type;
  const totals = sumBy(rows, x, y);
  const entries = Object.entries(totals).map(([k, v]) => [k, Math.round(v * 100) / 100]);
  if (xType === "date") entries.sort(([a], [b]) => (a > b ? 1 : -1));
  else entries.sort((a, b) => b[1] - a[1]);
  return Object.fromEntries(entries.slice(0, 40));
}

export default router;
