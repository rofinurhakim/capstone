"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarCheck, CalendarDays, ClipboardCheck, FileText, GraduationCap, KeyRound, LogOut, Menu, RefreshCw, School, UserRound, UsersRound, X } from "lucide-react";
import { hasRole, logout, session, Session } from "@/lib/api";
import { BecLogo } from "@/components/BecLogo";

type Role = Session["role"];
const PUB = ["/login", "/lupa-sandi", "/reset-sandi"];
const NAV: [string, string, Role[], typeof School][] = [
  ["/", "Dashboard", ["admin", "academic_admin", "teacher"], School], ["/nilai", "Grades", ["admin", "academic_admin", "teacher"], ClipboardCheck], ["/absensi", "Attendance", ["admin", "academic_admin", "teacher"], CalendarCheck], ["/kalender", "Calendar", ["admin", "academic_admin", "teacher", "parent"], CalendarDays],
  ["/rapor", "Report cards", ["admin", "academic_admin", "teacher", "parent"], FileText], ["/daftar-ulang", "Enrollment", ["admin", "academic_admin", "parent"], RefreshCw], ["/murid-baru", "New student", ["admin", "academic_admin"], UserRound],
  ["/guru", "Child's teachers", ["parent"], UserRound],
  ["/murid", "Students", ["admin", "academic_admin"], UsersRound], ["/kelas", "Classes", ["admin", "academic_admin"], GraduationCap], ["/akun", "Account", ["admin", "academic_admin", "teacher", "parent"], KeyRound],
];
const ROLE_LABEL: Record<Role, string> = { admin: "Admin", academic_admin: "Academic Admin", teacher: "Teacher", parent: "Parent / Guardian" };

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(), router = useRouter();
  const [s, setS] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const u = session();
    const timer = window.setTimeout(() => { setS(u); setReady(true); }, 0);
    const home = u?.role === "parent" ? "/rapor" : "/";
    if (!u && !PUB.includes(path)) router.replace("/login");
    else if (u && path === "/login") router.replace(home);
    else if (u && !NAV.some(([h, , roles]) => (h === path || path.startsWith(`${h}/`)) && roles.some((role) => hasRole(role, u)))) router.replace(home);
    return () => window.clearTimeout(timer);
  }, [path, router]);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  if (!ready || (!s && !PUB.includes(path))) return null;
  if (PUB.includes(path)) return <>{children}</>;
  const visibleNav = NAV.filter(([, , roles]) => s && roles.some((role) => hasRole(role, s)));
  const initials = (s?.name ?? "").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const visibleRoles = (s?.roles ?? (s ? [s.role] : [])).filter((role, index, roles) => roles.indexOf(role) === index);
  const roleLabel = visibleRoles.map((role) => ROLE_LABEL[role]).join(" / ");

  return (
    <div className="min-h-screen lg:pl-[272px]">
      <header className="mobile-topbar sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--line)] bg-white/95 px-4 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu" aria-expanded={mobileOpen} aria-controls="primary-sidebar" className="grid size-10 place-items-center rounded-xl border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper)]"><Menu size={19} /></button>
        <div className="flex min-w-0 items-center gap-2.5">
          <BecLogo size={36} className="rounded-lg" />
          <span className="truncate font-extrabold" style={{ fontFamily: "var(--font-head)" }}>Bethesda English Course</span>
        </div>
        <span className="ml-auto max-w-[36%] truncate text-xs font-semibold text-[var(--mint)]">{s?.name}</span>
      </header>

      {mobileOpen && <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} className="mobile-sidebar-backdrop fixed inset-0 z-40 bg-[rgba(16,30,43,.48)] backdrop-blur-[2px] lg:hidden" />}

      <aside id="primary-sidebar" aria-label="Main navigation" role={mobileOpen ? "dialog" : undefined} aria-modal={mobileOpen || undefined}
        className={`app-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(84vw,290px)] flex-col border-r border-[var(--line)] bg-white px-4 pb-4 pt-5 shadow-[8px_0_32px_rgba(22,38,76,.08)] transition-transform duration-200 ease-out lg:w-[272px] lg:translate-x-0 lg:px-5 lg:shadow-none ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-3 px-1">
          <BecLogo size={48} className="rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-extrabold leading-tight" style={{ fontFamily: "var(--font-head)" }}>Bethesda English Course</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[.12em] text-[var(--mint)]">Sidoarjo</p>
          </div>
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="grid size-9 place-items-center rounded-xl text-[var(--ink)] hover:bg-[var(--paper)] lg:hidden"><X size={19} /></button>
        </div>

        <div className="mt-8 px-2 text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-400">Main menu</div>
        <nav aria-label="Main menu" className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1">
          {visibleNav.map(([href, title, , Icon]) => {
            const active = href === path || (href !== "/" && path.startsWith(`${href}/`));
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} onClick={() => setMobileOpen(false)}
              className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition-colors ${active ? "bg-[#e6f4ef] text-[#177e68]" : "text-slate-600 hover:bg-[#f2f6f5] hover:text-[var(--ink)]"}`}>
              <Icon size={18} strokeWidth={active ? 2.4 : 2} className={active ? "text-[#16866d]" : "text-slate-400 group-hover:text-[var(--mint)]"} />
              <span className="truncate">{title}</span>
              {active && <span className="ml-auto size-1.5 rounded-full bg-[var(--mint)]" aria-hidden="true" />}
            </Link>;
          })}
        </nav>

        <div className="mt-4 border-t border-[var(--line)] pt-4">
          <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-[#f4f7f6] p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#fce7a5] text-sm font-extrabold text-[var(--ink)]">{initials || <UserRound size={17} />}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{s?.name}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{roleLabel}</p>
            </div>
          </div>
          <button type="button" onClick={logout} className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-500 transition-colors hover:bg-[#fff0ed] hover:text-[var(--coral)]"><LogOut size={17} />Sign out</button>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-[1440px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
