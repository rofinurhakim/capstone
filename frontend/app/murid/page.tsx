"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AcademicYear, academicYearLabel, api, BEC_LEVELS, CURRENT_TERM, Row } from "@/lib/api";
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
    await api<{ id?: number }>(`/students/${r.student_id}`, {}, { method: "PATCH", body: JSON.stringify({ name: r.name, level: r.level, school_name: r.school_name, school_class: r.school_class, term }) }, "Student details saved.");
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
  const c = "rounded-lg border border-[var(--line)] bg-white px-2 py-1.5";
  return (
    <>
      <h1 className="mt-8 text-3xl font-extrabold">Student records</h1>
      <label className="mt-4 block text-sm font-semibold">Academic period<select value={term} onChange={(e) => setTerm(e.target.value)} className={`${c} ml-2`}>{terms.map((year) => <option key={year} value={year}>{academicYearLabel(year, academicYears)}</option>)}</select></label>
      <ul className="mt-6 space-y-3">
        {rows.length === 0 && <li className="opacity-70">No students found for {academicYearLabel(term, academicYears)}.</li>}
        {rows.map((r) => (
          <li key={r.id} className="rounded-2xl border border-[var(--line)] bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <input aria-label="Name" value={r.name} onChange={(e) => edit(r.id, "name", e.target.value)} className={`${c} w-56`} />
              <select aria-label="Level" required value={BEC_LEVELS.includes(r.level) ? r.level : ""} onChange={(e) => edit(r.id, "level", e.target.value)} className={c}><option value="" disabled>Select level for academic review</option>{BEC_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}</select>
              <input aria-label="School name" value={r.school_name ?? ""} onChange={(e) => edit(r.id, "school_name", e.target.value)} placeholder="School name" className={`${c} w-40`} />
              <input aria-label="School class" value={r.school_class ?? ""} onChange={(e) => edit(r.id, "school_class", e.target.value)} placeholder="1SD, 1SMP" className={`${c} w-28`} />
              <Link href={`/murid/${r.id}?term=${encodeURIComponent(term)}`} className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-semibold">Details</Link>
              <button onClick={() => save(r)} disabled={!BEC_LEVELS.includes(r.level)} className="rounded-lg bg-[var(--ink)] px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">Save</button>
              <button onClick={() => setDialog({ type: "reset", row: r })} className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-semibold hover:bg-[var(--line)]">Reset guardian password</button>
              <button onClick={() => setDialog({ type: "remove", row: r })} className="rounded-lg border border-[var(--coral)] px-3 py-1.5 text-sm font-semibold text-[var(--coral)] hover:bg-[var(--line)]">Delete</button>
            </div>
            {temporaryPasswords[r.id] && <p role="status" className="mt-2 text-sm font-semibold text-[var(--mint)]">{temporaryPasswords[r.id]}</p>}
          </li>
        ))}
      </ul>
      <ConfirmModal open={dialog !== null} title={dialog?.type === "reset" ? "Reset guardian password?" : "Delete student?"} message={dialog?.type === "reset" ? `Create a new password for ${dialog.row.name}'s guardian? The current password will stop working.` : `Delete ${dialog?.row.name} and all associated grades? This cannot be undone.`} confirmLabel={dialog?.type === "reset" ? "Reset password" : "Delete student"} tone={dialog?.type === "reset" ? "primary" : "danger"} onClose={() => setDialog(null)} onConfirm={confirmDialog} />
    </>
  );
}
