// Column type detection, cleaning, filtering, and lightweight
// rule-based "insight" generation shared by the analytics/export routes.

const DATE_RE = /^(\d{4}-\d{2}-\d{2}(T.*)?|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})$/;
const isDateLike = (v) => DATE_RE.test(String(v).trim()) && !Number.isNaN(Date.parse(v));

export function inferColumnType(values) {
  const sample = values.filter((v) => v !== null && v !== undefined && v !== "");
  if (sample.length === 0) return "string";

  const numericCount = sample.filter((v) => v !== "" && !Number.isNaN(Number(v))).length;
  if (numericCount / sample.length > 0.9) return "numeric";

  const dateCount = sample.filter(isDateLike).length;
  if (dateCount / sample.length > 0.9) return "date";

  const uniqueRatio = new Set(sample.map(String)).size / sample.length;
  if (uniqueRatio < 0.5) return "categorical";

  return "string";
}

export function detectColumns(rows) {
  if (rows.length === 0) return [];
  const names = Object.keys(rows[0]);
  return names.map((name) => {
    const values = rows.map((r) => r[name]);
    const type = inferColumnType(values);
    const nullable = values.some((v) => v === null || v === undefined || v === "");
    return { name, type, nullable };
  });
}

// Replace missing values with a type-appropriate placeholder instead of
// dropping the row, so partial records still show up in the table/charts.
export function cleanRows(rows, columns) {
  return rows.map((row) => {
    const cleaned = { ...row };
    for (const col of columns) {
      const v = cleaned[col.name];
      if (v === null || v === undefined || v === "") {
        cleaned[col.name] = col.type === "numeric" ? null : col.type === "date" ? null : "Unknown";
      } else if (col.type === "numeric") {
        cleaned[col.name] = Number(v);
      }
    }
    return cleaned;
  });
}

export function applyFilters(rows, filters = {}) {
  return rows.filter((row) =>
    Object.entries(filters).every(([col, rule]) => {
      if (!rule) return true;
      const value = row[col];
      if (rule.type === "range") {
        if (value === null || value === undefined) return false;
        const n = Number(value);
        if (rule.min !== undefined && n < rule.min) return false;
        if (rule.max !== undefined && n > rule.max) return false;
        return true;
      }
      if (rule.type === "dateRange") {
        if (!value) return false;
        const t = new Date(value).getTime();
        if (rule.start && t < new Date(rule.start).getTime()) return false;
        if (rule.end && t > new Date(rule.end).getTime()) return false;
        return true;
      }
      if (rule.type === "in") {
        if (!rule.values || rule.values.length === 0) return true;
        return rule.values.includes(String(value));
      }
      return true;
    })
  );
}

// Pick the "headline" numeric column: prefer names that look like a business
// measure, avoid ids/ratings, else fall back to the first numeric column.
const METRIC_HINT = /(amount|revenue|sales|price|package|consumption|total|value|salary|cost|profit|income|energy|qty|quantity|count)/i;
const METRIC_AVOID = /(id|index|year|cgpa|gpa|pct|percent|rate|rating|lat|lng|lon)$/i;
export function pickMetrics(columns) {
  const nums = columns.filter((c) => c.type === "numeric");
  const ranked = [
    ...nums.filter((c) => METRIC_HINT.test(c.name) && !METRIC_AVOID.test(c.name)),
    ...nums.filter((c) => !METRIC_AVOID.test(c.name)),
    ...nums,
  ];
  return [...new Set(ranked)];
}

export function computeKpis(rows, columns) {
  const metrics = pickMetrics(columns);
  const categoricalCols = columns.filter((c) => c.type === "categorical");
  const kpis = [{ label: "Total records", value: rows.length }];

  const nums = (col) => rows.map((r) => Number(r[col])).filter((n) => Number.isFinite(n));
  if (metrics[0]) {
    const v = nums(metrics[0].name);
    kpis.push({ label: `Average ${metrics[0].name}`, value: v.length ? round(v.reduce((a, b) => a + b, 0) / v.length) : 0 });
    kpis.push({ label: `Peak ${metrics[0].name}`, value: v.length ? round(Math.max(...v)) : 0 });
  }
  if (categoricalCols[0] && rows.length) {
    const col = categoricalCols[0].name;
    const top = Object.entries(countBy(rows, col)).sort((a, b) => b[1] - a[1])[0];
    kpis.push({ label: `Top ${col}`, value: top ? top[0] : "—", hint: top ? `${round((top[1] / rows.length) * 100)}% of records` : "" });
  } else {
    kpis.push({ label: "Columns", value: columns.length });
  }
  return kpis;
}

