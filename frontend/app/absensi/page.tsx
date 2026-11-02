"use client";

import { useEffect, useState } from "react";
import { AcademicYear, academicYearLabel, api, BASE, CURRENT_TERM, hasRole, notify, session } from "@/lib/api";

type AttendanceRow = { id: number; name: string; class: string; status: "present" | "excused" | "sick" | "absent"; note?: string; published_at?: string | null };
type ReportRow = { id: number; name: string; class: string; present: number; excused: number; sick: number; absent: number; total: number };
const labels = { present: "Present", excused: "Excused", sick: "Sick", absent: "Absent" };

export default function Absensi() {
  const [term, setTerm] = useState(CURRENT_TERM);
  const [terms, setTerms] = useState<string[]>([CURRENT_TERM]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<ReportRow[]>([]);
  const canEdit = hasRole("teacher");
  useEffect(() => {
    api<AcademicYear[]>("/academic-years", []).then((items) => {
      setAcademicYears(items);
      const years = items.map((item) => item.term);
      setTerms(years.length ? years : [CURRENT_TERM]);
      if (years[0]) setTerm(years[0]);
    });
  }, []);
  useEffect(() => { api<AttendanceRow[]>(`/attendance?term=${encodeURIComponent(term)}&date=${date}`, []).then(setRows); }, [term, date]);
  const update = (id: number, key: "status" | "note", value: string) => setRows((items) => items.map((row) => row.id === id ? { ...row, [key]: value } as AttendanceRow : row));
  async function save() {
    const editableRows = rows.filter((row) => !row.published_at);
    if (editableRows.length === 0) return;
    await api<{ ok?: boolean }>("/attendance", {}, {
      method: "POST",
      body: JSON.stringify({ date, rows: editableRows }),
    }, "Attendance saved successfully.");
  }
  async function loadReport() { setReport(await api<ReportRow[]>(`/attendance/report?term=${encodeURIComponent(term)}&from=${from}&to=${to}`, [], undefined, "Attendance summary loaded.")); }
  function exportReport() { const token = session()?.token ?? ""; const url = `${BASE}/attendance/export?term=${encodeURIComponent(term)}&from=${from}&to=${to}`; fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "text/csv" } }).then((response) => response.blob()).then((blob) => { const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `rekap-absensi-${term}.csv`; link.click(); }); }
  const input = "rounded-lg border border-[var(--line)] bg-white px-3 py-2";
  return <>
    <h1 className="mt-8 text-3xl font-extrabold">Class attendance</h1>
    <p className="mt-2 opacity-70">Record attendance for each session. Attendance is included in report cards.</p>
    <div className="mt-5 flex flex-wrap gap-3"><label className="text-sm font-semibold">Academic period<select value={term} onChange={(e) => setTerm(e.target.value)} className={`${input} ml-2`}>{terms.map((item) => <option key={item} value={item}>{academicYearLabel(item, academicYears)}</option>)}</select></label><label className="text-sm font-semibold">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${input} ml-2`} /></label></div>
    <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--line)] bg-white"><table className="w-full min-w-[680px] text-left"><thead><tr className="border-b border-[var(--line)] text-sm"><th className="p-3">Student</th><th className="p-3">Class</th><th className="p-3">Status</th><th className="p-3">Notes</th></tr></thead><tbody>{rows.map((row) => { const locked = Boolean(row.published_at); return <tr key={row.id} className="border-b border-[var(--line)] last:border-0"><td className="p-3 font-semibold">{row.name}{locked && <span className="mt-1 block text-xs font-normal text-[var(--coral)]">Report published — attendance locked</span>}</td><td className="p-3 text-sm opacity-70">{row.class}</td><td className="p-3"><select value={row.status} disabled={!canEdit || locked} onChange={(e) => update(row.id, "status", e.target.value)} className={input}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td className="p-3"><input value={row.note ?? ""} disabled={!canEdit || locked} onChange={(e) => update(row.id, "note", e.target.value)} className={`${input} w-full`} placeholder="Optional" /></td></tr>; })}</tbody></table></div>
    {canEdit && <button onClick={save} disabled={!rows.some((row) => !row.published_at)} className="mt-5 rounded-xl bg-[var(--ink)] px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Save attendance</button>}
    <section className="mt-12 border-t border-[var(--line)] pt-8"><h2 className="text-2xl font-extrabold">Attendance summary</h2><p className="mt-1 text-sm opacity-70">View each student&apos;s attendance totals within a date range.</p><div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-sm font-semibold">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${input} mt-1 block`} /></label><label className="text-sm font-semibold">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${input} mt-1 block`} /></label><button onClick={loadReport} className="rounded-xl bg-[var(--ink)] px-4 py-2 font-semibold text-white">Load summary</button><button onClick={() => { notify("Preparing the attendance CSV export."); exportReport(); }} className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 font-semibold">Export CSV</button></div><div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--line)] bg-white"><table className="w-full min-w-[700px] text-left"><thead><tr className="border-b border-[var(--line)] text-sm"><th className="p-3">Student</th><th className="p-3">Class</th><th className="p-3">Present</th><th className="p-3">Excused</th><th className="p-3">Sick</th><th className="p-3">Absent</th><th className="p-3">Total</th></tr></thead><tbody>{report.map((row) => <tr key={row.id} className="border-b border-[var(--line)] last:border-0"><td className="p-3 font-semibold">{row.name}</td><td className="p-3 text-sm opacity-70">{row.class}</td><td className="p-3">{row.present}</td><td className="p-3">{row.excused}</td><td className="p-3">{row.sick}</td><td className="p-3">{row.absent}</td><td className="p-3 font-bold">{row.total}</td></tr>)}</tbody></table></div></section>
  </>;
}
