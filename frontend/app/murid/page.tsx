"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, GraduationCap, School, ShieldCheck, Trash2, UsersRound } from "lucide-react";
import { AcademicYear, academicYearLabel, api, BEC_LEVELS, CURRENT_TERM, Row, STUDENT_SECTORS } from "@/lib/api";
import { ConfirmModal } from "@/components/AppModal";

export default function DataMurid() {
  const [term, setTerm] = useState(CURRENT_TERM);
  const [terms, setTerms] = useState<string[]>([CURRENT_TERM]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [temporaryPasswords, setTemporaryPasswords] = useState<Record<number, string>>({});
  const [dialog, setDialog] = useState<{ type: "reset" | "remove"; row: Row } | null>(null);
  const load = useCallback(() => { api<Row[]>(`/roster?term=${encodeURIComponent(term)}`, []).then(setRows); }, [term]);
  useEffect(load, [load]);
  useEffect(() => {
    void api<AcademicYear[]>("/academic-years", []).then((items) => {
      setAcademicYears(items);
      const years = items.map((item) => item.term);
      setTerms(years.length ? years : [CURRENT_TERM]);
      setTerm((current) => years.includes(current) ? current : years[0] ?? CURRENT_TERM);
    });
  }, []);

  const edit = (id: number, k: keyof Row, v: string | number) => setRows((r) => r.map((x) => (x.id === id ? { ...x, [k]: v } : x)));
  async function save(r: Row) {
    await api<{ id?: number }>(`/students/${r.student_id}`, {}, { method: "PATCH", body: JSON.stringify({ name: r.name, level: r.level, school_name: r.school_name, school_class: r.school_class, sector: r.sector, term }) }, "Student details saved.");
  }
  async function reset(r: Row) {
    const res = await api<{ password?: string }>(`/students/${r.student_id}/reset-guardian`, {}, { method: "POST" }, "Guardian password reset successfully.");
    if (res.password) setTemporaryPasswords((items) => ({ ...items, [r.id]: `Temporary guardian password: ${res.password} (copy it now).` }));
  }
  async function remove(r: Row) {
    const res = await api<{ ok?: boolean }>(`/students/${r.student_id}`, {}, { method: "DELETE" }, "Student deleted successfully.");
    if (res.ok) setRows((x) => x.filter((y) => y.id !== r.id));
  }
  async function confirmDialog() { if (!dialog) return; const action = dialog.type === "reset" ? reset(dialog.row) : remove(dialog.row); setDialog(null); await action; }
  const c = "w-full rounded-xl border border-[#dce5f7] bg-white px-3 py-2.5 text-xs font-medium text-[#263d68] outline-none transition focus:border-[#7599e6] focus:ring-2 focus:ring-[#e5edff]";
  const fieldLabel = "block min-w-0 text-[10px] font-bold text-[#7182a3]";
  return (
    <>
      <section className="relative mt-3 overflow-hidden rounded-[1.75rem] border border-[#dbe5ff] bg-gradient-to-br from-[#eef3ff] via-white to-[#e6efff] p-5 shadow-[0_16px_38px_rgba(50,87,166,.1)] sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full bg-[#dbe7ff]/70 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#4d83e5] to-[#3162c3] text-white shadow-md shadow-blue-900/15"><UsersRound size={27} /></span>
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#dce6ff] bg-white/80 px-3 py-1 text-xs font-bold text-[#416199]"><GraduationCap size={14} /><span>Academic</span><ChevronRight size={13} /><span>Student records</span></div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#172d59] sm:text-4xl">Student records</h1>
            <p className="mt-1 text-sm text-[#52678f]">View, manage, and update student information.</p>
          </div>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-[1.5rem] border border-[#dce5f7] bg-white p-3 shadow-[0_12px_30px_rgba(32,58,112,.08)] sm:p-5">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#e8edf7] px-1 pb-3">
          <label className="flex flex-wrap items-center gap-3 text-xs font-extrabold text-[#263d68]">Academic period
            <select aria-label="Academic period" value={term} onChange={(e) => setTerm(e.target.value)} className="min-w-[220px] rounded-xl border border-[#dce5f7] bg-white px-3 py-2.5 text-xs font-bold text-[#315ca6] outline-none focus:border-[#7599e6]">{terms.map((year) => <option key={year} value={year}>{academicYearLabel(year, academicYears)}</option>)}</select>
          </label>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#edf3ff] px-3 py-1.5 text-[11px] font-bold text-[#315ca6]"><UsersRound size={14} />{rows.length} {rows.length === 1 ? "student" : "students"}</span>
        </div>

        <ul className="mt-3 space-y-2">
          {rows.length === 0 && <li className="rounded-2xl bg-[#f8faff] px-4 py-10 text-center"><UsersRound size={28} className="mx-auto text-[#9badcf]" /><p className="mt-2 text-sm font-bold text-[#3d527c]">No students found</p><p className="mt-1 text-xs text-[#7182a3]">No student records for {academicYearLabel(term, academicYears)}.</p></li>}
          {rows.map((r, index) => (
            <li key={r.id} className={`rounded-2xl border border-[#e3eaf7] p-3 transition hover:border-[#cbdaf7] hover:bg-[#fbfcff] sm:p-3.5 ${index % 2 ? "bg-[#fcfdff]" : "bg-white"}`}>
              <div className="grid items-center gap-3 xl:grid-cols-[minmax(145px,1.1fr)_repeat(4,minmax(110px,1fr))_auto]">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f0eaff] text-sm font-extrabold text-[#7954bd]">{r.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-extrabold text-[#24385d]">{r.name}</span><span className="mt-0.5 block truncate text-[10px] font-medium text-[#7182a3]">{r.nis ? `ID ${r.nis}` : r.class}</span></span>
                </div>
                <label className={fieldLabel}>Level<select aria-label={`Level for ${r.name}`} required value={BEC_LEVELS.includes(r.level) ? r.level : ""} onChange={(e) => edit(r.id, "level", e.target.value)} className={`${c} mt-1`}><option value="" disabled>Select level for academic review</option>{BEC_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}</select></label>
                <label className={fieldLabel}>School name<span className="relative mt-1 block"><School size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#91a0ba]" /><input aria-label={`School name for ${r.name}`} value={r.school_name ?? ""} onChange={(e) => edit(r.id, "school_name", e.target.value)} placeholder="School name" className={`${c} pl-8`} /></span></label>
                <label className={fieldLabel}>School class<input aria-label={`School class for ${r.name}`} value={r.school_class ?? ""} onChange={(e) => edit(r.id, "school_class", e.target.value)} placeholder="1SD, 1SMP" className={`${c} mt-1`} /></label>
                <label className={fieldLabel}>Sector<select aria-label={`Sector for ${r.name}`} value={r.sector ?? ""} onChange={(e) => edit(r.id, "sector", e.target.value)} className={`${c} mt-1`}><option value="">Select sector</option>{STUDENT_SECTORS.map((sector) => <option key={sector} value={sector}>{sector}</option>)}</select></label>
                <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                  <Link href={`/murid/${r.id}?term=${encodeURIComponent(term)}`} className="inline-flex items-center gap-1.5 rounded-xl border border-[#cbdaf7] bg-white px-3 py-2 text-xs font-bold text-[#315ca6] hover:bg-[#f4f7ff]"><BookOpen size={14} />Details</Link>
                  <button onClick={() => void save(r)} disabled={!BEC_LEVELS.includes(r.level)} className="rounded-xl bg-gradient-to-r from-[#172d68] to-[#264b9a] px-3.5 py-2 text-xs font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-45">Save</button>
                  <button onClick={() => setDialog({ type: "reset", row: r })} className="inline-flex items-center gap-1.5 rounded-xl border border-[#cbdaf7] bg-white px-3 py-2 text-xs font-bold text-[#315ca6] hover:bg-[#f4f7ff]"><ShieldCheck size={14} /><span className="hidden 2xl:inline">Reset guardian password</span><span className="2xl:hidden">Reset password</span></button>
                  <button onClick={() => setDialog({ type: "remove", row: r })} aria-label={`Delete ${r.name}`} className="inline-flex items-center gap-1.5 rounded-xl border border-[#ffc9c1] bg-white px-3 py-2 text-xs font-bold text-[#b8493d] hover:bg-[#fff3f1]"><Trash2 size={14} /><span>Delete</span></button>
                </div>
              </div>
              {temporaryPasswords[r.id] && <p role="status" className="mt-3 rounded-xl border border-[#b8dfd0] bg-[#effaf4] px-3 py-2 text-xs font-semibold text-[#24784a]">{temporaryPasswords[r.id]}</p>}
            </li>
          ))}
        </ul>
      </section>
      <ConfirmModal open={dialog !== null} title={dialog?.type === "reset" ? "Reset guardian password?" : "Delete student?"} message={dialog?.type === "reset" ? `Create a new password for ${dialog.row.name}'s guardian? The current password will stop working.` : `Delete ${dialog?.row.name} and all associated grades? This cannot be undone.`} confirmLabel={dialog?.type === "reset" ? "Reset password" : "Delete student"} tone={dialog?.type === "reset" ? "primary" : "danger"} onClose={() => setDialog(null)} onConfirm={confirmDialog} />
    </>
  );
}
