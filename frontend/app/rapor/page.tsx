"use client";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { AcademicYear, academicYearLabel, api, avg, BASE, CURRENT_TERM, hasRole, notify, session, Row, SKILLS, WEIGHTS } from "@/lib/api";
import { BecLogo } from "@/components/BecLogo";

type PublicationSchedule = { id: number; term: string; publish_at: string; status: "scheduled" | "partial" | "published" };
type Theme = { id: number; theme: string; position: number };
const LEVELS = ["MATTHEW A", "MATTHEW B", "MARK", "LUKE", "JOHN", "TIMOTHY", "GENESIS", "ECSC"];
const formatScore = (score: number) => score.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const [schedules, setSchedules] = useState<PublicationSchedule[]>([]);
  const [publishAt, setPublishAt] = useState("");
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
    api<AcademicYear[]>("/academic-years", []).then((items) => {
      setAcademicYears(items);
      const years = items.map((item) => item.term);
      setTerms(years.length ? years : [CURRENT_TERM]);
      setTerm(years.includes(CURRENT_TERM) ? CURRENT_TERM : years[0] ?? CURRENT_TERM);
    });
  }, []);
  useEffect(() => { api<Row[]>(`/roster?term=${encodeURIComponent(term)}`, []).then((r) => { setRows(r); if (r[0]) setId(r[0].id); }); }, [term]);
  useEffect(() => { if (canSchedule || isTeacher) void api<PublicationSchedule[]>("/report-publications", []).then(setSchedules); }, [canSchedule, isTeacher]);
  useEffect(() => {
    api<{ weights: typeof WEIGHTS }>(`/assessment-weights?term=${encodeURIComponent(term)}`, { weights: WEIGHTS }).then((result) => setWeights(result.weights));
  }, [term]);
  const r = rows.find((x) => x.id === id) ?? rows[0];
  useEffect(() => { if (r?.classroom_id) void api<Theme[]>(`/themes?classroom_id=${r.classroom_id}&term=${encodeURIComponent(term)}`, []).then(setThemes); }, [r?.classroom_id, term]);
  if (!r) return <p className="mt-10">No student records are available for this academic year.</p>;
  const schedule = schedules.find((item) => item.term === term);
  const publicationReached = !schedule || currentTime >= new Date(schedule.publish_at).getTime();
  const canRequestRevision = isTeacher && Boolean(r.published_at && schedule && currentTime >= new Date(schedule.publish_at).getTime());
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
    }, stage === "teacher" ? "Report verified by teacher." : "Report approved and published by Academic.");
    if (result.id) {
      setRows((items) => items.map((item) => item.id === result.id ? {
        ...item,
        teacher_verified_at: result.teacher_verified_at,
        academic_verified_at: result.academic_verified_at,
        published_at: result.published_at,
        revision_requested_at: result.revision_requested_at,
        report_status: result.report_status,
      } : item));
    }
  }
  async function reopen() {
    const result = await api<Row>(`/reports/${r.id}/request-revision`, {} as Row, { method: "POST" }, "Report changed to draft for revision. Save changes and request teacher approval again.");
    if (result.id) {
      setRows((items) => items.map((item) => item.id === result.id ? { ...item, teacher_verified_at: undefined, academic_verified_at: undefined, published_at: undefined, revision_requested_at: result.revision_requested_at, report_status: "draft" } : item));
    }
  }
  async function saveSchedule(event: React.FormEvent) {
    event.preventDefault();
    const result = await api<PublicationSchedule>("/report-publications", {} as PublicationSchedule, {
      method: "POST",
      body: JSON.stringify({ term, publish_at: new Date(publishAt).toISOString() }),
    }, "Report publication date saved.");
    if (result.id) {
      setSchedules((items) => [result, ...items.filter((item) => item.term !== result.term)]);
    }
  }
  async function publishSchedule(scheduleItem: PublicationSchedule) {
    const result = await api<PublicationSchedule>(`/report-publications/${scheduleItem.id}/publish`, {} as PublicationSchedule, { method: "POST" }, "Ready reports have been published.");
    if (result.id) {
      setSchedules((items) => items.map((item) => item.id === result.id ? result : item));
      const refreshedRows = await api<Row[]>(`/roster?term=${encodeURIComponent(term)}`, []);
      setRows(refreshedRows);
    }
  }

  return (
    <>
      <div className="no-print mt-8 flex flex-wrap items-center gap-3">
        <select value={term} onChange={(e) => setTerm(e.target.value)} className="rounded-lg border border-[var(--line)] bg-white px-3 py-2" aria-label="Select academic year">{terms.map((item) => <option key={item} value={item}>{academicYearLabel(item, academicYears)}</option>)}</select>
        <select value={id} onChange={(e) => setId(Number(e.target.value))} className="rounded-lg border border-[var(--line)] bg-white px-3 py-2" aria-label="Select student">
          {rows.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <button onClick={() => { notify("Opening the PDF save dialog."); window.print(); }} className="rounded-xl bg-[var(--ink)] px-4 py-2 font-semibold text-white">{hasRole("parent") ? "Download e-report PDF" : "Print report"}</button>
        {!hasRole("parent") && <button onClick={() => { notify("Preparing the report CSV export."); exportCsv(); }} className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 font-semibold">Export CSV</button>}
        {canVerifyAsTeacher && <button onClick={() => void verify("teacher")} disabled={Boolean(r.teacher_verified_at || r.published_at || !scoresComplete)} className="rounded-xl border border-[var(--mint)] px-4 py-2 font-semibold text-[var(--mint)] disabled:cursor-not-allowed disabled:opacity-45">{r.teacher_verified_at ? "Verified by teacher" : scoresComplete ? "Approve as teacher" : "Complete grades to verify"}</button>}
        {canVerifyAsAcademic && <button onClick={() => void verify("academic")} disabled={Boolean(!r.teacher_verified_at || r.published_at || !publicationReached)} className="rounded-xl border border-[var(--mint)] px-4 py-2 font-semibold text-[var(--mint)] disabled:cursor-not-allowed disabled:opacity-45">{r.published_at ? "Published" : r.teacher_verified_at ? "Academic approve & publish" : "Awaiting teacher approval"}</button>}
        {canRequestRevision && <button onClick={reopen} className="rounded-xl border border-amber-500 px-4 py-2 font-semibold text-amber-700">Request report revision</button>}
      </div>
      {canSchedule && <section className="no-print mt-5 rounded-2xl border border-[var(--line)] bg-white p-5"><h2 className="text-xl font-extrabold">Report publication schedule</h2><form onSubmit={saveSchedule} className="mt-3 flex flex-wrap items-end gap-3"><label className="text-sm font-semibold">Academic period<input value={academicYearLabel(term, academicYears)} readOnly className="mt-1 block rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2" /></label><label className="text-sm font-semibold">Publication date<input required type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} className="mt-1 block rounded-lg border border-[var(--line)] bg-white px-3 py-2" /></label><button className="rounded-xl bg-[var(--ink)] px-4 py-2 font-semibold text-white">Save publication date</button></form><div className="mt-4 space-y-2">{schedules.map((scheduleItem) => <div key={scheduleItem.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--paper)] p-3"><span className="mr-auto font-semibold">{academicYearLabel(scheduleItem.term, academicYears)} · Publish {new Date(scheduleItem.publish_at).toLocaleString("en-US")}</span><span className="text-sm opacity-70">{scheduleItem.status === "published" ? "Published" : scheduleItem.status === "partial" ? "Partially published" : "Scheduled"}</span>{scheduleItem.status !== "published" && <button disabled={!currentTime || currentTime < new Date(scheduleItem.publish_at).getTime()} onClick={() => void publishSchedule(scheduleItem)} className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45">Publish ready reports</button>}</div>)}</div></section>}

      <article key={r.id} className="report-sheet mt-6">
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
    </>
  );
}
