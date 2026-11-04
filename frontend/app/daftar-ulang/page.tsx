"use client";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, CalendarDays, CheckCircle2, ChevronRight, CircleAlert, ClipboardList, GraduationCap, UserRound, UsersRound, XCircle } from "lucide-react";
import { AcademicYear, academicYearLabel, api, BEC_LEVELS, CURRENT_TERM, hasRole, Row } from "@/lib/api";
import { InputModal } from "@/components/AppModal";

const label: Record<string, string> = { confirmed: "Confirmed", pending: "Pending", not_confirmed: "Not confirmed", left: "Not continuing" };
const y = new Date().getFullYear();
function nextTerm(term: string): string {
  return /^\d{4}$/.test(term) ? String(Number(term) + 1) : String(y + 1);
}

export default function DaftarUlang() {
  const isParent = hasRole("parent");
  const canManage = hasRole("admin") || hasRole("academic_admin");
  const [from, setFrom] = useState(CURRENT_TERM), [to, setTo] = useState(nextTerm(CURRENT_TERM));
  const [terms, setTerms] = useState<string[]>([CURRENT_TERM]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [placementDone, setPlacementDone] = useState<Record<number, boolean>>({});
  const [levels, setLevels] = useState<Record<number, string>>({});
  const [note, setNote] = useState("");
  const [leftTarget, setLeftTarget] = useState<number | null>(null);
  const load = useCallback(() => { api<Row[]>(`/roster?term=${encodeURIComponent(to)}${isParent ? "&include_pending=1" : ""}`, []).then(setRows); }, [isParent, to]);
  useEffect(() => {
    void (async () => {
      const periods = await api<AcademicYear[]>("/academic-years", []);
      setAcademicYears(periods);
      const items = periods.map((period) => period.term);
      const sorted = [...new Set(items)].filter((item) => /^\d{4}$/.test(item)).sort((a, b) => b.localeCompare(a));
      const rosters = await Promise.all(sorted.map((year) => api<Row[]>(`/roster?term=${encodeURIComponent(year)}`, [])));
      const source = sorted.find((_, index) => rosters[index]?.some((row) => row.status === "confirmed")) ?? sorted[0] ?? CURRENT_TERM;
      const target = nextTerm(source);
      setTerms([...new Set([...sorted, target])]);
      setFrom(source);
      setTo(target);
    })();
  }, []);
  useEffect(load, [load]);

  async function propose() {
    const r = await api<{ created?: number; held?: number; graduated?: number }>("/enrollments/propose", {}, { method: "POST", body: JSON.stringify({ from, to }) }, "Enrollment proposals submitted.");
    if (r.created !== undefined) {
      const outcomes = [`${r.created} student(s) submitted for academic year ${to}`];
      if (r.held) outcomes.push(`${r.held} held because grades are incomplete`);
      if (r.graduated) outcomes.push(`${r.graduated} student(s) graduated from ECSC`);
      setNote(`${outcomes.join(". ")}.`);
      load();
    }
  }
  async function setStatus(id: number, status: string, reason = "") {
    if (status === "left" && !reason) { setLeftTarget(id); return; }
    const row = rows.find((item) => item.id === id);
    if (!row) return;
    const result = await api<{ status?: string }>(`/enrollments/${id}`, {}, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        status_note: reason,
        placement_test_completed: row.requires_placement_test ? Boolean(placementDone[id]) : undefined,
        level: row.requires_placement_test ? levels[id] || undefined : undefined,
      }),
    }, "Enrollment status updated.");
    if (result.status) {
      load();
    }
  }
  async function saveLeftReason(value: string) { if (leftTarget === null) return; await setStatus(leftTarget, "left", value); setLeftTarget(null); }
  const c = "rounded-xl border border-[#dce5f7] bg-white px-3 py-2.5 text-sm font-semibold text-[#263d68] outline-none focus:border-[#7599e6] focus:ring-2 focus:ring-[#e5edff]";
  const pendingCount = rows.filter((row) => row.status === "pending").length;
  const confirmedCount = rows.filter((row) => row.status === "confirmed").length;
  const statusStyles: Record<string, string> = {
    confirmed: "border-[#b8dfd0] bg-[#e7f7ed] text-[#24784a]",
    pending: "border-[#f2e4ad] bg-[#fff7db] text-[#93700a]",
    not_confirmed: "border-[#ffd8d2] bg-[#fff0ed] text-[#b8493d]",
    left: "border-[#e0e5ef] bg-[#f3f5f9] text-[#66748f]",
  };
  const actionButton = "inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-45";
  return (
    <>
      <section className="relative mt-3 overflow-hidden rounded-[1.75rem] border border-[#dbe5ff] bg-gradient-to-br from-[#eef3ff] via-white to-[#e6efff] p-5 shadow-[0_16px_38px_rgba(50,87,166,.1)] sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full bg-[#dbe7ff]/70 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#4d83e5] to-[#3162c3] text-white shadow-md shadow-blue-900/15"><UsersRound size={26} /></span>
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#dce6ff] bg-white/80 px-3 py-1 text-xs font-bold text-[#416199]"><GraduationCap size={14} /><span>Academic</span><ChevronRight size={13} /><span>Enrollment</span></div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#172d59] sm:text-4xl">Enrollment</h1>
            <p className="mt-1 text-sm text-[#52678f]">Manage returning students&apos; enrollment for the next academic period.</p>
          </div>
        </div>
      </section>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[190px] flex-1 text-[11px] font-bold uppercase tracking-wide text-[#7182a3] sm:flex-none">From academic period
          <span className="relative mt-1 block"><CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6483be]" /><select aria-label="From academic period" value={from} onChange={(e) => setFrom(e.target.value)} className={`${c} w-full pl-9 sm:w-[205px]`}>{terms.map((item) => <option key={item} value={item}>{academicYearLabel(item, academicYears)}</option>)}</select></span>
        </label>
        <label className="min-w-[190px] flex-1 text-[11px] font-bold uppercase tracking-wide text-[#7182a3] sm:flex-none">To academic period
          <span className="relative mt-1 block"><CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6483be]" /><select aria-label="To academic period" value={to} onChange={(e) => setTo(e.target.value)} className={`${c} w-full pl-9 sm:w-[205px]`}>{terms.map((item) => <option key={item} value={item}>{academicYearLabel(item, academicYears)}</option>)}</select></span>
        </label>
        {canManage && <button onClick={propose} className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#315ca6] to-[#24457f] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-900/15 transition hover:-translate-y-0.5 hover:shadow-lg"><UserRound size={17} />Propose returning students</button>}
      </div>
      {note && <p role="status" className="mt-3 flex items-center gap-2 rounded-xl border border-[#b8dfd0] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#24784a]"><CheckCircle2 size={17} />{note}</p>}

      <section className="mt-5 overflow-hidden rounded-[1.5rem] border border-[#dce5f7] bg-white shadow-[0_12px_30px_rgba(32,58,112,.08)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#e5ebf8] px-4 py-3 sm:px-5">
          <span className="grid size-10 place-items-center rounded-xl bg-[#eee8ff] text-[#7150bd]"><ClipboardList size={20} /></span>
          <div className="mr-auto"><h2 className="font-extrabold text-[#1b3567]">Student enrollment</h2><p className="text-xs text-slate-500">Review each student&apos;s status for {academicYearLabel(to, academicYears)}.</p></div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff7db] px-3 py-1.5 text-xs font-bold text-[#93700a]"><CircleAlert size={14} />{pendingCount} pending</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f7ed] px-3 py-1.5 text-xs font-bold text-[#24784a]"><CheckCircle2 size={14} />{confirmedCount} confirmed</span>
        </div>
        <div className="overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-[minmax(230px,1fr)_minmax(130px,.7fr)_auto] items-center gap-3 bg-[#f0f4ff] px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-wide text-[#52678f] sm:px-5">
            <span>Student</span><span>Status</span><span className="text-right">Actions</span>
          </div>
          <ul className="min-w-[760px] divide-y divide-[#e8edf7] px-3 sm:px-4">
            {rows.length === 0 && <li className="px-3 py-12 text-center"><UsersRound size={28} className="mx-auto text-[#9badcf]" /><p className="mt-2 font-bold text-[#3d527c]">No enrollment requests</p><p className="mt-1 text-sm text-slate-500">There are no enrollment requests for academic year {academicYearLabel(to, academicYears)}.</p></li>}
            {rows.map((r, index) => (
              <motion.li layout key={r.id} className={`grid grid-cols-[minmax(230px,1fr)_minmax(130px,.7fr)_auto] items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-[#f8faff] ${index % 2 ? "bg-[#fcfdff]" : "bg-white"}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f0eaff] text-[#7954bd]"><BarChart3 size={18} /></span>
                  <div className="min-w-0"><div className="truncate text-sm font-extrabold text-[#24385d]">{r.name}</div><div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] font-medium text-[#7182a3]"><span>{r.level}</span><span aria-hidden="true">·</span><span>{r.class}</span></div>
                    {r.status_note && <div className="mt-1 text-xs text-[#66748f]">Note: {r.status_note}</div>}
                    {canManage && r.status === "pending" && r.requires_placement_test && <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce5f7] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#52678f]"><input type="checkbox" checked={placementDone[r.id] ?? Boolean(r.placement_test_completed_at)} onChange={(event) => setPlacementDone((items) => ({ ...items, [r.id]: event.target.checked }))} />Placement test completed</label>
                      <select aria-label={`Level for ${r.name}`} required value={levels[r.id] ?? ""} onChange={(event) => setLevels((items) => ({ ...items, [r.id]: event.target.value }))} className={`${c} py-1.5`}><option value="">Select level</option>{BEC_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}</select>
                    </div>}
                  </div>
                </div>
                <div><span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold ${statusStyles[r.status] ?? statusStyles.pending}`}>{r.status === "confirmed" ? <CheckCircle2 size={13} /> : r.status === "pending" ? <CircleAlert size={13} /> : <XCircle size={13} />}{label[r.status] ?? r.status}</span></div>
                <div className="flex flex-wrap justify-end gap-2">
                  {canManage && r.status === "pending" && <button onClick={() => void setStatus(r.id, "confirmed")} disabled={r.requires_placement_test && (!(placementDone[r.id] ?? Boolean(r.placement_test_completed_at)) || !levels[r.id])} className={`${actionButton} border-[#cbdaf7] bg-white text-[#315ca6] shadow-sm hover:bg-[#f4f7ff]`}><CheckCircle2 size={14} />Confirm enrollment</button>}
                  {isParent && r.status === "pending" && <button onClick={() => void setStatus(r.id, "left")} className={`${actionButton} border-[#dce5f7] bg-white text-[#52678f] hover:bg-[#f6f8fc]`}>Not continuing</button>}
                  {canManage && r.status === "pending" && <button onClick={() => void setStatus(r.id, "not_confirmed")} className={`${actionButton} border-[#ffc9c1] bg-white text-[#b8493d] hover:bg-[#fff3f1]`}><XCircle size={14} />Not confirmed</button>}
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>
      <InputModal open={leftTarget !== null} title="Not continuing" message="Record a reason to keep the re-enrollment history clear." label="Reason (optional)" confirmLabel="Save status" onClose={() => setLeftTarget(null)} onConfirm={saveLeftReason} />
    </>
  );
}
