import { AlertTriangle, CheckCircle2, X } from "lucide-react";

export default function Toast({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-2 border rule bg-paper dark:bg-ink px-3 py-2 text-sm ${
            t.kind === "error" ? "border-l-2 border-l-coral" : "border-l-2 border-l-teal"
          }`}
        >
          {t.kind === "error" ? (
            <AlertTriangle size={16} className="text-coral mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="text-teal mt-0.5 shrink-0" />
          )}
          <span className="flex-1 text-ink dark:text-paper">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} aria-label="Dismiss" className="text-slate hover:text-ink dark:hover:text-paper">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
