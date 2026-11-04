"use client";
import { useEffect, useState } from "react";
import { BookOpen, CalendarClock, CheckCircle2, ChevronRight, Download, FileText, RefreshCw, ShieldCheck, Star, UsersRound } from "lucide-react";
import { AcademicYear, academicYearLabel, api, avg, BASE, CURRENT_TERM, hasRole, notify, session, Row, SKILLS, WEIGHTS } from "@/lib/api";
import { BecLogo } from "@/components/BecLogo";

type Theme = { id: number; theme: string; position: number };
const LEVELS = ["MATTHEW A", "MATTHEW B", "MARK", "LUKE", "JOHN", "TIMOTHY", "GENESIS", "ECSC"];
const formatScore = (score: number) => score.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function toLocalDateTimeInput(value: string): string {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
function promotionResult(level: string, score: number): string {
  if (score < 65) return `Remain at ${level} next academic year`;
  const currentLevel = LEVELS.findIndex((item) => item.toLowerCase() === level.toLowerCase());
  if (currentLevel < 0) return "Promote to the next level";
  return currentLevel === LEVELS.length - 1 ? "Graduate from ECSC" : `Promote to ${LEVELS[currentLevel + 1]}`;
}

export default function Rapor() {
  const [rows, setRows] = useState<Row[]>([]);
  const [term, setTerm] = useState(CURRENT_TERM);
  const [terms, setTerms] = useState<string[]>([CURRENT_TERM]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [id, setId] = useState(0);
  const canVerifyAsTeacher = hasRole("teacher");
  const canVerifyAsAcademic = hasRole("admin") || hasRole("academic_admin");
  const isTeacher = canVerifyAsTeacher;
  const canSchedule = canVerifyAsAcademic;
  const [publishAtDrafts, setPublishAtDrafts] = useState<Record<number, string>>({});
  const [weights, setWeights] = useState(WEIGHTS);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  useEffect(() => {
    const updateTime = () => setCurrentTime(Date.now());
    updateTime();
    const interval = window.setInterval(updateTime, 60_000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!currentTime) return;
    const interval = window.setInterval(() => {
      void api<Row[]>(`/roster?term=${encodeURIComponent(term)}`, []).then(setRows);
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [currentTime, term]);
  useEffect(() => {
    api<AcademicYear[]>("/academic-years", []).then((items) => {
      setAcademicYears(items);
      const years = items.map((item) => item.term);
      setTerms(years.length ? years : [CURRENT_TERM]);
      setTerm(years.includes(CURRENT_TERM) ? CURRENT_TERM : years[0] ?? CURRENT_TERM);
    });
  }, []);
  useEffect(() => { api<Row[]>(`/roster?term=${encodeURIComponent(term)}`, []).then((r) => { setRows(r); if (r[0]) setId(r[0].id); }); }, [term]);
  useEffect(() => {
    api<{ weights: typeof WEIGHTS }>(`/assessment-weights?term=${encodeURIComponent(term)}`, { weights: WEIGHTS }).then((result) => setWeights(result.weights));
  }, [term]);
  const r = rows.find((x) => x.id === id) ?? rows[0];
  useEffect(() => { if (r?.classroom_id) void api<Theme[]>(`/themes?classroom_id=${r.classroom_id}&term=${encodeURIComponent(term)}`, []).then(setThemes); }, [r?.classroom_id, term]);
  const publishAt = publishAtDrafts[r?.id ?? 0] ?? (r?.report_publish_at ? toLocalDateTimeInput(r.report_publish_at) : "");
  if (!r) return <p className="mt-10">No student records are available for this academic year.</p>;
  const canRequestRevision = isTeacher && Boolean(r.published_at);
  const assignmentComplete = r.quiz_count
    ? r.quiz_scores?.length === r.quiz_count
    : typeof r.scores.Assignment === "number";
  const scoresComplete = assignmentComplete && ["Mid Term Test", "Final Test"].every((skill) => typeof r.scores[skill] === "number");
  const a = avg(r.scores, weights);
  const result = promotionResult(r.level, a);
  function exportCsv() { const token = session()?.token ?? ""; fetch(`${BASE}/export/roster?term=${encodeURIComponent(term)}`, { headers: { Accept: "text/csv", Authorization: `Bearer ${token}` } }).then((x) => x.blob()).then((blob) => { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `rapor-${term}.csv`; link.click(); URL.revokeObjectURL(url); }); }
  async function verify(stage: "teacher" | "academic") {
    const result = await api<Row>(`/reports/${r.id}/verify`, {} as Row, {
      method: "PATCH",
      body: JSON.stringify({ stage }),
    }, stage === "teacher" ? "Report verified by teacher." : "Report approved by Academic. It will publish at the scheduled time.");
    if (result.id) {
      setRows((items) => items.map((item) => item.id === result.id ? {
        ...item,
        teacher_verified_at: result.teacher_verified_at,
        academic_verified_at: result.academic_verified_at,
        report_publish_at: result.report_publish_at,
        published_at: result.published_at,
        revision_requested_at: result.revision_requested_at,
        report_status: result.report_status,
      } : item));
    }
  }
  async function reopen() {
    const result = await api<Row>(`/reports/${r.id}/request-revision`, {} as Row, { method: "POST" }, "Report changed to draft for revision. Save changes and request teacher approval again.");
    if (result.id) {
      setRows((items) => items.map((item) => item.id === result.id ? { ...item, teacher_verified_at: undefined, academic_verified_at: undefined, report_publish_at: null, published_at: undefined, revision_requested_at: result.revision_requested_at, report_status: "draft" } : item));
    }
  }
  async function saveSchedule(event: React.FormEvent) {
    event.preventDefault();
    const result = await api<Row>(`/reports/${r.id}/schedule`, {} as Row, {
      method: "PATCH",
      body: JSON.stringify({ publish_at: new Date(publishAt).toISOString() }),
    }, "This student's publication date was saved.");
    if (result.id) {
      setRows((items) => items.map((item) => item.id === result.id ? { ...item, report_publish_at: result.report_publish_at, published_at: result.published_at, report_status: result.published_at ? "published" : item.report_status } : item));
      setPublishAtDrafts((drafts) => Object.fromEntries(Object.entries(drafts).filter(([draftId]) => Number(draftId) !== result.id)));
    }
  }

  const reportPublished = Boolean(r.published_at);
  const publicationStatus = reportPublished
    ? "Published"
    : r.academic_verified_at
      ? "Approved · awaiting publication"
      : r.teacher_verified_at
        ? "Awaiting Academic approval"
        : "Draft · awaiting teacher approval";
  const reportActionButton = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <>
      <section className="no-print relative mt-3 overflow-hidden rounded-[1.75rem] border border-[#dbe5ff] bg-gradient-to-br from-[#eef3ff] via-white to-[#e6efff] p-5 shadow-[0_16px_38px_rgba(50,87,166,.1)] sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full bg-[#dbe7ff]/70 blur-2xl" />
        <div className="relative">
          <div className="flex items-start gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#4d83e5] to-[#3162c3] text-white shadow-md shadow-blue-900/15"><FileText size={27} /></span>
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#dce6ff] bg-white/80 px-3 py-1 text-xs font-bold text-[#416199]"><BookOpen size={13} /><span>Academic</span><ChevronRight size={13} /><span>Report</span></div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#172d59] sm:text-3xl">{canSchedule ? `Publication schedule for ${r.name}` : "Student e-report card"}</h1>
              <p className="mt-1 max-w-3xl text-sm text-[#52678f]">{canSchedule ? "Each student has an independent publication date. After the teacher and Academic approve this report, it publishes automatically at the scheduled time." : "Review the student’s learning progress, assessment results, and final outcome for the academic year."}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 rounded-2xl border border-[#dce6ff] bg-white/90 p-3 shadow-sm sm:grid-cols-2 xl:grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_auto_auto] xl:items-end">
            <label className="text-[11px] font-bold uppercase tracking-wide text-[#7182a3]">Academic period
              <select aria-label="Select academic year" value={term} onChange={(e) => setTerm(e.target.value)} className="mt-1 block w-full rounded-xl border border-[#dce5f7] bg-white px-3 py-2.5 text-sm font-bold normal-case tracking-normal text-[#263d68] outline-none focus:border-[#7599e6] focus:ring-2 focus:ring-[#e5edff]">{terms.map((item) => <option key={item} value={item}>{academicYearLabel(item, academicYears)}</option>)}</select>
            </label>
            <label className="text-[11px] font-bold uppercase tracking-wide text-[#7182a3]">Student
              <select aria-label="Select student" value={id} onChange={(e) => setId(Number(e.target.value))} className="mt-1 block w-full rounded-xl border border-[#dce5f7] bg-white px-3 py-2.5 text-sm font-bold normal-case tracking-normal text-[#263d68] outline-none focus:border-[#7599e6] focus:ring-2 focus:ring-[#e5edff]">{rows.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
            </label>
            {canSchedule && <form onSubmit={saveSchedule} className="contents">
              <label className="text-[11px] font-bold uppercase tracking-wide text-[#7182a3]">Publication date and time
                <input aria-label="Publication date and time" required type="datetime-local" value={publishAt} onChange={(e) => setPublishAtDrafts((drafts) => ({ ...drafts, [r.id]: e.target.value }))} className="mt-1 block w-full rounded-xl border border-[#dce5f7] bg-white px-3 py-2.5 text-sm font-bold normal-case tracking-normal text-[#263d68] outline-none focus:border-[#7599e6] focus:ring-2 focus:ring-[#e5edff]" />
              </label>
              <button disabled={reportPublished} className={`${reportActionButton} bg-gradient-to-r from-[#315ca6] to-[#24457f] text-white shadow-sm`}><RefreshCw size={15} />{r.report_publish_at ? "Update this student's date" : "Set publication date"}</button>
            </form>}
            {!canSchedule && <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-2">
              <button onClick={() => { notify("Opening the PDF save dialog."); window.print(); }} className={`${reportActionButton} bg-gradient-to-r from-[#315ca6] to-[#24457f] text-white shadow-sm`}><Download size={16} />{hasRole("parent") ? "Download e-report PDF" : "Print report"}</button>
              {!hasRole("parent") && <button onClick={() => { notify("Preparing the report CSV export."); exportCsv(); }} className={`${reportActionButton} border border-[#dce5f7] bg-white text-[#315ca6] hover:bg-[#f4f7ff]`}><Download size={16} />Export CSV</button>}
            </div>}
            {canSchedule && <div className={`inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-extrabold ${reportPublished ? "bg-[#e7f7ed] text-[#24784a]" : "bg-[#fff7db] text-[#93700a]"}`}><CheckCircle2 size={15} />{reportPublished ? "Published" : "Not published"}</div>}
          </div>

          {canSchedule && <p className="mt-2 flex items-center gap-1.5 px-1 text-xs font-medium text-[#52678f]"><CalendarClock size={14} />{reportPublished ? "This report has been published." : r.report_publish_at ? `Scheduled for ${new Date(r.report_publish_at).toLocaleString("en-US")}.` : "No publication date or time has been set for this student."} Publication status is checked automatically every minute.</p>}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${reportPublished ? "bg-[#e7f7ed] text-[#24784a]" : "bg-white/90 text-[#52678f]"}`}><ShieldCheck size={14} />{publicationStatus}</span>
            {canVerifyAsTeacher && <button onClick={() => void verify("teacher")} disabled={Boolean(r.teacher_verified_at || reportPublished || !scoresComplete)} className={`${reportActionButton} border border-[#b8dfd0] bg-white text-[#24815f] hover:bg-[#f0fbf6]`}>{r.teacher_verified_at ? <><CheckCircle2 size={15} />Verified by teacher</> : <><ShieldCheck size={15} />{scoresComplete ? "Approve as teacher" : "Complete grades to verify"}</>}</button>}
            {canVerifyAsAcademic && <button onClick={() => void verify("academic")} disabled={Boolean(!r.teacher_verified_at || r.academic_verified_at || reportPublished)} className={`${reportActionButton} border border-[#b8dfd0] bg-white text-[#24815f] hover:bg-[#f0fbf6]`}>{reportPublished ? <><CheckCircle2 size={15} />Published</> : r.academic_verified_at ? <><CheckCircle2 size={15} />Approved; waiting for publication</> : <><ShieldCheck size={15} />{r.teacher_verified_at ? "Approve report" : "Awaiting teacher approval"}</>}</button>}
            {canRequestRevision && <button onClick={reopen} className={`${reportActionButton} border border-[#f1d89b] bg-white text-[#9a6c0b] hover:bg-[#fffaf0]`}><RefreshCw size={15} />Request report revision</button>}
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-[#7283a2]"><UsersRound size={14} />{r.class}</span>
          </div>
        </div>
      </section>

      <section className="report-preview-shell mt-5 rounded-[1.5rem] border border-[#dce5f7] bg-white/80 p-3 shadow-[0_12px_30px_rgba(32,58,112,.08)] sm:p-5">
        <div className="no-print mb-3 flex items-center gap-2 px-1 text-sm font-bold text-[#52678f]"><FileText size={16} className="text-[#3975db]" />Report preview <span className="ml-auto hidden text-xs font-medium sm:inline">Print or download as PDF using the button above</span></div>
        <article key={r.id} className="report-sheet mt-0">
        <header className="report-header">
          <div className="report-header-content"><div className="report-brand">Bethesda English Course · Sidoarjo</div><p className="report-kicker">E-Report · {academicYearLabel(term, academicYears)}</p><h1>{r.name}</h1><p><b>Level:</b> {r.level}</p><p><b>Academic period:</b> {academicYearLabel(term, academicYears)}</p></div>
          <BecLogo size={180} className="report-logo" />
        </header>
        <section className="report-themes"><h2>What I have learned</h2><ul>{themes.map((item) => <li key={item.id}><Star size={18} fill="currentColor" />{item.theme}</li>)}</ul>{themes.length === 0 && <p>No learning themes have been added.</p>}</section>
        <div className="report-table-wrap"><table className="report-grade-table"><thead><tr><th>No.</th><th>Subject assessed</th><th>Score</th><th>Total result</th></tr></thead><tbody>{SKILLS.map((skill, index) => <tr key={skill}><td>{index + 1}</td><th scope="row">{skill === "Assignment" ? "Assignment average" : skill} <span>({weights[skill]}%)</span></th><td>{typeof r.scores[skill] === "number" ? formatScore(r.scores[skill]) : "—"}</td>{index === 0 && <td rowSpan={SKILLS.length} className="report-total-result"><strong>{formatScore(a)}</strong><span>Final score</span></td>}</tr>)}</tbody></table></div>
        <section className="report-comment"><h2>Teacher&apos;s comment</h2><p>{r.note || "No teacher comment has been added."}</p></section>
        <section className="report-outcome"><span className="report-outcome-label">Final outcome</span><strong>{result}</strong><span>{a >= 65 ? "Congratulations on your achievement!" : "Keep practicing for the next academic year."}</span></section>
        <footer className="report-footer"><span>{r.teacher_name ?? "Teacher"}<small>Teacher(s)</small></span><span>{r.coordinator_name ?? "Academic Admin"}<small>Coordinator of BEC</small></span></footer>
        </article>
      </section>
    </>
  );
}
