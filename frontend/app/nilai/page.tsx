"use client";
import { useEffect, useState } from "react";
import { AcademicYear, academicYearLabel, api, CURRENT_TERM, hasRole, Row, SKILLS, WEIGHTS } from "@/lib/api";

type Quiz = { id: number; name: string };
type GradeRow = Row & { quiz_scores?: { quiz_id: number; score: number }[] };
type Classroom = { id: number; name: string };

export default function Nilai() {
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [term, setTerm] = useState(CURRENT_TERM);
  const [terms, setTerms] = useState<string[]>([CURRENT_TERM]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [weights, setWeights] = useState(WEIGHTS);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classroomId, setClassroomId] = useState<number | "">("");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loadedQuizScope, setLoadedQuizScope] = useState("");
  const [quizName, setQuizName] = useState("");
  const [quizValues, setQuizValues] = useState<Record<string, string>>({});
  const canEdit = hasRole("teacher");
  const canManageWeights = hasRole("admin") || hasRole("academic_admin");
  useEffect(() => {
    api<AcademicYear[]>("/academic-years", []).then((items) => {
      setAcademicYears(items);
      const years = items.map((item) => item.term);
      setTerms(years.length ? years : [CURRENT_TERM]);
      if (years[0]) setTerm(years[0]);
    });
  }, []);
  useEffect(() => {
    api<Classroom[]>(`/classrooms?term=${encodeURIComponent(term)}`, []).then((items) => {
      setClassrooms(items);
      setClassroomId((current) => items.some((item) => item.id === current) ? current : items[0]?.id ?? "");
    });
    api<GradeRow[]>(`/roster?term=${encodeURIComponent(term)}`, []).then(setRows);
  }, [term]);
  useEffect(() => {
    if (!classroomId) return;
    const scope = `${term}:${classroomId}`;
    void api<Quiz[]>(`/quizzes?classroom_id=${classroomId}&term=${encodeURIComponent(term)}`, []).then((items) => {
      setQuizzes(items);
      setLoadedQuizScope(scope);
    });
  }, [classroomId, term]);
  useEffect(() => {
    api<{ weights: typeof WEIGHTS }>(`/assessment-weights?term=${encodeURIComponent(term)}`, { weights: WEIGHTS }).then((result) => setWeights(result.weights));
  }, [term]);

  const classRows = rows.filter((row) => row.classroom_id === classroomId);
  const activeQuizzes = loadedQuizScope === `${term}:${classroomId}` ? quizzes : [];
  const assignmentAverage = (row: GradeRow) => {
    const scores = activeQuizzes.flatMap((quiz) => {
      const draft = quizValues[`${row.id}:${quiz.id}`];
      const score = draft ?? row.quiz_scores?.find((item) => item.quiz_id === quiz.id)?.score?.toString() ?? "";
      return score !== "" && Number.isFinite(Number(score)) ? [Number(score)] : [];
    });
    return scores.length ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100 : null;
  };

  const set = (id: number, k: string, v: string) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, scores: { ...x.scores, [k]: v === "" ? null : Math.min(100, Math.max(0, Number(v))) } } : x)));

  async function save() {
    await api<{ ok?: boolean }>("/scores", {}, { method: "POST", body: JSON.stringify({ rows: classRows.map(({ id, scores, note }) => ({ id, scores: Object.fromEntries(Object.entries(scores).filter(([key]) => key !== "Participation" && key !== "Assignment")), note })) }) }, "Grades saved successfully.");
  }

  async function addQuiz(event: React.FormEvent) {
    event.preventDefault();
    if (!classroomId || !quizName.trim()) return;
    const result = await api<Quiz>("/quizzes", {} as Quiz, { method: "POST", body: JSON.stringify({ classroom_id: classroomId, term, name: quizName.trim() }) }, "Quiz added.");
    if (result.id) {
      setQuizzes((items) => [...items, result]);
      setQuizName("");
    }
  }

  async function saveQuizScores() {
    const scores = classRows.flatMap((row) => activeQuizzes.map((quiz) => {
      const value = quizValues[`${row.id}:${quiz.id}`] ?? String(row.quiz_scores?.find((item) => item.quiz_id === quiz.id)?.score ?? "");
      return { quiz_id: quiz.id, enrollment_id: row.id, value: value === "" ? null : Number(value) };
    }));
    const result = await api<{ ok?: boolean }>("/quiz-scores", {}, { method: "POST", body: JSON.stringify({ scores }) }, "Quiz scores saved successfully.");
    if (result.ok) {
      const updatedRows = await api<GradeRow[]>(`/roster?term=${encodeURIComponent(term)}`, []);
      setRows(updatedRows);
      setQuizValues({});
    }
  }

  async function saveWeights(event: React.FormEvent) {
    event.preventDefault();
    const result = await api<{ weights?: typeof WEIGHTS }>("/assessment-weights", {}, { method: "PUT", body: JSON.stringify({ term, weights }) }, "Assessment weights saved successfully.");
    if (result.weights) setWeights(result.weights);
  }

  return (
    <>
      <h1 className="mt-8 text-3xl font-extrabold">Grade entry</h1>
      <p className="mt-2 opacity-70">Participation is calculated from attendance. Enter flexible quiz scores for Assignment, plus midterm and final exam scores.</p>
      <label className="mt-4 block text-sm font-semibold">Academic period<select value={term} onChange={(e) => { setQuizValues({}); setTerm(e.target.value); }} className="ml-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2">{terms.map((item) => <option key={item} value={item}>{academicYearLabel(item, academicYears)}</option>)}</select></label>
      <label className="mt-4 block text-sm font-semibold">Class<select value={classroomId} onChange={(e) => { setQuizValues({}); setClassroomId(e.target.value ? Number(e.target.value) : ""); }} className="ml-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2"><option value="">Select a class</option>{classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}</select></label>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--line)] bg-white">
        <table className="w-full min-w-[900px] text-left">
          <thead><tr className="border-b border-[var(--line)] text-sm"><th className="p-3">Student</th>{SKILLS.filter((skill) => skill !== "Assignment").map((skill) => <th key={skill} className="p-3">{skill}<span className="ml-1 text-xs opacity-60">({weights[skill]}%)</span></th>)}<th className="p-3">Report comment</th></tr></thead>
          <tbody>
            {classRows.map((r) => (
              <tr key={r.id} className="border-b border-[var(--line)] last:border-0">
                <td className="p-3 font-semibold">{r.name}<div className="text-xs font-normal opacity-60">{r.class}</div></td>
                {SKILLS.filter((skill) => skill !== "Assignment").map((skill) => (
                  <td key={skill} className="p-3">
                    {skill === "Participation" ? <span>{r.scores[skill] ?? 0}<small className="ml-1 block text-xs opacity-60">From attendance</small></span> : <input type="number" min={0} max={100} value={r.scores[skill] ?? ""} aria-label={`${skill} ${r.name}`} disabled={!canEdit}
                      onChange={(e) => set(r.id, skill, e.target.value)}
                      className="w-20 rounded-lg border border-[var(--line)] px-2 py-1.5" />}
                  </td>
                ))}
                <td className="p-3"><input value={r.note ?? ""} maxLength={500} aria-label={`Catatan ${r.name}`} disabled={!canEdit} onChange={(e) => setRows((x) => x.map((y) => (y.id === r.id ? { ...y, note: e.target.value } : y)))} className="w-56 rounded-lg border border-[var(--line)] px-2 py-1.5" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit && <button onClick={save} className="mt-5 rounded-xl bg-[var(--ink)] px-5 py-3 font-semibold text-white transition active:scale-95">Save exam grades</button>}
      <section className="mt-7 rounded-2xl border border-[var(--line)] bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-extrabold">Assignment quizzes</h2><p className="mt-1 text-sm opacity-70">The Assignment grade is the average of all quizzes in the academic year.</p></div>{canEdit && <form onSubmit={addQuiz} className="flex flex-wrap gap-2"><input required maxLength={100} value={quizName} onChange={(event) => setQuizName(event.target.value)} placeholder="Quiz name" aria-label="Quiz name" className="rounded-lg border border-[var(--line)] px-3 py-2" /><button disabled={!classroomId} className="rounded-lg bg-[var(--ink)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-45">Add quiz</button></form>}</div>
        {!classroomId && <p className="mt-4 text-sm opacity-70">Select a class to manage its quizzes.</p>}
        {classroomId && loadedQuizScope === `${term}:${classroomId}` && activeQuizzes.length === 0 && <p className="mt-4 text-sm opacity-70">No quizzes have been added for this class and academic year.</p>}
        {classroomId && activeQuizzes.length > 0 && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead><tr className="border-b border-[var(--line)] text-sm"><th className="p-3">Student</th>{activeQuizzes.map((quiz) => <th key={quiz.id} className="p-3">{quiz.name}</th>)}<th className="p-3">Assignment average</th></tr></thead><tbody>{classRows.map((row) => <tr key={row.id} className="border-b border-[var(--line)] last:border-0"><td className="p-3 font-semibold">{row.name}</td>{activeQuizzes.map((quiz) => { const key = `${row.id}:${quiz.id}`; const stored = row.quiz_scores?.find((item) => item.quiz_id === quiz.id)?.score; return <td key={quiz.id} className="p-3"><input type="number" min={0} max={100} value={quizValues[key] ?? (stored === undefined ? "" : String(stored))} aria-label={`${quiz.name} score for ${row.name}`} disabled={!canEdit || Boolean(row.published_at)} onChange={(event) => setQuizValues((values) => ({ ...values, [key]: event.target.value }))} className="w-20 rounded-lg border border-[var(--line)] px-2 py-1.5" /></td>; })}<td className="p-3 font-semibold">{assignmentAverage(row) ?? "—"}</td></tr>)}</tbody></table></div>}
        {canEdit && activeQuizzes.length > 0 && <button onClick={() => void saveQuizScores()} disabled={!classRows.length || classRows.some((row) => Boolean(row.published_at))} className="mt-4 rounded-xl bg-[var(--ink)] px-5 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">Save quiz scores</button>}
      </section>
      {canManageWeights && <form onSubmit={saveWeights} className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5">
        <h2 className="text-xl font-extrabold">Assessment weights for term {term}</h2>
        <p className="mt-1 text-sm opacity-70">Weights apply to every class in this term and must total 100%.</p>
        <div className="mt-4 flex flex-wrap gap-4">{SKILLS.map((skill) => <label key={skill} className="text-sm font-semibold">{skill} (%)<input type="number" min={0} max={100} required value={weights[skill]} onChange={(event) => setWeights((current) => ({ ...current, [skill]: Number(event.target.value) }))} className="mt-1 block w-24 rounded-lg border border-[var(--line)] px-3 py-2" /></label>)}</div>
        <p className="mt-2 text-sm">Total: {Object.values(weights).reduce((sum, value) => sum + value, 0)}%</p>
        <button disabled={Object.values(weights).reduce((sum, value) => sum + value, 0) !== 100} className="mt-3 rounded-xl bg-[var(--ink)] px-4 py-2 font-semibold text-white disabled:opacity-45">Save weights</button>
      </form>}
    </>
  );
}
