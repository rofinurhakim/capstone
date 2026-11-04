"use client";
import { useEffect, useState } from "react";
import { BookOpenCheck, CalendarDays, Check, ChevronRight, ClipboardList, FileText, GraduationCap, MessageCircle, Save, Scale, Trophy, UsersRound } from "lucide-react";
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
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
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
      <section className="relative mt-3 overflow-hidden rounded-[1.75rem] border border-[#dbe5ff] bg-gradient-to-br from-[#eef3ff] via-white to-[#e6efff] p-5 shadow-[0_16px_38px_rgba(50,87,166,.1)] sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full bg-[#dbe7ff]/70 blur-2xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#dbe7ff] text-[#234783] shadow-sm"><GraduationCap size={30} strokeWidth={2.2} /></span>
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#dce6ff] bg-white/80 px-3 py-1 text-xs font-bold text-[#416199]"><span>Academic</span><ChevronRight size={13} /><span>Grade entry</span></div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#172d59] sm:text-4xl">Grade Entry</h1>
              <p className="mt-1 max-w-xl text-sm text-[#52678f]">Record student progress from attendance, quizzes, and exams.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[460px]">
            <label className="flex items-center gap-3 rounded-2xl border border-[#dce6ff] bg-white/90 p-3 shadow-sm">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eff4ff] text-[#3864ad]"><CalendarDays size={19} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[11px] font-bold uppercase tracking-wide text-[#7182a3]">Academic period</span><select aria-label="Academic period" value={term} onChange={(e) => { setQuizValues({}); setTerm(e.target.value); }} className="mt-0.5 w-full truncate bg-transparent text-sm font-bold text-[#203967] outline-none">{terms.map((item) => <option key={item} value={item}>{academicYearLabel(item, academicYears)}</option>)}</select></span>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-[#dce6ff] bg-white/90 p-3 shadow-sm">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eff4ff] text-[#3864ad]"><UsersRound size={19} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[11px] font-bold uppercase tracking-wide text-[#7182a3]">Class</span><select aria-label="Class" value={classroomId} onChange={(e) => { setQuizValues({}); setClassroomId(e.target.value ? Number(e.target.value) : ""); }} className="mt-0.5 w-full bg-transparent text-sm font-bold text-[#203967] outline-none"><option value="">Select a class</option>{classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}</select></span>
            </label>
          </div>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-[#dce5f7] bg-white shadow-[0_12px_30px_rgba(32,58,112,.08)]">
        <div className="flex items-center gap-3 border-b border-[#e5ebf8] px-4 py-3 sm:px-5">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#315ca6] to-[#24457f] text-white shadow-sm"><UsersRound size={20} /></span>
          <div className="min-w-0 flex-1"><h2 className="font-extrabold text-[#1b3567]">Students</h2><p className="text-xs text-slate-500">Exam grades and participation for the selected class</p></div>
          <span className="rounded-full bg-[#edf3ff] px-3 py-1 text-xs font-extrabold text-[#315ca6]">{classRows.length} {classRows.length === 1 ? "student" : "students"}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-[#f0f4ff] text-[11px] font-extrabold uppercase tracking-wide text-[#43577f]"><tr><th className="px-4 py-3">Student</th>{SKILLS.filter((skill) => skill !== "Assignment").map((skill) => <th key={skill} className="px-4 py-3">{skill}<span className="ml-1 whitespace-nowrap text-[10px] font-semibold text-[#7382a1]">({weights[skill]}%)</span></th>)}<th className="px-4 py-3">Report comment</th></tr></thead>
            <tbody>
              {classRows.map((r, index) => (
                <tr key={r.id} className={`border-t border-[#e8edf7] transition-colors hover:bg-[#f8faff] ${index % 2 ? "bg-[#fcfdff]" : "bg-white"}`}>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-[#fee2cc] to-[#f7b88e] text-xs font-extrabold text-[#754a34] shadow-sm">{r.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-sm font-extrabold text-[#24385d]">{r.name}</span><span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">{r.level || r.class}</span></span></div></td>
                  {SKILLS.filter((skill) => skill !== "Assignment").map((skill) => (
                    <td key={skill} className="px-4 py-3">
                      {skill === "Participation" ? <span className="font-extrabold tabular-nums text-[#2c4776]">{r.scores[skill] ?? 0}<small className="mt-0.5 block text-[10px] font-medium text-slate-500">From attendance</small></span> : <input type="number" min={0} max={100} value={r.scores[skill] ?? ""} aria-label={`${skill} ${r.name}`} disabled={!canEdit || Boolean(r.published_at)} onChange={(e) => set(r.id, skill, e.target.value)} className="w-24 rounded-xl border border-[#dce5f7] bg-[#fbfcff] px-3 py-2 text-sm font-bold text-[#253c68] shadow-inner outline-none transition focus:border-[#7599e6] focus:ring-2 focus:ring-[#e5edff] disabled:bg-slate-100" />}
                    </td>
                  ))}
                  <td className="px-4 py-3"><div className="flex min-w-[220px] items-center gap-2 rounded-xl border border-[#e0e8f7] bg-[#fbfcff] px-3"><MessageCircle size={15} className="shrink-0 text-[#76a0e8]" /><input value={r.note ?? ""} maxLength={500} aria-label={`Catatan ${r.name}`} disabled={!canEdit || Boolean(r.published_at)} onChange={(e) => setRows((x) => x.map((y) => (y.id === r.id ? { ...y, note: e.target.value } : y)))} placeholder="Write a short comment..." className="min-w-0 flex-1 bg-transparent py-2.5 text-xs font-medium text-[#30446a] outline-none placeholder:text-slate-400 disabled:opacity-60" /></div></td>
                </tr>
              ))}
              {classRows.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center"><UsersRound size={28} className="mx-auto text-[#9badcf]" /><p className="mt-2 font-bold text-[#3d527c]">{classroomId ? "No students in this class yet" : "Select a class to see students"}</p><p className="mt-1 text-sm text-slate-500">Choose an academic period and class above to start entering grades.</p></td></tr>}
            </tbody>
          </table>
        </div>
        {canEdit && <div className="flex justify-end border-t border-[#e8edf7] bg-[#fbfcff] px-4 py-3 sm:px-5"><button onClick={save} disabled={!classRows.length || classRows.some((row) => Boolean(row.published_at))} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#315ca6] to-[#24457f] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-900/15 transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-45"><Save size={16} />Save exam grades</button></div>}
      </section>

      <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-[#e4ddfb] bg-white shadow-[0_12px_30px_rgba(75,55,142,.07)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#eee9fb] px-4 py-4 sm:px-5">
          <span className="grid size-11 place-items-center rounded-xl bg-[#eee8ff] text-[#7150bd]"><ClipboardList size={22} /></span>
          <div className="mr-auto"><h2 className="font-extrabold text-[#362866]">Assignment quizzes</h2><p className="mt-0.5 text-xs text-slate-500">Assignment grade is the average of every quiz in the academic year.</p></div>
          {activeQuizzes.length > 0 && <span className="rounded-full bg-[#f0ebff] px-3 py-1 text-xs font-extrabold text-[#6749af]">{activeQuizzes.length} {activeQuizzes.length === 1 ? "quiz" : "quizzes"}</span>}
          {canEdit && <form onSubmit={addQuiz} className="flex w-full flex-wrap gap-2 sm:w-auto"><input required maxLength={100} value={quizName} onChange={(event) => setQuizName(event.target.value)} placeholder="Quiz name" aria-label="Quiz name" className="min-w-0 flex-1 rounded-xl border border-[#e4ddf7] bg-[#fcfbff] px-3 py-2 text-sm sm:w-44 sm:flex-none" /><button disabled={!classroomId} className="inline-flex items-center gap-1.5 rounded-xl bg-[#694ab1] px-3 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-45"><BookOpenCheck size={15} />Add quiz</button></form>}
        </div>
        {!classroomId && <p className="px-5 py-6 text-sm text-slate-500">Select a class to manage its quizzes.</p>}
        {classroomId && loadedQuizScope === `${term}:${classroomId}` && activeQuizzes.length === 0 && <div className="px-5 py-8 text-center"><ClipboardList size={26} className="mx-auto text-[#ab9bd2]" /><p className="mt-2 text-sm font-bold text-[#4c3b79]">No quizzes have been added yet</p><p className="mt-1 text-xs text-slate-500">Add a quiz above to start recording assignment scores.</p></div>}
        {classroomId && activeQuizzes.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead className="bg-[#f5f2ff] text-[11px] font-extrabold uppercase tracking-wide text-[#594b82]"><tr><th className="px-4 py-3">Student</th>{activeQuizzes.map((quiz) => <th key={quiz.id} className="px-4 py-3">{quiz.name}</th>)}<th className="px-4 py-3"><span className="inline-flex items-center gap-1"><Trophy size={14} />Assignment average</span></th></tr></thead><tbody>{classRows.map((row, index) => <tr key={row.id} className={`border-t border-[#eeeaf7] ${index % 2 ? "bg-[#fcfbff]" : ""}`}><td className="px-4 py-3 text-sm font-extrabold text-[#352961]">{row.name}</td>{activeQuizzes.map((quiz) => { const key = `${row.id}:${quiz.id}`; const stored = row.quiz_scores?.find((item) => item.quiz_id === quiz.id)?.score; return <td key={quiz.id} className="px-4 py-3"><input type="number" min={0} max={100} value={quizValues[key] ?? (stored === undefined ? "" : String(stored))} aria-label={`${quiz.name} score for ${row.name}`} disabled={!canEdit || Boolean(row.published_at)} onChange={(event) => setQuizValues((values) => ({ ...values, [key]: event.target.value }))} className="w-20 rounded-lg border border-[#e3def3] bg-white px-2.5 py-2 text-sm font-bold text-[#352961] outline-none focus:border-[#9b87cf] focus:ring-2 focus:ring-[#eee8ff] disabled:bg-slate-100" /></td>; })}<td className="px-4 py-3"><span className="inline-flex min-w-24 justify-center rounded-full bg-[#eee9ff] px-3 py-1.5 text-sm font-extrabold tabular-nums text-[#583e9b]">{assignmentAverage(row) ?? "—"}</span></td></tr>)}</tbody></table></div>}
        {canEdit && activeQuizzes.length > 0 && <div className="flex justify-end border-t border-[#eeeaf7] bg-[#fcfbff] px-4 py-3 sm:px-5"><button onClick={() => void saveQuizScores()} disabled={!classRows.length || classRows.some((row) => Boolean(row.published_at))} className="inline-flex items-center gap-2 rounded-xl bg-[#694ab1] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#573a9b] disabled:cursor-not-allowed disabled:opacity-45"><Save size={16} />Save quiz scores</button></div>}
      </section>

      {canManageWeights && <form onSubmit={saveWeights} className="relative mt-6 overflow-hidden rounded-[1.5rem] border border-[#d8e9e5] bg-gradient-to-br from-white via-white to-[#edf8f5] p-5 shadow-[0_12px_30px_rgba(34,116,100,.08)] sm:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-10 size-56 rounded-full bg-[#d4efe8]/70 blur-2xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-[#d9f1eb] text-[#218573]"><Scale size={23} /></span>
            <div className="mr-auto"><h2 className="text-lg font-extrabold text-[#174c48] sm:text-xl">Assessment weights for term {term}</h2><p className="mt-0.5 text-xs text-slate-500">Weights apply to every class in this term and must total 100%.</p></div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{SKILLS.map((skill) => {
            const Icon = skill === "Participation" ? UsersRound : skill === "Assignment" ? ClipboardList : skill === "Mid Term Test" ? FileText : Trophy;
            return <label key={skill} className="rounded-2xl border border-[#e0ece9] bg-white/90 p-3 text-xs font-bold text-[#365b58] shadow-sm"><span>{skill} (%)</span><span className="mt-2 flex items-center gap-2 rounded-xl border border-[#e4eeec] bg-[#fbfefd] px-3"><Icon size={16} className="shrink-0 text-[#6ca99d]" /><input type="number" min={0} max={100} required value={weights[skill]} onChange={(event) => setWeights((current) => ({ ...current, [skill]: Number(event.target.value) }))} className="w-full bg-transparent py-2 text-sm font-extrabold text-[#244b48] outline-none" /></span></label>;
          })}</div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-extrabold ${totalWeight === 100 ? "bg-[#dcf3e9] text-[#20744f]" : "bg-[#fff0d6] text-[#9a6508]"}`}>{totalWeight === 100 ? <Check size={16} /> : <Scale size={16} />}Total: {totalWeight}%</p>
            <button disabled={totalWeight !== 100} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#237c72] to-[#145f61] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-900/15 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"><Save size={16} />Save weights</button>
          </div>
        </div>
      </form>}
    </>
  );
}
