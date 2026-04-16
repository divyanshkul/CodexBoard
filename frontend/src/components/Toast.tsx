"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

export interface ToastItem {
  id: string;
  message: string;
  type?: "error" | "success";
}

/** Render a stack of auto-dismissing toasts at the bottom-right. */
export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <Toast key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), 5000);
    return () => clearTimeout(timer);
  }, [item.id, onDismiss]);

  const isError = item.type === "error";

  return (
    <div
      className="pointer-events-auto flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border text-[12px] leading-[1.4] shadow-lg animate-toast-in max-w-[360px]"
      style={{
        background: "var(--card-bg)",
        borderColor: isError ? "var(--status-failed)" : "var(--status-done)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)",
      }}
    >
      {isError ? (
        <AlertCircle size={14} className="flex-shrink-0 mt-px" style={{ color: "var(--status-failed)" }} />
      ) : (
        <CheckCircle2 size={14} className="flex-shrink-0 mt-px" style={{ color: "var(--status-done)" }} />
      )}
      <span className="text-text-primary flex-1">{item.message}</span>
      <button
        onClick={() => onDismiss(item.id)}
        className="flex-shrink-0 p-0.5 rounded hover:bg-[var(--border-divider)] text-text-faint hover:text-text-muted transition-colors"
      >
        <X size={12} />
      </button>
    </div>
  );
}

/** Simple toast state manager. */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastItem["type"] = "error") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}
