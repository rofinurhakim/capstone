"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, BookOpen, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, GraduationCap, Layers3, Plus, Star, Trash2, UsersRound } from "lucide-react";
import { AcademicYear, academicYearLabel, api, BEC_LEVELS, CURRENT_TERM } from "@/lib/api";
import { ConfirmModal, FormModal } from "@/components/AppModal";
import { PasswordInput } from "@/components/PasswordInput";

type Classroom = { id: number; name: string; term: string; teacher_id?: number | null; teacher?: { id: number; name: string } | null; teachers?: { id: number; name: string }[] };
type Teacher = { id: number; name: string; email?: string; is_academic_admin?: boolean; is_admin?: boolean };
type Theme = { id: number; theme: string; position: number };
const PAGE_SIZE = 5;

function Pagination({ page, pages, total, noun, onPageChange }: { page: number; pages: number; total: number; noun: string; onPageChange: (page: number) => void }) {
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  return <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-3 text-[11px] font-medium text-[#7182a3]">
    <span>Showing {first}–{last} of {total} {noun}</span>
    {pages > 1 && <div className="flex items-center gap-1">
      <button aria-label={`Previous ${noun} page`} disabled={page === 1} onClick={() => onPageChange(page - 1)} className="grid size-7 place-items-center rounded-lg border border-[#dce5f7] bg-white text-[#315ca6] disabled:opacity-40"><ChevronLeft size={15} /></button>
      {Array.from({ length: pages }, (_, index) => index + 1).map((pageNumber) => <button key={pageNumber} aria-label={`${noun} page ${pageNumber}`} aria-current={pageNumber === page ? "page" : undefined} onClick={() => onPageChange(pageNumber)} className={`grid size-7 place-items-center rounded-lg border text-[11px] font-bold ${pageNumber === page ? "border-[#172d68] bg-[#172d68] text-white" : "border-[#dce5f7] bg-white text-[#315ca6]"}`}>{pageNumber}</button>)}
      <button aria-label={`Next ${noun} page`} disabled={page === pages} onClick={() => onPageChange(page + 1)} className="grid size-7 place-items-center rounded-lg border border-[#dce5f7] bg-white text-[#315ca6] disabled:opacity-40"><ChevronRight size={15} /></button>
    </div>}
  </div>;
}

export default function Kelas() {
  const [rows, setRows] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [terms, setTerms] = useState<string[]>([CURRENT_TERM]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [term, setTerm] = useState(CURRENT_TERM);
  const [form, setForm] = useState({ name: "", term: CURRENT_TERM, teacher_ids: [] as number[] });
  const [createOpen, setCreateOpen] = useState(false);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [teacherTarget, setTeacherTarget] = useState<Teacher | null>(null);
  const [deleteTeacherTarget, setDeleteTeacherTarget] = useState<Teacher | null>(null);
  const [resetTeacherTarget, setResetTeacherTarget] = useState<Teacher | null>(null);
  const [temporaryPasswords, setTemporaryPasswords] = useState<Record<number, string>>({});
  const [assignTarget, setAssignTarget] = useState<Classroom | null>(null);
  const [assignTeacherIds, setAssignTeacherIds] = useState<number[]>([]);
  const [teacherForm, setTeacherForm] = useState({ name: "", email: "", password: "", password_confirmation: "", additional_role: "none" });
  const [academicYearOpen, setAcademicYearOpen] = useState(false);
  const [periodStart, setPeriodStart] = useState(`${Number(CURRENT_TERM) + 1}-08-01`);
  const [periodEnd, setPeriodEnd] = useState(`${Number(CURRENT_TERM) + 2}-05-31`);
  const [themeClassroomId, setThemeClassroomId] = useState("");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [theme, setTheme] = useState("");
  const [teacherPage, setTeacherPage] = useState(1);
  const [classPage, setClassPage] = useState(1);
  const [sectionFilter, setSectionFilter] = useState("all");
  const load = useCallback(() => { void api<Classroom[]>(`/classrooms?term=${encodeURIComponent(term)}`, []).then(setRows); }, [term]);
  useEffect(() => {
    load();
    void api("/teachers", []).then(setTeachers);
    void api<AcademicYear[]>("/academic-years", []).then((items) => {
      setAcademicYears(items);
      const years = items.map((item) => item.term);
      setTerms(years.length ? years : [CURRENT_TERM]);
      setForm((current) => years.includes(current.term) ? current : { ...current, term: years[0] ?? CURRENT_TERM });
    });
  }, [load]);
  useEffect(() => { if (themeClassroomId) void api<Theme[]>(`/themes?classroom_id=${themeClassroomId}&term=${encodeURIComponent(term)}`, []).then(setThemes); }, [themeClassroomId, term]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const result = await api<Classroom>("/classrooms", { id: 0, name: "", term: "" }, { method: "POST", body: JSON.stringify(form) }, "Class created successfully.");
    if (result.id) { setForm({ name: "", term, teacher_ids: [] }); setCreateOpen(false); load(); }
  }

  async function createTeacher(e: React.FormEvent) {
    e.preventDefault();
    const result = await api<{ id?: number }>(teacherTarget ? `/teachers/${teacherTarget.id}` : "/teachers", {}, { method: teacherTarget ? "PATCH" : "POST", body: JSON.stringify(teacherTarget ? { name: teacherForm.name, email: teacherForm.email, additional_role: teacherForm.additional_role } : teacherForm) }, teacherTarget ? "Teacher details updated." : "Teacher account created.");
    if (result.id) { setTeacherForm({ name: "", email: "", password: "", password_confirmation: "", additional_role: "none" }); setTeacherTarget(null); setTeacherOpen(false); void api("/teachers", []).then(setTeachers); }
  }

  async function addAcademicYear(event: React.FormEvent) {
    event.preventDefault();
    const result = await api<AcademicYear>("/academic-years", {} as AcademicYear, { method: "POST", body: JSON.stringify({ start_date: periodStart, end_date: periodEnd }) }, "Academic year added.");
    if (result.term) {
      setTerms((items) => [...new Set([result.term!, ...items])].sort((a, b) => b.localeCompare(a)));
      setAcademicYears((items) => [...items, result].sort((a, b) => b.term.localeCompare(a.term)));
      setTerm(result.term);
      setForm((current) => ({ ...current, term: result.term! }));
      setPeriodStart(`${Number(result.term) + 1}-08-01`);
      setPeriodEnd(`${Number(result.term) + 2}-05-31`);
      setAcademicYearOpen(false);
    }
  }

  async function deleteTeacher() { if (!deleteTeacherTarget) return; const result = await api<{ ok?: boolean }>(`/teachers/${deleteTeacherTarget.id}`, {}, { method: "DELETE" }, "Teacher account deleted."); if (result.ok) { setDeleteTeacherTarget(null); void api("/teachers", []).then(setTeachers); load(); } }
  async function resetTeacherPassword() {
    if (!resetTeacherTarget) return;
    const teacher = resetTeacherTarget;
    const result = await api<{ password?: string }>(`/teachers/${teacher.id}/reset-password`, {}, { method: "POST" }, "Teacher password reset. Their existing sessions have been signed out.");
    if (result.password) {
      setTemporaryPasswords((items) => ({ ...items, [teacher.id]: result.password! }));
      setResetTeacherTarget(null);
    }
  }
  async function addTheme(event: React.FormEvent) { event.preventDefault(); if (!themeClassroomId || !theme.trim()) return; const result = await api<Theme>("/themes", {} as Theme, { method: "POST", body: JSON.stringify({ classroom_id: Number(themeClassroomId), term, theme, position: themes.length + 1 }) }, "Learning theme added."); if (result.id) { setThemes((items) => [...items, result]); setTheme(""); } }
  async function removeTheme(id: number) { const result = await api<{ ok?: boolean }>(`/themes/${id}`, {}, { method: "DELETE" }, "Learning theme deleted."); if (result.ok) setThemes((items) => items.filter((item) => item.id !== id)); }

  async function assignTeacher(e: React.FormEvent) {
    e.preventDefault();
    if (!assignTarget) return;
    const result = await api<Classroom>(`/classrooms/${assignTarget.id}`, assignTarget, { method: "PATCH", body: JSON.stringify({ name: assignTarget.name, term: assignTarget.term, teacher_ids: assignTeacherIds }) }, "Class teacher assignment updated.");
    if (result.id) { setAssignTarget(null); load(); }
  }

  const filteredRows = sectionFilter === "all" ? rows : rows.filter((row) => row.name === sectionFilter);
  const teacherPages = Math.max(1, Math.ceil(teachers.length / PAGE_SIZE));
  const classPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleTeachers = teachers.slice((teacherPage - 1) * PAGE_SIZE, teacherPage * PAGE_SIZE);
  const visibleClasses = filteredRows.slice((classPage - 1) * PAGE_SIZE, classPage * PAGE_SIZE);
  const input = "rounded-xl border border-[#dce5f7] bg-white px-3 py-2.5 text-sm font-medium text-[#263d68] outline-none focus:border-[#7599e6] focus:ring-2 focus:ring-[#e5edff]";
  const actionButton = "rounded-xl border border-[#cbdaf7] bg-white px-2.5 py-1.5 text-xs font-bold text-[#315ca6] transition hover:bg-[#f4f7ff]";
  return (
    <>
      <section className="relative mt-3 overflow-hidden rounded-[1.75rem] border border-[#dbe5ff] bg-gradient-to-br from-[#eef3ff] via-white to-[#e6efff] p-5 shadow-[0_16px_38px_rgba(50,87,166,.1)] sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full bg-[#dbe7ff]/70 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#4d83e5] to-[#3162c3] text-white shadow-md shadow-blue-900/15"><UsersRound size={26} /></span>
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#dce6ff] bg-white/80 px-3 py-1 text-xs font-bold text-[#416199]"><GraduationCap size={14} /><span>Academic</span><ChevronRight size={13} /><span>Classes and academic years</span></div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#172d59] sm:text-4xl">Classes and academic years</h1>
            <p className="mt-1 text-sm text-[#52678f]">Manage classes, academic years, and their assigned teachers.</p>
          </div>
        </div>
      </section>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button onClick={() => { setSectionFilter("all"); setClassPage(1); }} className={`rounded-xl px-4 py-2 text-xs font-bold ${sectionFilter === "all" ? "bg-[#172d68] text-white shadow-sm" : "border border-[#dce5f7] bg-white text-[#52678f]"}`}>All Classes</button>
        <label className="relative inline-flex items-center gap-2 rounded-xl border border-[#dce5f7] bg-white px-3 py-1.5 text-[#315ca6]"><CalendarDays size={16} /><span className="sr-only">Academic year</span><select aria-label="Show academic period" value={term} onChange={(e) => { setTerm(e.target.value); setClassPage(1); }} className="appearance-none bg-transparent pr-5 text-xs font-bold text-[#263d68] outline-none">{terms.map((item) => <option key={item} value={item}>{academicYearLabel(item, academicYears)}</option>)}</select><ChevronDown size={14} className="pointer-events-none absolute right-3" /></label>
        <label className="relative inline-flex items-center gap-2 rounded-xl border border-[#dce5f7] bg-white px-3 py-1.5 text-[#315ca6]"><Layers3 size={16} /><span className="sr-only">Section filter</span><select aria-label="Section filter" value={sectionFilter} onChange={(e) => { setSectionFilter(e.target.value); setClassPage(1); }} className="appearance-none bg-transparent pr-5 text-xs font-bold text-[#263d68] outline-none"><option value="all">All Sections</option>{[...new Set(rows.map((row) => row.name))].sort().map((name) => <option key={name} value={name}>{name}</option>)}</select><ChevronDown size={14} className="pointer-events-none absolute right-3" /></label>
        <div className="ml-auto flex flex-wrap gap-2">
          <button onClick={() => { const next = Number(terms[0] ?? CURRENT_TERM) + 1; setPeriodStart(`${next}-08-01`); setPeriodEnd(`${next + 1}-05-31`); setAcademicYearOpen(true); }} className={`${actionButton} inline-flex items-center gap-1.5`}><Plus size={14} />Add academic period</button>
          <button onClick={() => setTeacherOpen(true)} className={`${actionButton} inline-flex items-center gap-1.5`}><Plus size={14} />Add teacher</button>
        </div>
      </div>
      <FormModal open={createOpen} title="Add class" formId="create-classroom" confirmLabel="Save class" onClose={() => setCreateOpen(false)}>
        <form id="create-classroom" onSubmit={create} className="grid gap-4"><label className="text-sm font-semibold">Level / class<select required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${input} mt-1 block w-full`}><option value="">Select a BEC level</option>{BEC_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}</select></label><label className="text-sm font-semibold">Academic period<select required value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} className={`${input} mt-1 block w-full`}>{terms.map((year) => <option key={year} value={year}>{academicYearLabel(year, academicYears)}</option>)}</select></label><fieldset className="grid gap-2"><legend className="text-sm font-semibold">Teachers (maximum 3)</legend>{teachers.map((teacher) => <label key={teacher.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.teacher_ids.includes(teacher.id)} disabled={!form.teacher_ids.includes(teacher.id) && form.teacher_ids.length >= 3} onChange={(event) => setForm((current) => ({ ...current, teacher_ids: event.target.checked ? [...current.teacher_ids, teacher.id] : current.teacher_ids.filter((id) => id !== teacher.id) }))} />{teacher.name}</label>)}</fieldset></form>
      </FormModal>
      <FormModal open={academicYearOpen} title="Add academic year" formId="create-academic-year" confirmLabel="Add year" onClose={() => setAcademicYearOpen(false)}>
        <form id="create-academic-year" onSubmit={addAcademicYear} className="grid gap-4"><p className="text-sm opacity-70">Choose the start and end dates for the academic period.</p><label className="text-sm font-semibold">Start date<input type="date" required value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} className={`${input} mt-1 block w-full`} /></label><label className="text-sm font-semibold">End date<input type="date" required min={periodStart} value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className={`${input} mt-1 block w-full`} /></label></form>
      </FormModal>
      <FormModal open={teacherOpen} title={teacherTarget ? "Edit teacher details" : "Add teacher"} formId="create-teacher" confirmLabel={teacherTarget ? "Save changes" : "Save teacher"} onClose={() => { setTeacherOpen(false); setTeacherTarget(null); }}>
        <form id="create-teacher" onSubmit={createTeacher} className="grid gap-4"><p className="text-sm opacity-70">Teacher accounts can also receive one additional role.</p><label className="text-sm font-semibold">Teacher name<input required value={teacherForm.name} onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })} className={`${input} mt-1 block w-full`} /></label><label className="text-sm font-semibold">Sign-in email<input required type="email" value={teacherForm.email} onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })} className={`${input} mt-1 block w-full`} /></label><label className="text-sm font-semibold">Additional role<select value={teacherForm.additional_role} onChange={(event) => setTeacherForm({ ...teacherForm, additional_role: event.target.value })} className={`${input} mt-1 block w-full`}><option value="none">Teacher only</option><option value="academic_admin">Academic Admin</option><option value="admin">Admin</option></select></label>{!teacherTarget && <><label className="text-sm font-semibold">Password<PasswordInput required minLength={8} value={teacherForm.password} onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })} className={`${input} mt-1 block w-full`} autoComplete="new-password" /></label><label className="text-sm font-semibold">Confirm password<PasswordInput required minLength={8} value={teacherForm.password_confirmation} onChange={(e) => setTeacherForm({ ...teacherForm, password_confirmation: e.target.value })} className={`${input} mt-1 block w-full`} autoComplete="new-password" /></label></>}</form>
      </FormModal>
      <FormModal open={assignTarget !== null} title="Assign class teacher" formId="assign-teacher" confirmLabel="Save assignment" onClose={() => setAssignTarget(null)}>
        <form id="assign-teacher" onSubmit={assignTeacher} className="grid gap-4"><p className="text-sm opacity-70">Choose up to three teachers for {assignTarget?.name}.</p>{teachers.map((teacher) => <label key={teacher.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={assignTeacherIds.includes(teacher.id)} disabled={!assignTeacherIds.includes(teacher.id) && assignTeacherIds.length >= 3} onChange={(event) => setAssignTeacherIds((ids) => event.target.checked ? [...ids, teacher.id] : ids.filter((id) => id !== teacher.id))} />{teacher.name}</label>)}</form>
      </FormModal>
      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-[1.5rem] border border-[#dce5f7] bg-white p-4 shadow-[0_12px_30px_rgba(32,58,112,.08)] sm:p-5">
          <div className="flex items-center gap-2 border-b border-[#e8edf7] pb-3"><GraduationCap size={20} className="text-[#172d68]" /><div><h2 className="font-extrabold text-[#1b3567]">Teachers</h2><p className="text-[11px] text-[#7182a3]">{teachers.length} teacher accounts</p></div></div>
          <div className="mt-3 space-y-2">{visibleTeachers.map((teacher) => <div key={teacher.id} className="rounded-2xl border border-[#e5ebf8] bg-white p-2.5 transition hover:bg-[#f8faff] sm:p-3"><div className="flex flex-wrap items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f0eaff] text-[#7954bd]"><BarChart3 size={17} /></span>
            <span className="mr-auto min-w-[110px] flex-1"><span className="block truncate text-xs font-extrabold text-[#24385d]">{teacher.name}</span><small className="block truncate text-[10px] text-[#7182a3]">{teacher.email}</small></span>
            {teacher.is_academic_admin && <small className="rounded-full bg-[#e7f7ed] px-2 py-1 text-[9px] font-bold text-[#24784a]">Academic Admin</small>}{teacher.is_admin && <small className="rounded-full bg-[#edf3ff] px-2 py-1 text-[9px] font-bold text-[#315ca6]">Admin</small>}
            <button onClick={() => { setTeacherTarget(teacher); setTeacherForm({ name: teacher.name, email: teacher.email ?? "", password: "", password_confirmation: "", additional_role: teacher.is_admin ? "admin" : teacher.is_academic_admin ? "academic_admin" : "none" }); setTeacherOpen(true); }} className={actionButton}>Edit</button>
            <button onClick={() => setResetTeacherTarget(teacher)} className={actionButton}>Reset password</button>
            <button onClick={() => setDeleteTeacherTarget(teacher)} aria-label={`Delete ${teacher.name}`} className="rounded-xl border border-[#ffc9c1] bg-white px-2.5 py-1.5 text-xs font-bold text-[#b8493d] hover:bg-[#fff3f1]"><Trash2 size={13} /></button>
          </div>{temporaryPasswords[teacher.id] && <p role="status" className="mt-2 rounded-lg bg-[#effaf4] px-2 py-1.5 text-[11px] font-semibold text-[#24784a]">Temporary password (share securely): {temporaryPasswords[teacher.id]}</p>}</div>)}
          {teachers.length === 0 && <p className="rounded-xl bg-[#f8faff] px-3 py-8 text-center text-sm text-[#7182a3]">No teachers found.</p>}</div>
          <Pagination page={teacherPage} pages={teacherPages} total={teachers.length} noun="teachers" onPageChange={setTeacherPage} />
        </section>
        <div className="grid gap-4">
          <section className="rounded-[1.5rem] border border-[#dce5f7] bg-white p-4 shadow-[0_12px_30px_rgba(32,58,112,.08)] sm:p-5">
            <div className="flex flex-wrap items-center gap-2 border-b border-[#e8edf7] pb-3"><Layers3 size={20} className="text-[#172d68]" /><div className="mr-auto"><h2 className="font-extrabold text-[#1b3567]">Class sections</h2><p className="text-[11px] text-[#7182a3]">{filteredRows.length} sections · {academicYearLabel(term, academicYears)}</p></div><button onClick={() => { setForm({ name: "", term, teacher_ids: [] }); setCreateOpen(true); }} className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#172d68] to-[#264b9a] px-3 py-2 text-xs font-bold text-white"><Plus size={14} />Add section</button></div>
            <div className="mt-3 space-y-2">{visibleClasses.map((row) => <div key={row.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#e5ebf8] p-2.5 transition hover:bg-[#f8faff] sm:p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#edf3ff] text-[#3975db]"><UsersRound size={17} /></span><span className="mr-auto min-w-[120px] flex-1"><span className="block text-xs font-extrabold text-[#24385d]">{row.name}</span><small className="block text-[10px] text-[#7182a3]">{academicYearLabel(row.term, academicYears)} · {row.teachers?.map((teacher) => teacher.name).join(", ") || row.teacher?.name || "Unassigned"}</small></span>
              <button onClick={() => { setAssignTarget(row); setAssignTeacherIds(row.teachers?.map((teacher) => teacher.id) ?? (row.teacher_id ? [row.teacher_id] : [])); }} className={actionButton}>Assign teachers</button>
            </div>)}
            {filteredRows.length === 0 && <p className="rounded-xl bg-[#f8faff] px-3 py-8 text-center text-sm text-[#7182a3]">No class sections found for this academic year.</p>}</div>
            <Pagination page={classPage} pages={classPages} total={filteredRows.length} noun="sections" onPageChange={setClassPage} />
          </section>
          <section className="rounded-[1.5rem] border border-[#dce5f7] bg-white p-4 shadow-[0_12px_30px_rgba(32,58,112,.08)] sm:p-5">
            <div className="flex items-center gap-2 border-b border-[#e8edf7] pb-3"><Star size={19} fill="currentColor" className="text-[#172d68]" /><div><h2 className="font-extrabold text-[#1b3567]">Learning themes</h2><p className="text-[11px] text-[#7182a3]">Themes shown on the student report card.</p></div></div>
            <label className="mt-3 block text-xs font-bold text-[#52678f]">Class<select aria-label="Class for learning themes" value={themeClassroomId} onChange={(e) => setThemeClassroomId(e.target.value)} className={`${input} mt-1.5 block w-full`}><option value="">Select a class</option>{rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            {themeClassroomId && <><form onSubmit={addTheme} className="mt-3 flex flex-wrap gap-2"><input aria-label="Learning theme" required value={theme} onChange={(e) => setTheme(e.target.value)} className={`${input} min-w-40 flex-1`} placeholder="e.g. Greetings, Numbers, Subject Pronouns" /><button className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#172d68] to-[#264b9a] px-3 py-2 text-xs font-bold text-white"><Plus size={14} />Add theme</button></form><ul className="mt-3 space-y-2">{themes.map((item) => <li key={item.id} className="flex items-center gap-2 rounded-xl border border-[#e5ebf8] px-3 py-2 text-xs"><BookOpen size={14} className="text-[#7954bd]" /><span className="mr-auto font-semibold text-[#34496e]">{item.theme}</span><button onClick={() => void removeTheme(item.id)} aria-label={`Delete ${item.theme}`} className="text-[#b8493d]"><Trash2 size={14} /></button></li>)}</ul>{themes.length === 0 && <p className="mt-3 text-xs text-[#7182a3]">No learning themes added for this class.</p>}</>}
          </section>
        </div>
      </div>
      <ConfirmModal open={deleteTeacherTarget !== null} title="Delete teacher?" message={`The account for ${deleteTeacherTarget?.name ?? "this teacher"} will be deleted and their class assignments will be cleared.`} confirmLabel="Delete teacher" tone="danger" onClose={() => setDeleteTeacherTarget(null)} onConfirm={deleteTeacher} />
      <ConfirmModal open={resetTeacherTarget !== null} title="Reset teacher password?" message={`Create a new temporary password for ${resetTeacherTarget?.name ?? "this teacher"}? The current password will stop working and all their existing sessions will be signed out.`} confirmLabel="Reset password" onClose={() => setResetTeacherTarget(null)} onConfirm={resetTeacherPassword} />
    </>
  );
}