import express from "express";
import multer from "multer";
import Papa from "papaparse";
import { store } from "../lib/store.js";
import { detectColumns, cleanRows } from "../lib/dataUtils.js";

const router = express.Router();
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 100000;
const MAX_COLS = 60;
const ALLOWED_MIME = new Set(["text/csv", "application/json", "application/vnd.ms-excel", "text/plain", "application/octet-stream"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const n = file.originalname.toLowerCase();
    const okExt = n.endsWith(".csv") || n.endsWith(".json");
    if (!okExt || !ALLOWED_MIME.has(file.mimetype)) {
      const e = new Error("Only .csv or .json files are accepted.");
      e.status = 415;
      return cb(e);
    }
    cb(null, true);
  },
});

const bad = (res, error, extra = {}) => res.status(400).json({ error, ...extra });

router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return bad(res, "No file was attached (field name must be 'file').");
    const text = req.file.buffer.toString("utf-8").replace(/^\uFEFF/, "");
    const isJson = req.file.originalname.toLowerCase().endsWith(".json");

    let rows;
    if (isJson) {
      let parsed;
      try { parsed = JSON.parse(text); } catch { return bad(res, "That file isn't valid JSON."); }
      rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.records) ? parsed.records : Array.isArray(parsed?.data) ? parsed.data : null;
      if (!rows) return bad(res, "JSON must be an array of objects (or { records: [...] }).");
      rows = rows.filter((r) => r && typeof r === "object" && !Array.isArray(r));
      // flatten one level of nesting so nested objects don't render as [object Object]
      rows = rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v && typeof v === "object" ? JSON.stringify(v) : v])));
    } else {
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: true, transformHeader: (h) => h.trim() });
      const fatal = parsed.errors.find((e) => e.type === "Delimiter" || e.type === "Quotes");
      if (fatal) return bad(res, `Could not parse CSV: ${fatal.message}`);
      rows = parsed.data;
    }

    if (rows.length === 0) return bad(res, "File parsed to zero usable rows.");
    if (rows.length > MAX_ROWS) return bad(res, `Too many rows (${rows.length}). Limit is ${MAX_ROWS}.`);

    // union of keys across rows so sparse JSON still gets every column
    const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => k !== "");
    if (keys.length === 0) return bad(res, "No columns found in file.");
    if (keys.length > MAX_COLS) return bad(res, `Too many columns (${keys.length}). Limit is ${MAX_COLS}.`);
    rows = rows.map((r) => Object.fromEntries(keys.map((k) => [k, r[k] ?? null])));

    const columns = detectColumns(rows);
    const cleaned = cleanRows(rows, columns);
    const name = String(req.body?.name || req.file.originalname).slice(0, 80);
    const dataset = await store.create(
      { name, source: "upload", original_filename: req.file.originalname, row_count: cleaned.length, columns },
      cleaned
    );
    res.status(201).json({ dataset: { ...dataset, original_filename: undefined } });
  } catch (err) {
    next(err);
  }
});

export default router;
