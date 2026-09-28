import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import TopBar from "./components/Layout/TopBar.jsx";
import Sidebar from "./components/Layout/Sidebar.jsx";
import KpiStrip from "./components/KpiStrip.jsx";
import ChartPanel from "./components/ChartPanel.jsx";
import InsightsPanel from "./components/InsightsPanel.jsx";
import DataTable from "./components/DataTable.jsx";
import UploadZone from "./components/UploadZone.jsx";
import Toast from "./components/Toast.jsx";
import { listDatasets, uploadDataset, filterDataset, exportUrl } from "./lib/api.js";
import { exportReport } from "./lib/report.js";

const MAX_BYTES = 10 * 1024 * 1024;
const PAGE_SIZE = 20;
const EMPTY_META = { distinct: {}, bounds: {}, dateBounds: {} };

export default function App() {
  const [dark, setDark] = useState(() => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);
  const [datasets, setDatasets] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [drawer, setDrawer] = useState(false);

  const [columns, setColumns] = useState([]);
  const [meta, setMeta] = useState(EMPTY_META);
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(null);
  const [page, setPage] = useState(1);
  const [customAxis, setCustomAxis] = useState({ x: "", y: "" });

  const [kpis, setKpis] = useState([]);
  const [insights, setInsights] = useState([]);
  const [charts, setCharts] = useState({});
  const [metric, setMetric] = useState(null);
  const [table, setTable] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(false);

  const reportRef = useRef(null);
  const [toasts, setToasts] = useState([]);
  const pushToast = useCallback((message, kind = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-3), { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  const refreshDatasets = useCallback(async () => {
    try {
      const list = await listDatasets();
      setDatasets(list);
      setSelectedId((cur) => cur || (list.find((d) => d.source === "sample") || list[0])?.id || "");
      return list;
    } catch (err) {
      pushToast(err.message, "error");
      return [];
    }
  }, [pushToast]);
  useEffect(() => { refreshDatasets(); }, [refreshDatasets]);

  // Switching dataset resets the view.
  useEffect(() => {
    setFilters({}); setSearch(""); setSort(null); setPage(1); setCustomAxis({ x: "", y: "" });
    setMeta(EMPTY_META); setColumns([]);
  }, [selectedId]);

  // One request drives KPIs + charts + insights + table. Stale responses are aborted.
  useEffect(() => {
    if (!selectedId) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await filterDataset({ datasetId: selectedId, filters, search, sort, page, pageSize: PAGE_SIZE, customAxis }, ctrl.signal);
        setColumns(r.columns); setKpis(r.kpis); setInsights(r.insights); setCharts(r.charts);
        setMetric(r.metric); setMeta(r.meta); setTable(r.table);
        if (r.table.total === 0 && (Object.keys(filters).length || search)) pushToast("No records match these filters. Try clearing one.", "info");
      } catch (err) {
        if (err.name !== "AbortError") pushToast(err.message, "error");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, search ? 300 : 0); // debounce free-text search
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [selectedId, filters, search, sort, page, customAxis, pushToast]);

  async function handleUpload(file) {
    if (file.size > MAX_BYTES) return pushToast("That file is over the 10MB limit.", "error");
    if (!/\.(csv|json)$/i.test(file.name)) return pushToast("Only .csv or .json files are accepted.", "error");
    setUploading(true);
    try {
      const ds = await uploadDataset(file);
      pushToast(`Loaded "${ds.name}" — ${ds.row_count} rows.`, "success");
      await refreshDatasets();
      setSelectedId(ds.id);
    } catch (err) {
      pushToast(`Upload failed: ${err.message}`, "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleExport(format) {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const name = datasets.find((d) => d.id === selectedId)?.name || "dashboard";
      await exportReport(reportRef.current, { format, dark, title: name });
      pushToast(`Report saved as ${format.toUpperCase()}.`, "success");
    } catch (err) {
      pushToast(`Could not render report: ${err.message}`, "error");
    } finally {
      setExporting(false);
    }
  }

  function updateFilter(col, rule) {
    setPage(1);
    setFilters((f) => {
      const next = { ...f };
      if (rule) next[col] = rule; else delete next[col];
      return next;
    });
  }

  const exportHref = useMemo(
    () => (selectedId ? exportUrl({ datasetId: selectedId, filters, search, sort }) : "#"),
    [selectedId, filters, search, sort]
  );

  return (
    <div className="min-h-screen flex flex-col text-ink dark:text-paper">
      <TopBar
        datasets={datasets} selectedId={selectedId} onSelect={setSelectedId}
        onUpload={handleUpload} uploading={uploading}
        dark={dark} onToggleDark={() => setDark((d) => !d)}
        onExport={handleExport} exporting={exporting}
        onToggleFilters={() => setDrawer((o) => !o)}
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          columns={columns} meta={meta} filters={filters} onChange={updateFilter}
          onClear={() => { setFilters({}); setPage(1); }}
          open={drawer} onClose={() => setDrawer(false)}
        />

        <main className="flex-1 min-w-0 overflow-y-auto">
          {!selectedId ? (
            <UploadZone onUpload={handleUpload} uploading={uploading} />
          ) : (
            <div ref={reportRef} className="bg-paper dark:bg-inkdeep">
              <KpiStrip kpis={kpis} />
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px]">
                <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
                  <ChartPanel columns={columns} charts={charts} metricName={metric} customAxis={customAxis} onCustomAxisChange={setCustomAxis} />
                </div>
                <InsightsPanel insights={insights} />
              </div>
              <DataTable
                columns={columns} table={table} search={search}
                onSearchChange={(v) => { setPage(1); setSearch(v.slice(0, 100)); }}
                sort={sort} onSortChange={(s) => { setPage(1); setSort(s); }}
                page={page} pageSize={PAGE_SIZE} onPageChange={setPage} exportHref={exportHref}
              />
            </div>
          )}
        </main>
      </div>

      <Toast toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
