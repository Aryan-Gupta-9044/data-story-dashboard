import { ArrowDown, ArrowUp, Download, Search } from "lucide-react";

export default function DataTable({
  columns, table, search, onSearchChange, sort, onSortChange,
  page, pageSize, onPageChange, exportHref,
}) {
  const totalPages = Math.max(1, Math.ceil(table.total / pageSize));

  return (
    <div className="border-t rule">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b rule">
        <div className="flex items-center gap-1.5 border rule px-2 py-1 flex-1 max-w-xs">
          <Search size={14} className="text-slate" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="search records"
            className="bg-transparent text-sm w-full focus:outline-none text-ink dark:text-paper"
          />
        </div>
        <span className="text-xs text-slate">{table.total} matching records</span>
        <div className="flex-1" />
        <a data-html2canvas-ignore
          href={exportHref} download
          className="flex items-center gap-1.5 border rule px-2.5 py-1 text-xs text-ink dark:text-paper hover:bg-line/30"
        >
          <Download size={13} /> export filtered CSV
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b rule text-left">
              {columns.map((c) => (
                <th key={c.name} className="px-4 py-2 font-normal text-xs text-slate whitespace-nowrap">
                  <button
                    className="flex items-center gap-1 hover:text-ink dark:hover:text-paper"
                    onClick={() =>
                      onSortChange({ col: c.name, dir: sort?.col === c.name && sort.dir === "asc" ? "desc" : "asc" })
                    }
                  >
                    {c.name}
                    {sort?.col === c.name && (sort.dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                  </button>
                </th>
              ))}
              <th className="px-4 py-2 text-xs text-slate">flag</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, i) => (
              <tr key={i} className="border-b rule hover:bg-line/10">
                {columns.map((c) => (
                  <td key={c.name} className="px-4 py-1.5 figure text-xs whitespace-nowrap text-ink dark:text-paper">
                    {String(r.row[c.name] ?? "")}
                  </td>
                ))}
                <td className="px-4 py-1.5 text-xs">
                  {r.anomaly && <span className="border border-amber text-amber px-1.5 py-0.5">{r.anomaly}</span>}
                </td>
              </tr>
            ))}
            {table.rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-sm text-slate">
                  No records match the current filters. Try clearing one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs text-slate">page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="border rule px-2.5 py-1 text-xs disabled:opacity-40 text-ink dark:text-paper"
          >
            prev
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="border rule px-2.5 py-1 text-xs disabled:opacity-40 text-ink dark:text-paper"
          >
            next
          </button>
        </div>
      </div>
    </div>
  );
}
