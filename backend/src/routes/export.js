import express from "express";
import Papa from "papaparse";
import { applyFilters, applySearch, applySort } from "../lib/dataUtils.js";
import { loadDataset } from "./analytics.js";

const router = express.Router();

// GET /export?datasetId=...&filters=<JSON>&search=...&sortCol=&sortDir=
router.get("/", async (req, res, next) => {
  try {
    const { datasetId, filters, search, sortCol, sortDir } = req.query;
    if (!datasetId) return res.status(400).json({ error: "datasetId is required." });
    const { dataset, rows } = await loadDataset(String(datasetId));

    let out = rows;
    if (filters) {
      let parsed;
      try { parsed = JSON.parse(String(filters)); } catch { return res.status(400).json({ error: "filters is not valid JSON." }); }
      out = applyFilters(out, parsed);
    }
    out = applySearch(out, search);
    out = applySort(out, dataset.columns, { col: sortCol, dir: sortDir });

    // Neutralise spreadsheet formula injection in exported text cells.
    const safe = out.map((r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "string" && /^[=+\-@]/.test(v) ? `'${v}` : v]))
    );
    const fname = dataset.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}_filtered.csv"`);
    res.send(Papa.unparse(safe));
  } catch (err) {
    next(err);
  }
});

export default router;
