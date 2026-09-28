import { useRef, useState } from "react";
import { FileImage, FileText, Moon, SlidersHorizontal, Sun, Upload } from "lucide-react";

export default function TopBar({ datasets, selectedId, onSelect, onUpload, uploading, dark, onToggleDark, onExport, exporting, onToggleFilters }) {
  const fileRef = useRef(null);
  const [menu, setMenu] = useState(false);
  const btn = "flex items-center gap-1.5 border rule px-3 py-1.5 text-sm text-ink dark:text-paper hover:bg-line/30 disabled:opacity-50";

  return (
    <header className="border-b rule flex flex-wrap items-center gap-x-3 gap-y-2 px-4 sm:px-6 py-3" data-html2canvas-ignore>
      <button onClick={onToggleFilters} className={`${btn} lg:hidden`} aria-label="Toggle filters">
        <SlidersHorizontal size={14} /> Filters
      </button>
      <div className="mr-auto">
        <h1 className="font-serif text-xl leading-none text-ink dark:text-paper">Field Notes</h1>
        <p className="text-xs text-slate mt-0.5 hidden sm:block">a working notebook for a dataset, not a slideshow</p>
      </div>

      <select
        value={selectedId || ""}
        onChange={(e) => onSelect(e.target.value)}
        aria-label="Dataset"
        className="bg-transparent border rule px-2 py-1.5 text-sm text-ink dark:text-paper max-w-[14rem]"
      >
        {datasets.length === 0 && <option value="">No datasets yet</option>}
        {datasets.map((d) => (
          <option key={d.id} value={d.id} className="text-ink">{d.name} · {d.row_count} rows</option>
        ))}
      </select>

      <button onClick={() => fileRef.current?.click()} disabled={uploading} className={btn}>
        <Upload size={14} /> <span className="hidden sm:inline">{uploading ? "Reading file…" : "Upload .csv / .json"}</span>
      </button>
      <input ref={fileRef} type="file" accept=".csv,.json" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />

      <div className="relative">
        <button onClick={() => setMenu((m) => !m)} disabled={exporting || !selectedId} className={btn}>
          <FileText size={14} /> {exporting ? "Rendering…" : "Report"}
        </button>
        {menu && (
          <div className="absolute right-0 mt-1 z-30 border rule bg-paper dark:bg-inkdeep w-40">
            <button className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-ink dark:text-paper hover:bg-line/30"
              onClick={() => { setMenu(false); onExport("pdf"); }}><FileText size={13} /> Download PDF</button>
            <button className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-ink dark:text-paper hover:bg-line/30"
              onClick={() => { setMenu(false); onExport("png"); }}><FileImage size={13} /> Download PNG</button>
          </div>
        )}
      </div>

      <button onClick={onToggleDark} aria-label="Toggle theme" className="border rule p-1.5 text-ink dark:text-paper hover:bg-line/30">
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </header>
  );
}
