import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

export function ToastContainer() {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => {
        const colors =
          toast.type === "error"
            ? "bg-[#E11D48] text-white"
            : toast.type === "info"
              ? "bg-[#22328B] text-white"
              : "bg-[#10B981] text-white";

        const Icon =
          toast.type === "error"
            ? AlertCircle
            : toast.type === "info"
              ? Info
              : CheckCircle2;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-md items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${colors}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{toast.text}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="rounded-lg p-1 opacity-80 transition hover:opacity-100"
              aria-label="Fechar notificação"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
