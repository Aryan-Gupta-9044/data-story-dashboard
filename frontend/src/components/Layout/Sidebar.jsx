import { useMemo } from "react";
import { X } from "lucide-react";

// One control per column, chosen by detected type. `meta` comes from the server
// (unfiltered), so ranges/options don't shrink while filtering.
export default function Sidebar({ columns, meta, filters, onChange, onClear, open, onClose }) {
  const dateCols = useMemo(() => columns.filter((c) => c.type === "date"), [columns]);
  const catCols = useMemo(() => columns.filter((c) => c.type === "categorical"), [columns]);
  const numCols = useMemo(() => columns.filter((c) => c.type === "numeric"), [columns]);
  const activeCount = Object.keys(filters).length;
  const input = "border rule bg-transparent text-xs px-2 py-1 text-ink dark:text-paper w-full";

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />}
      <aside
        data-html2canvas-ignore
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 lg:w-64 shrink-0 border-r rule px-4 py-5 overflow-y-auto
          bg-paper dark:bg-inkdeep transition-transform ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm text-ink dark:text-paper">Filters</h2>
          <div className="flex items-center gap-3">
            {activeCount > 0 && (
              <button onClick={onClear} className="text-xs text-slate hover:text-coral">clear {activeCount}</button>
            )}
            <button onClick={onClose} className="lg:hidden text-slate" aria-label="Close filters"><X size={16} /></button>
          </div>
        </div>

        {columns.length === 0 && <p className="text-xs text-slate">Choose a dataset to see its filters.</p>}

        {dateCols.map((col) => {
          const b = meta.dateBounds?.[col.name] || {};
          const cur = filters[col.name] || {};
          const set = (patch) => {
            const next = { type: "dateRange", start: cur.start, end: cur.end, ...patch };
            onChange(col.name, next.start || next.end ? next : null);
          };
          return (
            <div key={col.name} className="mb-5">
              <label className="block text-xs text-slate mb-1">{col.name}</label>
              <div className="flex flex-col gap-1">
                <input type="date" aria-label={`${col.name} from`} className={input} min={b.min} max={b.max} value={cur.start || ""} onChange={(e) => set({ start: e.target.value })} />
                <input type="date" aria-label={`${col.name} to`} className={input} min={b.min} max={b.max} value={cur.end || ""} onChange={(e) => set({ end: e.target.value })} />
              </div>
            </div>
          );
        })}

        {catCols.map((col) => {
          const values = meta.distinct?.[col.name] || [];
          const selected = filters[col.name]?.values || [];
          return (
            <div key={col.name} className="mb-5">
              <label className="block text-xs text-slate mb-1">{col.name}</label>
              <div className="max-h-32 overflow-y-auto border rule px-2 py-1.5 flex flex-col gap-1">
                {values.map((v) => (
                  <label key={v} className="flex items-center gap-2 text-xs text-ink dark:text-paper">
                    <input
                      type="checkbox"
                      checked={selected.includes(v)}
                      onChange={(e) => {
                        const next = e.target.checked ? [...selected, v] : selected.filter((s) => s !== v);
                        onChange(col.name, next.length ? { type: "in", values: next } : null);
                      }}
                    />
                    {v}
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        {numCols.map((col) => {
          const b = meta.bounds?.[col.name];
          if (!b || b.min === b.max) return null;
          const cur = filters[col.name] || { min: b.min, max: b.max };
          const step = b.max - b.min > 20 ? 1 : (b.max - b.min) / 100;
          // A range spanning the full bounds is "no filter" — drop it so the badge count is honest.
          const set = (min, max) => onChange(col.name, min <= b.min && max >= b.max ? null : { type: "range", min, max });
          return (
            <div key={col.name} className="mb-5">
              <label className="block text-xs text-slate mb-1">
                {col.name} <span className="figure">({+cur.min.toFixed(2)}–{+cur.max.toFixed(2)})</span>
              </label>
              <div className="flex flex-col gap-1">
                <input type="range" aria-label={`${col.name} minimum`} min={b.min} max={b.max} step={step} value={cur.min}
                  onChange={(e) => set(Math.min(Number(e.target.value), cur.max), cur.max)} />
                <input type="range" aria-label={`${col.name} maximum`} min={b.min} max={b.max} step={step} value={cur.max}
                  onChange={(e) => set(cur.min, Math.max(Number(e.target.value), cur.min))} />
              </div>
            </div>
          );
        })}
      </aside>
    </>
  );
}
