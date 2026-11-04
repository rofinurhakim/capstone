"use client";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { BASE, notify } from "@/lib/api";
import { PasswordInput } from "@/components/PasswordInput";
import { BecLogo } from "@/components/BecLogo";

function subscribeToPasswordChange(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getPasswordChangeNotice() {
  return new URLSearchParams(window.location.search).get("password-changed") === "1";
}

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const passwordChanged = useSyncExternalStore(subscribeToPasswordChange, getPasswordChangeNotice, () => false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const r = await fetch(BASE + "/login", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ email, password }) });
      const b = await r.json();
      if (!r.ok) throw new Error(b.message === "Email atau kata sandi salah." ? "The email or password is incorrect." : b.message ?? "The email or password is incorrect.");
      localStorage.setItem("session", JSON.stringify(b));
      notify("Signed in successfully.");
      router.replace(b.role === "parent" ? "/rapor" : "/");
    } catch (x) { const message = x instanceof Error && x.message !== "Failed to fetch" ? x.message : "Unable to connect to the server."; setErr(message); notify(message, "error"); }
    setBusy(false);
  }

  const f = "mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5";
  return (
    <div className="grid min-h-screen place-items-center px-5">
      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm rounded-3xl border border-[var(--line)] bg-white p-8">
        <BecLogo size={128} className="mx-auto mb-5 rounded-2xl" />
        <h1 className="text-3xl font-extrabold">Sign in to Bethesda English Course</h1>
        <p className="mt-1 text-sm opacity-70">For admins, academic administrators, teachers, and parents.</p>
        {passwordChanged && <p role="status" className="mt-4 rounded-xl bg-[var(--mint)] px-4 py-3 font-semibold text-white">Password changed successfully. Please sign in again with your new password.</p>}
        <label className="mt-6 block text-sm font-semibold">Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={f} autoComplete="username" /></label>
        <label className="mt-4 block text-sm font-semibold">Password<PasswordInput required value={password} onChange={(e) => setPassword(e.target.value)} className={f} autoComplete="current-password" /></label>
        {err && <p role="alert" className="mt-4 text-sm font-semibold text-[var(--coral)]">{err}</p>}
        <Link href="/lupa-sandi" className="mt-4 block text-sm underline">How to change a password</Link>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-[var(--ink)] py-3 font-semibold text-white disabled:opacity-60">{busy ? "Signing in..." : "Sign in"}</button>
      </motion.form>
    </div>
  );
}
