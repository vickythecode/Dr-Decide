"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; message: string; kind: ToastKind };
type ToastContextValue = { pushToast: (message: string, kind?: ToastKind) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const pushToast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setItems((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 2800);
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`toast ${
              item.kind === "success"
                ? "toast-success"
                : item.kind === "error"
                ? "toast-error"
                : "toast-info"
            }`}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
