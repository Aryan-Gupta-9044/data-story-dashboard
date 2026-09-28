export default function InsightsPanel({ insights }) {
  return (
    <div className="border-t xl:border-t-0 xl:border-l rule px-4 py-4">
      <h3 className="text-sm text-ink dark:text-paper mb-2">Notes on this view</h3>
      {insights.length === 0 ? (
        <p className="narrative text-sm text-slate">Nothing stands out yet — try clearing a filter or two.</p>
      ) : (
        <ul className="space-y-1.5">
          {insights.map((line, i) => (
            <li key={i} className="narrative text-sm text-ink dark:text-paper border-l-2 border-l-amber pl-3">
              {line}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
