"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CalendarCheck, CalendarDays, ChevronDown, ClipboardCheck, FileText, GraduationCap, KeyRound, LogOut, Menu, RefreshCw, School, UserRound, UsersRound, X } from "lucide-react";
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

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
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setAccountMenuOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  if (!ready || (!s && !PUB.includes(path))) return null;
  if (PUB.includes(path)) return <>{children}</>;
  const visibleNav = NAV.filter(([href, , roles]) => href !== "/akun" && s && roles.some((role) => hasRole(role, s)));
  const initials = (s?.name ?? "").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const visibleRoles = (s?.roles ?? (s ? [s.role] : [])).filter((role, index, roles) => roles.indexOf(role) === index);
  const roleLabel = visibleRoles.map((role) => ROLE_LABEL[role]).join(" / ");

  return (
    <div className={`min-h-screen transition-[padding] duration-200 ${sidebarCollapsed ? "lg:pl-[88px]" : "lg:pl-[272px]"}`}>

      {mobileOpen && <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} className="mobile-sidebar-backdrop fixed inset-0 z-40 bg-[rgba(16,30,43,.48)] backdrop-blur-[2px] lg:hidden" />}

      <aside id="primary-sidebar" aria-label="Main navigation" role={mobileOpen ? "dialog" : undefined} aria-modal={mobileOpen || undefined}
        className={`app-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(84vw,290px)] flex-col border-r border-[#e4eaf5] bg-white px-4 pb-4 pt-5 shadow-[8px_0_32px_rgba(22,38,76,.08)] transition-all duration-200 ease-out lg:translate-x-0 lg:shadow-none ${sidebarCollapsed ? "lg:w-[88px] lg:px-3" : "lg:w-[272px] lg:px-5"} ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className={`flex items-center gap-3 px-1 ${sidebarCollapsed ? "lg:justify-center" : ""}`}>
          <BecLogo size={48} className="rounded-xl" />
          <div className={`min-w-0 flex-1 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
            <p className="truncate text-lg font-extrabold leading-tight" style={{ fontFamily: "var(--font-head)" }}>Bethesda English Course</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[.12em] text-[var(--mint)]">Sidoarjo</p>
          </div>
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="grid size-9 place-items-center rounded-xl text-[var(--ink)] hover:bg-[var(--paper)] lg:hidden"><X size={19} /></button>
        </div>

        <div className={`mt-8 px-2 text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-400 ${sidebarCollapsed ? "lg:text-center" : ""}`}>{sidebarCollapsed ? <span className="hidden lg:inline">Menu</span> : "Main menu"}</div>
        <nav aria-label="Main menu" className={`mt-2 flex-1 space-y-1 overflow-y-auto pr-1 ${sidebarCollapsed ? "lg:pr-0" : ""}`}>
          {visibleNav.map(([href, title, , Icon]) => {
            const active = href === path || (href !== "/" && path.startsWith(`${href}/`));
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} onClick={() => setMobileOpen(false)}
              title={sidebarCollapsed ? title : undefined}
              className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition-colors ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""} ${active ? "bg-[#eaf0ff] text-[#315ca6]" : "text-slate-600 hover:bg-[#f2f6fb] hover:text-[var(--ink)]"}`}>
              <Icon size={18} strokeWidth={active ? 2.4 : 2} className={active ? "text-[#3169c5]" : "text-slate-400 group-hover:text-[#3975db]"} />
              <span className={`truncate ${sidebarCollapsed ? "lg:hidden" : ""}`}>{title}</span>
              {active && <span className={`ml-auto size-1.5 rounded-full bg-[#3975db] ${sidebarCollapsed ? "lg:hidden" : ""}`} aria-hidden="true" />}
            </Link>;
          })}
        </nav>
      </aside>

      <div className="min-h-screen">
        <header className="app-topbar sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b border-[#e7ecf5] bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu" aria-expanded={mobileOpen} aria-controls="primary-sidebar" className="grid size-10 place-items-center rounded-xl border border-[#dce5f7] text-[#315ca6] hover:bg-[#f4f7fc] lg:hidden"><Menu size={19} /></button>
          <button type="button" onClick={() => setSidebarCollapsed((current) => !current)} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!sidebarCollapsed} className="hidden size-10 place-items-center rounded-xl border border-[#dce5f7] text-[#315ca6] hover:bg-[#f4f7fc] lg:grid"><Menu size={19} /></button>
          <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
            <BecLogo size={34} className="rounded-lg" />
            <span className="truncate text-sm font-extrabold text-[#1b3567]" style={{ fontFamily: "var(--font-head)" }}>Bethesda English Course</span>
          </div>
          <div className="ml-auto" ref={accountMenuRef}>
            <button type="button" onClick={() => setAccountMenuOpen((current) => !current)} aria-label="Open account menu" aria-expanded={accountMenuOpen} aria-haspopup="menu" className="flex max-w-[min(65vw,280px)] items-center gap-2 rounded-full border border-[#e2e9f6] bg-white py-1.5 pl-1.5 pr-2.5 shadow-sm transition hover:bg-[#f8faff]">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#ffe78d] text-xs font-extrabold text-[#24385d]">{initials || <UserRound size={16} />}</span>
              <span className="hidden min-w-0 text-left sm:block"><span className="block truncate text-xs font-bold text-[#24385d]">{s?.name}</span><span className="block truncate text-[10px] text-[#7182a3]">{roleLabel}</span></span>
              <ChevronDown size={15} className="text-[#7182a3]" />
            </button>
            {accountMenuOpen && <div role="menu" className="absolute right-4 top-[60px] z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-[#e2e9f6] bg-white p-2 shadow-[0_16px_40px_rgba(32,58,112,.18)] sm:right-6 lg:right-8">
              <div className="border-b border-[#edf0f7] px-3 py-2"><p className="truncate text-sm font-extrabold text-[#24385d]">{s?.name}</p><p className="mt-0.5 truncate text-xs text-[#7182a3]">{roleLabel}</p></div>
              <Link href="/akun" role="menuitem" onClick={() => setAccountMenuOpen(false)} className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#405577] hover:bg-[#f3f6fc]"><KeyRound size={16} className="text-[#5375b7]" />Account settings</Link>
              <button type="button" role="menuitem" onClick={() => logout()} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#b8493d] hover:bg-[#fff3f1]"><LogOut size={16} />Sign out</button>
            </div>}
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] px-4 pb-12 pt-5 sm:px-6 lg:px-8 lg:pt-7">{children}</main>
      </div>
    </div>
  );
}
