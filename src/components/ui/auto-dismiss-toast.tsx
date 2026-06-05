"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

type ToastVariant = "success" | "error";

interface Props {
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
}

export function AutoDismissToast({ message, variant = "success", durationMs = 4000 }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(timer);
  }, [durationMs]);

  if (!visible) return null;

  const isSuccess = variant === "success";

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-xl transition-all duration-300 ${
        isSuccess
          ? "border-emerald-200 bg-white text-emerald-800"
          : "border-rose-200 bg-white text-rose-800"
      }`}
    >
      <div className={`mt-0.5 shrink-0 rounded-full p-1 ${isSuccess ? "bg-emerald-100" : "bg-rose-100"}`}>
        {isSuccess
          ? <CheckCircle2 size={14} className="text-emerald-600" />
          : <AlertCircle size={14} className="text-rose-600" />}
      </div>
      <p className="flex-1 text-sm font-medium leading-snug">{message}</p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="mt-0.5 shrink-0 rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
