"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, BookOpen, CalendarCheck, Cloud, Download, Flower2, GraduationCap, Sparkles, Sun, TreePine, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  const statCards: { label: string; total: number; Icon: LucideIcon; style: string; category: string }[] = [
    { label: "Active students", total: s.students, Icon: UsersRound, style: "bg-[#eaf0ff] text-[#3975db]", category: "Overview" },
    { label: "Active classes", total: s.classes, Icon: GraduationCap, style: "bg-[#f0eaff] text-[#7954bd]", category: "Overview" },
    { label: "Awaiting confirmation", total: s.pending, Icon: CalendarCheck, style: "bg-[#fff4d6] text-[#bc8a15]", category: "Overview" },
    { label: "Grades completed", total: pct, Icon: BarChart3, style: "bg-[#e4f7ed] text-[#218d67]", category: "Progress" },
  ];
  function exportCsv() {
    const token = session()?.token ?? "";
    fetch(`${BASE}/export/roster?term=${encodeURIComponent(term)}`, { headers: { Accept: "text/csv", Authorization: `Bearer ${token}` } }).then((r) => r.blob()).then((blob) => { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `data-akademik-${term}.csv`; a.click(); URL.revokeObjectURL(url); });
  }
  return (
    <>
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="kid-hero mt-1 overflow-hidden rounded-[1.75rem] border border-[#f0e2ae] p-5 shadow-[0_16px_38px_rgba(50,87,166,.1)] sm:rounded-[2rem] sm:p-8 lg:p-9">
        <div className="relative z-10 max-w-2xl"><div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-xs font-extrabold text-[#218d79] shadow-sm"><Sparkles size={15} />A brighter learning experience</div><h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-[1.03] tracking-tight text-[#172d59] sm:text-5xl lg:text-6xl">Reports without manual spreadsheets.</h1><p className="mt-4 max-w-xl text-sm text-[#405577] sm:text-base">Teacher grades, admin enrollment, and family reports—all in one place.</p></div>
        <div className="kid-scene" aria-hidden="true"><Sun className="kid-sun" size={58} /><Cloud className="kid-cloud cloud-one" size={54} /><Cloud className="kid-cloud cloud-two" size={38} /><TreePine className="kid-tree tree-one" size={112} /><TreePine className="kid-tree tree-two" size={82} /><Flower2 className="kid-flower flower-one" size={31} /><Flower2 className="kid-flower flower-two" size={23} /><div className="kid-friends"><div className="kid-person person-yellow"><UsersRound size={37} /></div><div className="kid-person person-coral"><BookOpen size={31} /></div></div></div>
      </motion.section>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-bold text-[#52678f]"><span>Academic period</span><select aria-label="Academic period" value={term} onChange={(e) => setTerm(e.target.value)} className="rounded-xl border border-[#dce5f7] bg-white px-3 py-2.5 text-xs font-bold text-[#263d68] shadow-sm outline-none focus:border-[#7599e6]">{terms.map((item) => <option key={item} value={item}>{academicYearLabel(item, academicYears)}</option>)}</select></label>
        <button onClick={() => { notify("Preparing the academic data CSV export."); exportCsv(); }} className="inline-flex items-center gap-2 rounded-xl border border-[#dce5f7] bg-white px-4 py-2.5 text-xs font-bold text-[#315ca6] shadow-sm hover:bg-[#f4f7ff]"><Download size={15} />Export CSV</button>
      </div>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, total, Icon, style, category }) => (
          <div key={label} className="stat-card rounded-2xl border border-[#dce5f7] bg-white p-4 shadow-[0_8px_24px_rgba(32,58,112,.06)] sm:p-5">
            <div className="flex items-center justify-between gap-3"><span className={`grid size-10 place-items-center rounded-xl ${style}`}><Icon size={20} /></span><span className="text-[10px] font-bold uppercase tracking-wide text-[#9aa8bf]">{category}</span></div>
            <div className="mt-3 text-4xl font-extrabold tracking-tight text-[#172d59]" style={{ fontFamily: "var(--font-head)" }}><CountUp to={total} />{label === "Grades completed" && <span className="ml-0.5 text-2xl">%</span>}</div>
            <div className="mt-0.5 text-xs font-semibold text-[#7182a3]">{label}</div>
          </div>
        ))}
      </section>

      <section className="mt-4 rounded-2xl border border-[#dce5f7] bg-white p-4 shadow-[0_8px_24px_rgba(32,58,112,.06)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><CalendarCheck size={18} className="text-[#315ca6]" /><h2 className="text-base font-extrabold text-[#1b3567]">Attendance summary</h2></div><span className="text-[11px] font-semibold text-[#7182a3]">{academicYearLabel(term, academicYears)}</span></div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Present", s.attendance.present, "#22a783"], ["Excused", s.attendance.excused, "#dda91e"], ["Sick", s.attendance.sick, "#6597df"], ["Absent", s.attendance.absent, "#ed6956"]].map(([label, total, color]) => <div key={label as string} className="rounded-xl bg-[#f4f7fc] p-3"><div className="text-2xl font-extrabold" style={{ color: color as string }}>{total as number}</div><div className="text-[11px] font-semibold text-[#7182a3]">{label}</div></div>)}</div>
      </section>

      <div className="mt-5 rounded-2xl border border-[#dce5f7] bg-white p-4 shadow-[0_8px_24px_rgba(32,58,112,.06)] sm:p-5">
        <div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-[#405577]">Grade completion</span><span className="text-xs font-extrabold text-[#315ca6]">{pct}%</span></div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#e8edf7]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Grade completion">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-[#5a94ed] to-[#315ca6]" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.1, ease: "easeOut" }} />
        </div>
      </div>
    </>
  );
}
