"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function LupaSandi() {
  const [email, setEmail] = useState(""), [sent, setSent] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await api<{ ok?: boolean }>("/forgot-password", {}, { method: "POST", body: JSON.stringify({ email }) }, "If this email is registered, a password reset link has been sent.");
    if (r.ok) setSent(true);
  }
  return (
    <div className="grid min-h-screen place-items-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-[var(--line)] bg-white p-8">
        <h1 className="text-3xl font-extrabold">Forgot password</h1>
        <p className="mt-1 text-sm opacity-70">Enter your account email. We will send you a link to reset your password.</p>
        <label className="mt-6 block text-sm font-semibold">Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2.5" /></label>
        {sent && <p role="status" className="mt-4 font-semibold text-[var(--mint)]">If this email is registered, a reset link has been sent. Check your inbox.</p>}
        <button className="mt-6 w-full rounded-xl bg-[var(--ink)] py-3 font-semibold text-white">Send reset link</button>
        <Link href="/login" className="mt-4 block text-sm underline">Back to sign in</Link>
      </form>
    </div>
  );
}
