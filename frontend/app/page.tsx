"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Cloud, Flower2, Sparkles, Sun, TreePine, UsersRound } from "lucide-react";
import CountUp from "@/components/CountUp";
import { AcademicYear, academicYearLabel, api, BASE, notify, session, CURRENT_TERM } from "@/lib/api";

const zero = { students: 0, enrollments: 0, pending: 0, classes: 0, scoresFilled: 0, scoresTarget: 0, attendance: { present: 0, excused: 0, sick: 0, absent: 0 } };
export default function Home() {
  const [s, setS] = useState(zero);
  const [term, setTerm] = useState(CURRENT_TERM);
  const [terms, setTerms] = useState<string[]>([CURRENT_TERM]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  useEffect(() => {
    api<AcademicYear[]>("/academic-years", []).then((items) => {
      setAcademicYears(items);
      const availableTerms = items.map((item) => item.term);
      setTerms(availableTerms.length ? availableTerms : [CURRENT_TERM]);
      if (availableTerms[0]) setTerm(availableTerms[0]);
    });
  }, []);
  useEffect(() => { api(`/summary?term=${encodeURIComponent(term)}`, zero).then(setS); }, [term]);
  const pct = s.scoresTarget ? Math.round((s.scoresFilled / s.scoresTarget) * 100) : 0;
  function exportCsv() {
    const token = session()?.token ?? "";
    fetch(`${BASE}/export/roster?term=${encodeURIComponent(term)}`, { headers: { Accept: "text/csv", Authorization: `Bearer ${token}` } }).then((r) => r.blob()).then((blob) => { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `data-akademik-${term}.csv`; a.click(); URL.revokeObjectURL(url); });
  }
  return (
    <>
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="kid-hero mt-5 overflow-hidden rounded-[2rem] border border-[var(--line)] p-6 sm:p-9">
        <div className="relative z-10 max-w-2xl"><div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-sm font-bold text-[var(--mint)]"><Sparkles size={15} />A brighter learning experience</div><h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight sm:text-6xl">Reports without manual spreadsheets.</h1><p className="mt-4 max-w-xl text-lg opacity-80">Teacher grades, admin enrollment, and family reports—all in one place.</p></div>
        <div className="kid-scene" aria-hidden="true"><Sun className="kid-sun" size={58} /><Cloud className="kid-cloud cloud-one" size={54} /><Cloud className="kid-cloud cloud-two" size={38} /><TreePine className="kid-tree tree-one" size={112} /><TreePine className="kid-tree tree-two" size={82} /><Flower2 className="kid-flower flower-one" size={31} /><Flower2 className="kid-flower flower-two" size={23} /><div className="kid-friends"><div className="kid-person person-yellow"><UsersRound size={37} /></div><div className="kid-person person-coral"><BookOpen size={31} /></div></div></div>
      </motion.section>
      <div className="mt-6 flex flex-wrap items-end gap-3"><label className="text-sm font-semibold">Academic period<select value={term} onChange={(e) => setTerm(e.target.value)} className="ml-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2">{terms.map((item) => <option key={item} value={item}>{academicYearLabel(item, academicYears)}</option>)}</select></label><button onClick={() => { notify("Preparing the academic data CSV export."); exportCsv(); }} className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 font-semibold">Export CSV</button></div>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[["Active students", s.students], ["Active classes", s.classes], ["Enrollments awaiting confirmation", s.pending], ["Grades completed (%)", pct]].map(([l, n]) => (
          <div key={l as string} className="stat-card rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="text-5xl font-extrabold" style={{ fontFamily: "var(--font-head)" }}><CountUp to={n as number} /></div>
            <div className="mt-1 text-sm opacity-70">{l}</div>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-extrabold">Attendance summary</h2><span className="text-sm opacity-60">{academicYearLabel(term, academicYears)}</span></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Present", s.attendance.present, "var(--mint)"], ["Excused", s.attendance.excused, "var(--sun)"], ["Sick", s.attendance.sick, "#7da7e8"], ["Absent", s.attendance.absent, "var(--coral)"]].map(([label, total, color]) => <div key={label as string} className="rounded-xl bg-[var(--paper)] p-3"><div className="text-2xl font-extrabold" style={{ color: color as string }}>{total as number}</div><div className="text-sm opacity-70">{label}</div></div>)}</div></section>

      <div className="mt-8 h-3 overflow-hidden rounded-full bg-[var(--line)]" role="progressbar" aria-valuenow={pct} aria-label="Grade completion">
        <motion.div className="h-full rounded-full bg-[var(--sun)]" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.1, ease: "easeOut" }} />
      </div>
    </>
  );
}
