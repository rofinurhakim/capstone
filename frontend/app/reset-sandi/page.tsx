import Link from "next/link";

export default function ResetSandi() {
  return (
    <div className="grid min-h-screen place-items-center px-5">
      <section className="w-full max-w-sm rounded-3xl border border-[var(--line)] bg-white p-8">
        <h1 className="text-3xl font-extrabold">Email password reset is unavailable</h1>
        <p className="mt-3 text-sm opacity-70">To change your password, sign in and open Account → Change password. If you cannot sign in, contact your administrator.</p>
        <Link href="/login" className="mt-6 block rounded-xl bg-[var(--ink)] py-3 text-center font-semibold text-white">Back to sign in</Link>
      </section>
    </div>
  );
}
