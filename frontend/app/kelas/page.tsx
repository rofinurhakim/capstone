"use client";

import { useCallback, useEffect, useState } from "react";
import { AcademicYear, academicYearLabel, api, BEC_LEVELS, CURRENT_TERM } from "@/lib/api";
import { ConfirmModal, FormModal } from "@/components/AppModal";
import { PasswordInput } from "@/components/PasswordInput";

type Classroom = { id: number; name: string; term: string; teacher_id?: number | null; teacher?: { id: number; name: string } | null; teachers?: { id: number; name: string }[] };
type Teacher = { id: number; name: string; email?: string; is_academic_admin?: boolean; is_admin?: boolean };
type Theme = { id: number; theme: string; position: number };

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

  const input = "rounded-lg border border-[var(--line)] bg-white px-3 py-2";
  return (
    <>
      <h1 className="mt-8 text-3xl font-extrabold">Classes and academic years</h1>
      <p className="mt-2 opacity-70">Manage classes before registering or transferring students.</p>
      <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => setCreateOpen(true)} className="rounded-xl bg-[var(--ink)] px-4 py-2 font-semibold text-white">Add class</button><button onClick={() => { const next = Number(terms[0] ?? CURRENT_TERM) + 1; setPeriodStart(`${next}-08-01`); setPeriodEnd(`${next + 1}-05-31`); setAcademicYearOpen(true); }} className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 font-semibold">Add academic period</button><button onClick={() => setTeacherOpen(true)} className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 font-semibold">Add teacher</button></div>
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
      <label className="mt-6 block text-sm font-semibold">Show academic period<select value={term} onChange={(e) => setTerm(e.target.value)} className={`${input} ml-2`}>{terms.map((item) => <option key={item} value={item}>{academicYearLabel(item, academicYears)}</option>)}</select></label>
      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5"><h2 className="text-xl font-extrabold">Teachers</h2><div className="mt-3 space-y-2">{teachers.map((teacher) => <div key={teacher.id} className="rounded-xl bg-[var(--paper)] px-3 py-2"><div className="flex flex-wrap items-center gap-2"><span className="mr-auto font-semibold">{teacher.name}<small className="ml-2 font-normal opacity-60">{teacher.email}</small>{teacher.is_academic_admin && <small className="ml-2 rounded bg-[var(--mint)] px-2 py-1 text-white">Academic Admin</small>}{teacher.is_admin && <small className="ml-2 rounded bg-[var(--ink)] px-2 py-1 text-white">Admin</small>}</span><button onClick={() => { setTeacherTarget(teacher); setTeacherForm({ name: teacher.name, email: teacher.email ?? "", password: "", password_confirmation: "", additional_role: teacher.is_admin ? "admin" : teacher.is_academic_admin ? "academic_admin" : "none" }); setTeacherOpen(true); }} className="rounded-lg border border-[var(--line)] px-2 py-1 text-sm font-semibold">Edit</button><button onClick={() => setResetTeacherTarget(teacher)} className="rounded-lg border border-[var(--line)] px-2 py-1 text-sm font-semibold">Reset password</button><button onClick={() => setDeleteTeacherTarget(teacher)} className="rounded-lg border border-[var(--coral)] px-2 py-1 text-sm font-semibold text-[var(--coral)]">Delete</button></div>{temporaryPasswords[teacher.id] && <p role="status" className="mt-2 text-sm font-semibold text-[var(--mint)]">Temporary password (share securely): {temporaryPasswords[teacher.id]}</p>}</div>)}</div></section>
      <ul className="mt-4 space-y-3">{rows.map((row) => <li key={row.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-4"><span className="mr-auto font-semibold">{row.name}<small className="ml-2 font-normal opacity-60">{academicYearLabel(row.term, academicYears)}</small></span><span className="text-sm opacity-70">Teachers: {row.teachers?.map((teacher) => teacher.name).join(", ") || row.teacher?.name || "Unassigned"}</span><button onClick={() => { setAssignTarget(row); setAssignTeacherIds(row.teachers?.map((teacher) => teacher.id) ?? (row.teacher_id ? [row.teacher_id] : [])); }} className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-semibold">Assign teachers</button></li>)}</ul>
      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5"><h2 className="text-xl font-extrabold">Learning themes</h2><label className="mt-3 block text-sm font-semibold">Class<select value={themeClassroomId} onChange={(e) => setThemeClassroomId(e.target.value)} className={`${input} ml-2`}><option value="">Select a class</option>{rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>{themeClassroomId && <><form onSubmit={addTheme} className="mt-4 flex flex-wrap gap-2"><input required value={theme} onChange={(e) => setTheme(e.target.value)} className={`${input} min-w-64 flex-1`} placeholder="e.g. Greetings, Numbers, Subject Pronouns" /><button className="rounded-xl bg-[var(--ink)] px-4 py-2 font-semibold text-white">Add theme</button></form><ul className="mt-3 space-y-2">{themes.map((item) => <li key={item.id} className="flex items-center gap-2 rounded-lg bg-[var(--paper)] px-3 py-2"><span className="mr-auto">{item.theme}</span><button onClick={() => void removeTheme(item.id)} className="text-sm font-semibold text-[var(--coral)]">Delete</button></li>)}</ul></>}</section>
      <ConfirmModal open={deleteTeacherTarget !== null} title="Delete teacher?" message={`The account for ${deleteTeacherTarget?.name ?? "this teacher"} will be deleted and their class assignments will be cleared.`} confirmLabel="Delete teacher" tone="danger" onClose={() => setDeleteTeacherTarget(null)} onConfirm={deleteTeacher} />
      <ConfirmModal open={resetTeacherTarget !== null} title="Reset teacher password?" message={`Create a new temporary password for ${resetTeacherTarget?.name ?? "this teacher"}? The current password will stop working and all their existing sessions will be signed out.`} confirmLabel="Reset password" onClose={() => setResetTeacherTarget(null)} onConfirm={resetTeacherPassword} />
    </>
  );
}