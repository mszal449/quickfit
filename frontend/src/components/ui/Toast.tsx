import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";

type Tone = "error" | "success" | "info";

interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
}

interface ToastApi {
  show: (message: string, tone?: Tone) => void;
  error: (message: string) => void;
  success: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const dotTones: Record<Tone, string> = {
  error: "bg-danger",
  success: "bg-success",
  info: "bg-primary",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((xs) => xs.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: Tone = "info") => {
      const id = Date.now() + Math.random();
      setItems((xs) => [...xs, { id, message, tone }]);
      window.setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  const api: ToastApi = {
    show,
    error: (m) => show(m, "error"),
    success: (m) => show(m, "success"),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex flex-col items-center gap-2 p-4"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        >
          {items.map((t) => (
            <div
              key={t.id}
              role="status"
              onClick={() => remove(t.id)}
              className={cn(
                "pointer-events-auto flex max-w-sm animate-[toastIn_180ms_ease-out] cursor-pointer items-center gap-2.5",
                "border-border bg-surface-2 text-fg rounded-xl border px-4 py-2.5 text-sm font-medium shadow-xl shadow-black/40",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  dotTones[t.tone],
                )}
              />
              {t.message}
            </div>
          ))}
        </div>,
        document.body,
      )}
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
