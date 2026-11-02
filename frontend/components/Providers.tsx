"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; message: string; type: "success" | "error" };

export default function Providers({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let id = 0;
    const show = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; type?: "success" | "error" }>).detail;
      const toast = { id: ++id, message: detail.message, type: detail.type ?? "success" } satisfies Toast;
      setToasts((items) => [...items.slice(-2), toast]);
      window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== toast.id)), 4200);
    };
    const showError = (event: Event) => {
      show(new CustomEvent("app-toast", { detail: { message: (event as CustomEvent<string>).detail, type: "error" } }));
    };
    window.addEventListener("app-toast", show);
    window.addEventListener("app-error", showError);
    return () => {
      window.removeEventListener("app-toast", show);
      window.removeEventListener("app-error", showError);
    };
  }, []);

  return <>
    {children}
    <div aria-live="polite" aria-atomic="false" className="fixed bottom-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => <div key={toast.id} role={toast.type === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 font-semibold text-white shadow-lg ${toast.type === "error" ? "bg-[var(--coral)]" : "bg-[var(--mint)]"}`}>{toast.message}</div>)}
    </div>
  </>;
}