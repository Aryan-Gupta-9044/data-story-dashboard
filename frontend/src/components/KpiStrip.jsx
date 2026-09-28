export default function KpiStrip({ kpis }) {
  if (!kpis.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 border-b rule">
      {kpis.map((k, i) => (
        <div key={k.label} className={`px-5 py-4 min-w-0 ${i > 0 ? "sm:border-l rule" : ""} ${i % 2 === 1 ? "border-l rule sm:border-l" : ""}`}>
          <div className="text-xs text-slate mb-1 truncate">{k.label}</div>
          <div className="figure text-2xl text-ink dark:text-paper truncate" title={String(k.value)}>
            {typeof k.value === "number" ? k.value.toLocaleString() : k.value}
          </div>
          {k.hint && <div className="text-xs text-slate mt-0.5">{k.hint}</div>}
        </div>
      ))}
    </div>
  );
}