export function countBy(rows, col) {
  const out = {};
  for (const r of rows) {
    const key = String(r[col] ?? "Unknown");
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

export function sumBy(rows, groupCol, valueCol) {
  const out = {};
  for (const r of rows) {
    const key = String(r[groupCol] ?? "Unknown");
    const v = Number(r[valueCol]);
    if (Number.isNaN(v)) continue;
    out[key] = (out[key] || 0) + v;
  }
  return out;
}

// Rule-based narrative highlights — no external AI call, just arithmetic
// over the current (filtered) rows.
export function generateInsights(rows, columns) {
  const insights = [];
  const numericCols = pickMetrics(columns);
  const categoricalCols = columns.filter((c) => c.type === "categorical");
  if (rows.length < 5) return insights;

  if (categoricalCols[0] && numericCols[0]) {
    const cat = categoricalCols[0].name;
    const num = numericCols[0].name;
    const totals = sumBy(rows, cat, num);
    const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);
    const [topKey, topVal] = Object.entries(totals).sort((a, b) => b[1] - a[1])[0] || [];
    if (topKey && grandTotal > 0) {
      const pct = round((topVal / grandTotal) * 100);
      insights.push(`${topKey} accounts for ${pct}% of total ${num} across ${rows.length} records.`);
    }
  }

  if (numericCols[0]) {
    const col = numericCols[0].name;
    const values = rows.map((r) => Number(r[col])).filter((n) => !Number.isNaN(n));
    if (values.length > 1) {
      const max = Math.max(...values);
      const min = Math.min(...values);
      const spread = round(((max - min) / (min || 1)) * 100);
      insights.push(`${col} ranges from ${round(min)} to ${round(max)}, a spread of ${spread}%.`);
    }
  }

  const dateCol = columns.find((c) => c.type === "date");
  if (dateCol && numericCols[0]) {
    const sorted = [...rows].sort(
      (a, b) => new Date(a[dateCol.name]) - new Date(b[dateCol.name])
    );
    const numCol = numericCols[0].name;
    const peak = sorted.reduce(
      (best, r) => (Number(r[numCol]) > Number(best[numCol] ?? -Infinity) ? r : best),
      sorted[0] || {}
    );
    if (peak && peak[dateCol.name]) {
      insights.push(`${numCol} peaked on ${formatDate(peak[dateCol.name])}.`);
    }
  }

  return insights.slice(0, 3);
}

// Flags per row: IQR outliers ("Outlier: col") take priority, then the very
// top / bottom value of a numeric column ("Highest col" / "Lowest col").
export function flagAnomalies(rows, columns) {
  const flags = new Array(rows.length).fill(null);
  for (const col of columns.filter((c) => c.type === "numeric")) {
    const vals = rows.map((r) => Number(r[col.name])).filter((n) => Number.isFinite(n));
    if (vals.length < 8) continue;
    const sorted = [...vals].sort((a, b) => a - b);
    const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
    const q1 = q(0.25), q3 = q(0.75), iqr = q3 - q1;
    if (iqr === 0) continue;
    const hi = q3 + 1.5 * iqr, lo = q1 - 1.5 * iqr;
    const max = sorted[sorted.length - 1], min = sorted[0];
    rows.forEach((r, i) => {
      const v = Number(r[col.name]);
      if (!Number.isFinite(v) || flags[i]) return;
      if (v > hi) flags[i] = `Outlier high: ${col.name}`;
      else if (v < lo) flags[i] = `Outlier low: ${col.name}`;
      else if (v === max) flags[i] = `Highest ${col.name}`;
    });
  }
  return flags;
}

// Unfiltered metadata for the filter sidebar: distinct categorical values,
// numeric min/max, date min/max.
export function computeMeta(rows, columns) {
  const meta = { distinct: {}, bounds: {}, dateBounds: {} };
  for (const col of columns) {
    if (col.type === "categorical") {
      meta.distinct[col.name] = [...new Set(rows.map((r) => String(r[col.name] ?? "Unknown")))].sort().slice(0, 200);
    } else if (col.type === "numeric") {
      const v = rows.map((r) => Number(r[col.name])).filter((n) => Number.isFinite(n));
      if (v.length) meta.bounds[col.name] = { min: Math.min(...v), max: Math.max(...v) };
    } else if (col.type === "date") {
      const t = rows.map((r) => Date.parse(r[col.name])).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
      if (t.length) meta.dateBounds[col.name] = { min: new Date(t[0]).toISOString().slice(0, 10), max: new Date(t[t.length - 1]).toISOString().slice(0, 10) };
    }
  }
  return meta;
}

// Shared by /analytics/filter and /export so both apply identical logic.
export function applySearch(rows, search) {
  const q = String(search || "").trim().slice(0, 100).toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q)));
}

export function applySort(rows, columns, sort) {
  if (!sort?.col || !columns.some((c) => c.name === sort.col)) return rows; // whitelist column
  const dir = sort.dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a[sort.col], bv = b[sort.col];
    if (av == null && bv == null) return 0;
    if (av == null) return 1; // nulls always last
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
  });
}

function round(n) {
  return Math.round(n * 100) / 100;
}

function formatDate(v) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toISOString().slice(0, 10);
}
