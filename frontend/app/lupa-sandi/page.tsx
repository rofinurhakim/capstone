import Link from "next/link";

export default function LupaSandi() {
  return (
    <div className="grid min-h-screen place-items-center px-5">
      <section className="w-full max-w-sm rounded-3xl border border-[var(--line)] bg-white p-8">
        <h1 className="text-3xl font-extrabold">Change your password</h1>
        <p className="mt-3 text-sm opacity-70">Password changes do not use email. Sign in, open Account, then choose Change password. You will need your current password and will be asked to sign in again after saving.</p>
        <p className="mt-4 text-sm opacity-70">If you cannot sign in because you forgot your password, contact your administrator for help.</p>
        <Link href="/login" className="mt-6 block rounded-xl bg-[var(--ink)] py-3 text-center font-semibold text-white">Back to sign in</Link>
      </section>
    </div>
  );
}
