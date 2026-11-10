"use client";

import { useEffect, useState } from "react";
import { BarChart3, CalendarCheck, CalendarDays, ChevronRight, Download, Info, MessageCircle, RefreshCw, Save, UsersRound, Zap } from "lucide-react";
import { AcademicYear, academicYearLabel, api, BASE, CURRENT_TERM, hasRole, notify, session } from "@/lib/api";

type AttendanceRow = { id: number; name: string; class: string; status: "present" | "excused" | "sick" | "absent"; note?: string; published_at?: string | null };
type ReportRow = { id: number; name: string; class: string; present: number; excused: number; sick: number; absent: number; total: number };
const labels = { present: "Present", excused: "Excused", sick: "Sick", absent: "Absent" };
const statusStyles = {
  present: "border-[#ccebd9] bg-[#e7f7ed] text-[#24784a]",
  excused: "border-[#f2e4ad] bg-[#fff7db] text-[#93700a]",
  sick: "border-[#d5e4ff] bg-[#edf4ff] text-[#416bb4]",
  absent: "border-[#ffd8d2] bg-[#fff0ed] text-[#b8493d]",
};

export default function Absensi() {
  const [term, setTerm] = useState(CURRENT_TERM);
  const [terms, setTerms] = useState<string[]>([CURRENT_TERM]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<ReportRow[]>([]);
  const [saving, setSaving] = useState(false);
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
    if (editableRows.length === 0 || saving) return;
    setSaving(true);
    try {
      await api<{ ok?: boolean }>("/attendance", {}, {
        method: "POST",
        body: JSON.stringify({ date, rows: editableRows }),
      }, "Attendance saved successfully.");
    } finally {
      setSaving(false);
    }
  }
  async function loadReport() { setReport(await api<ReportRow[]>(`/attendance/report?term=${encodeURIComponent(term)}&from=${from}&to=${to}`, [], undefined, "Attendance summary loaded.")); }
  function exportReport() { const token = session()?.token ?? ""; const url = `${BASE}/attendance/export?term=${encodeURIComponent(term)}&from=${from}&to=${to}`; fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "text/csv" } }).then((response) => response.blob()).then((blob) => { const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `rekap-absensi-${term}.csv`; link.click(); }); }
  const markAllPresent = () => setRows((items) => items.map((row) => row.published_at ? row : { ...row, status: "present" }));
  const attendanceTotals = report.reduce((totals, row) => ({
    present: totals.present + row.present,
    excused: totals.excused + row.excused,
    sick: totals.sick + row.sick,
    absent: totals.absent + row.absent,
    total: totals.total + row.total,
  }), { present: 0, excused: 0, sick: 0, absent: 0, total: 0 });
  const input = "rounded-xl border border-[#dce5f7] bg-white px-3 py-2.5 text-sm font-semibold text-[#263d68] outline-none focus:border-[#7599e6] focus:ring-2 focus:ring-[#e5edff]";
  return <>
    <section className="relative mt-3 overflow-hidden rounded-[1.75rem] border border-[#dbe5ff] bg-gradient-to-br from-[#eef3ff] via-white to-[#e6efff] p-5 shadow-[0_16px_38px_rgba(50,87,166,.1)] sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full bg-[#dbe7ff]/70 blur-2xl" />
      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#4d83e5] to-[#3162c3] text-white shadow-md shadow-blue-900/15"><CalendarCheck size={27} /></span>
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#dce6ff] bg-white/80 px-3 py-1 text-xs font-bold text-[#416199]"><span>Academic</span><ChevronRight size={13} /><span>Attendance</span></div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#172d59] sm:text-4xl">Class attendance</h1>
            <p className="mt-1 max-w-xl text-sm text-[#52678f]">Record attendance for each session. Attendance is included in student report cards.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[520px]">
          <label className="flex items-center gap-3 rounded-2xl border border-[#dce6ff] bg-white/90 p-3 shadow-sm">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eff4ff] text-[#3864ad]"><CalendarDays size={19} /></span>
            <span className="min-w-0 flex-1"><span className="block text-[11px] font-bold uppercase tracking-wide text-[#7182a3]">Academic period</span><select aria-label="Academic period" value={term} onChange={(e) => setTerm(e.target.value)} className="mt-0.5 w-full truncate bg-transparent text-sm font-bold text-[#203967] outline-none">{terms.map((item) => <option key={item} value={item}>{academicYearLabel(item, academicYears)}</option>)}</select></span>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-[#dce6ff] bg-white/90 p-3 shadow-sm">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eff4ff] text-[#3864ad]"><CalendarDays size={19} /></span>
            <span className="min-w-0 flex-1"><span className="block text-[11px] font-bold uppercase tracking-wide text-[#7182a3]">Session date</span><input aria-label="Session date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-0.5 w-full bg-transparent text-sm font-bold text-[#203967] outline-none" /></span>
          </label>
        </div>
      </div>
    </section>

    <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-[#dce5f7] bg-white shadow-[0_12px_30px_rgba(32,58,112,.08)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#e5ebf8] px-4 py-3 sm:px-5">
        <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#315ca6] to-[#24457f] text-white shadow-sm"><UsersRound size={20} /></span>
        <div className="min-w-0 flex-1"><h2 className="font-extrabold text-[#1b3567]">Attendance Entry</h2><p className="text-xs text-slate-500">Choose attendance status and add an optional note for each student.</p></div>
        <span className="rounded-full bg-[#edf3ff] px-3 py-1 text-xs font-extrabold text-[#315ca6]">{rows.length} {rows.length === 1 ? "student" : "students"}</span>
        {canEdit && <button type="button" onClick={markAllPresent} disabled={!rows.some((row) => !row.published_at)} className="inline-flex items-center gap-1.5 rounded-full border border-[#dce6ff] bg-white px-3 py-1.5 text-xs font-bold text-[#315ca6] hover:bg-[#f4f7ff] disabled:opacity-45"><Zap size={14} />Mark all present</button>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-[#f0f4ff] text-[11px] font-extrabold uppercase tracking-wide text-[#43577f]"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Class</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Notes</th></tr></thead>
          <tbody>{rows.map((row, index) => {
            const locked = Boolean(row.published_at);
            return <tr key={row.id} className={`border-t border-[#e8edf7] transition-colors hover:bg-[#f8faff] ${index % 2 ? "bg-[#fcfdff]" : "bg-white"}`}>
              <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-[#fee2cc] to-[#f7b88e] text-xs font-extrabold text-[#754a34] shadow-sm">{row.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-sm font-extrabold text-[#24385d]">{row.name}</span>{locked && <span className="mt-0.5 block text-[10px] font-semibold text-[#b8493d]">Report published — attendance locked</span>}</span></div></td>
              <td className="px-4 py-3 text-sm font-medium text-[#687b9e]">{row.class}</td>
              <td className="px-4 py-3"><label className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${statusStyles[row.status]}`}><span className="size-2.5 rounded-full bg-current" /><select aria-label={`Attendance status for ${row.name}`} value={row.status} disabled={!canEdit || locked} onChange={(e) => update(row.id, "status", e.target.value)} className="cursor-pointer bg-transparent text-xs font-extrabold outline-none disabled:cursor-not-allowed">{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></td>
              <td className="px-4 py-3"><div className="flex min-w-[200px] items-center gap-2 rounded-xl border border-[#e0e8f7] bg-[#fbfcff] px-3"><MessageCircle size={15} className="shrink-0 text-[#76a0e8]" /><input aria-label={`Notes for ${row.name}`} value={row.note ?? ""} disabled={!canEdit || locked} onChange={(e) => update(row.id, "note", e.target.value)} className="min-w-0 flex-1 bg-transparent py-2.5 text-xs font-medium text-[#30446a] outline-none placeholder:text-slate-400 disabled:opacity-60" placeholder="Optional note" /></div></td>
            </tr>;
          })}
          {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center"><UsersRound size={28} className="mx-auto text-[#9badcf]" /><p className="mt-2 font-bold text-[#3d527c]">No students found for this date</p><p className="mt-1 text-sm text-slate-500">Select another academic period or session date.</p></td></tr>}
          </tbody>
        </table>
      </div>
      {canEdit && <div className="flex justify-end border-t border-[#e8edf7] bg-[#fbfcff] px-4 py-3 sm:px-5"><button onClick={save} disabled={saving || !rows.some((row) => !row.published_at)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#315ca6] to-[#24457f] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-900/15 transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-45"><Save size={16} />{saving ? "Saving..." : "Save attendance"}</button></div>}
    </section>

    <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-[#dce5f7] bg-white shadow-[0_12px_30px_rgba(32,58,112,.08)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#e5ebf8] px-4 py-4 sm:px-5">
        <span className="grid size-11 place-items-center rounded-xl bg-[#eee8ff] text-[#7150bd]"><BarChart3 size={22} /></span>
        <div className="mr-auto"><h2 className="font-extrabold text-[#1b3567]">Attendance summary</h2><p className="mt-0.5 text-xs text-slate-500">View each student&apos;s attendance totals within a date range.</p></div>
        <label className="text-[11px] font-bold uppercase tracking-wide text-[#7182a3]">From<input aria-label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${input} mt-1 block w-full normal-case tracking-normal`} /></label>
        <label className="text-[11px] font-bold uppercase tracking-wide text-[#7182a3]">To<input aria-label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${input} mt-1 block w-full normal-case tracking-normal`} /></label>
        <button onClick={loadReport} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#315ca6] to-[#24457f] px-4 py-2.5 text-sm font-bold text-white shadow-sm"><RefreshCw size={15} />Load summary</button>
        <button onClick={() => { notify("Preparing the attendance CSV export."); exportReport(); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dce5f7] bg-white px-4 py-2.5 text-sm font-bold text-[#315ca6] hover:bg-[#f4f7ff]"><Download size={15} />Export CSV</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left">
          <thead className="bg-[#f0f4ff] text-[11px] font-extrabold uppercase tracking-wide text-[#43577f]"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Class</th><th className="px-4 py-3 text-center">Present</th><th className="px-4 py-3 text-center">Excused</th><th className="px-4 py-3 text-center">Sick</th><th className="px-4 py-3 text-center">Absent</th><th className="px-4 py-3 text-center">Total</th></tr></thead>
          <tbody>{report.map((row, index) => <tr key={row.id} className={`border-t border-[#e8edf7] ${index % 2 ? "bg-[#fcfdff]" : "bg-white"}`}><td className="px-4 py-3 text-sm font-extrabold text-[#24385d]">{row.name}</td><td className="px-4 py-3 text-sm text-[#687b9e]">{row.class}</td><td className="px-4 py-3 text-center font-bold text-[#24784a]">{row.present}</td><td className="px-4 py-3 text-center font-bold text-[#93700a]">{row.excused}</td><td className="px-4 py-3 text-center font-bold text-[#416bb4]">{row.sick}</td><td className="px-4 py-3 text-center font-bold text-[#b8493d]">{row.absent}</td><td className="px-4 py-3 text-center font-extrabold text-[#24385d]">{row.total}</td></tr>)}
          {report.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">Choose a date range and load the summary.</td></tr>}
          </tbody>
        </table>
      </div>
      {report.length > 0 && <div className="mx-4 mb-4 mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-[#edf3ff] px-4 py-3 text-xs font-medium text-[#405981] sm:mx-5"><Info size={17} className="shrink-0 text-[#3975db]" /><span className="mr-auto">Totals for the selected date range: {attendanceTotals.total} recorded attendance entries.</span><span className="rounded-full bg-white px-3 py-1 font-bold text-[#24784a]">Present {attendanceTotals.present}</span><span className="rounded-full bg-white px-3 py-1 font-bold text-[#93700a]">Excused {attendanceTotals.excused}</span><span className="rounded-full bg-white px-3 py-1 font-bold text-[#416bb4]">Sick {attendanceTotals.sick}</span><span className="rounded-full bg-white px-3 py-1 font-bold text-[#b8493d]">Absent {attendanceTotals.absent}</span></div>}
    </section>
  </>;
}
