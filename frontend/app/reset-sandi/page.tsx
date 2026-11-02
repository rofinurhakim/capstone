"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { PasswordInput } from "@/components/PasswordInput";

export default function ResetSandi() {
  const [q] = useState(() => {
    if (typeof window === "undefined") return { token: "", email: "" };
    const p = new URLSearchParams(window.location.search);
    return { token: p.get("token") ?? "", email: p.get("email") ?? "" };
  });
  const [f, setF] = useState({ password: "", password_confirmation: "" }), [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await api<{ ok?: boolean }>("/reset-password", {}, { method: "POST", body: JSON.stringify({ ...q, ...f }) }, "Password reset successfully.");
    if (r.ok) setDone(true);
  }
  const c = "mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2.5";
  return (
    <div className="grid min-h-screen place-items-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-[var(--line)] bg-white p-8">
        <h1 className="text-3xl font-extrabold">Create a new password</h1>
        {done ? (
          <p role="status" className="mt-6 font-semibold text-[var(--mint)]">Password updated. <Link href="/login" className="underline">Sign in now</Link></p>
        ) : (
          <>
            <label className="mt-6 block text-sm font-semibold">New password (at least 8 characters)<PasswordInput required minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className={c} autoComplete="new-password" /></label>
            <label className="mt-4 block text-sm font-semibold">Confirm password<PasswordInput required minLength={8} value={f.password_confirmation} onChange={(e) => setF({ ...f, password_confirmation: e.target.value })} className={c} autoComplete="new-password" /></label>
            <button className="mt-6 w-full rounded-xl bg-[var(--ink)] py-3 font-semibold text-white">Save password</button>
          </>
        )}
      </form>
    </div>
  );
}
