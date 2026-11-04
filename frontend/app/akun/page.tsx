"use client";
import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, ChevronRight, GraduationCap, KeyRound, Mail, School, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { api, logout, session, STUDENT_SECTORS } from "@/lib/api";
import { PasswordInput } from "@/components/PasswordInput";

type AccountProfile = { name: string; email: string };
type StudentProfile = { id: number; name: string; gender?: string | null; birth_date?: string | null; school_name?: string | null; school_class?: string | null; sector?: string | null; phone?: string | null; guardian_phone?: string | null; guardian_relation?: string | null };
type StudentField = keyof Omit<StudentProfile, "id">;

export default function Akun() {
  const role = session()?.role;
  const [profile, setProfile] = useState<AccountProfile>({ name: "", email: "" });
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [f, setF] = useState({ current_password: "", password: "", password_confirmation: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const c = "mt-1.5 w-full rounded-xl border border-[#dce5f7] bg-white px-3 py-2.5 text-sm font-medium text-[#263d68] outline-none transition focus:border-[#7599e6] focus:ring-2 focus:ring-[#e5edff]";
  const fieldLabel = "block text-xs font-bold text-[#42577f]";

  useEffect(() => {
    if (role === "teacher") void api<AccountProfile>("/account/profile", { name: "", email: "" }).then(setProfile);
    if (role === "parent") void api<StudentProfile[]>("/my-students", []).then(setStudents);
  }, [role]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    const result = await api<AccountProfile>("/account/profile", { name: "", email: "" }, { method: "PATCH", body: JSON.stringify(profile) }, "Profile updated successfully.");
    if (result.name) {
      setProfile(result);
      const current = session();
      if (current) localStorage.setItem("session", JSON.stringify({ ...current, name: result.name }));
    }
  }

  function updateStudent(id: number, field: StudentField, value: string) {
    setStudents((items) => items.map((student) => student.id === id ? { ...student, [field]: value } : student));
  }

  async function saveStudent(event: React.FormEvent, student: StudentProfile) {
    event.preventDefault();
    const result = await api<StudentProfile>(`/my-students/${student.id}`, {} as StudentProfile, { method: "PATCH", body: JSON.stringify(student) }, "Student information updated successfully.");
    if (result.id) {
      setStudents((items) => items.map((item) => item.id === result.id ? result : item));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await api<{ ok?: boolean }>("/password", {}, { method: "POST", body: JSON.stringify(f) });
    if (r.ok) logout("/login?password-changed=1");
  }
  return (
    <>
      <section className="relative mt-3 overflow-hidden rounded-[1.75rem] border border-[#dbe5ff] bg-gradient-to-br from-[#eef3ff] via-white to-[#e6efff] p-5 shadow-[0_16px_38px_rgba(50,87,166,.1)] sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full bg-[#dbe7ff]/70 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#4d83e5] to-[#3162c3] text-white shadow-md shadow-blue-900/15"><UserRound size={26} /></span>
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#dce6ff] bg-white/80 px-3 py-1 text-xs font-bold text-[#416199]"><GraduationCap size={14} /><span>Academic</span><ChevronRight size={13} /><span>Account</span></div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#172d59] sm:text-4xl">Account settings</h1>
            <p className="mt-1 text-sm text-[#52678f]">Manage your profile, linked student information, and account security.</p>
          </div>
        </div>
      </section>

      <div className="mt-5 grid items-start gap-4 xl:grid-cols-2">
        {role === "teacher" && <section className="overflow-hidden rounded-[1.5rem] border border-[#dce5f7] bg-white shadow-[0_12px_30px_rgba(32,58,112,.08)]">
          <div className="flex items-center gap-2 border-b border-[#e5ebf8] bg-[#f0f4ff] px-5 py-3"><UserRound size={17} className="text-[#3975db]" /><div><h2 className="text-sm font-extrabold text-[#1b3567]">Teacher profile</h2><p className="text-xs text-[#7182a3]">Update your name and sign-in email.</p></div></div>
          <form onSubmit={saveProfile} className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <label className={fieldLabel}>Name<input required maxLength={100} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} className={c} /></label>
            <label className={fieldLabel}>Email<span className="relative mt-1.5 block"><Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8193b2]" /><input required type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} className={`${c} pl-9`} /></span></label>
            <div className="flex justify-end border-t border-[#e8edf7] pt-3 sm:col-span-2"><button className="rounded-xl bg-gradient-to-r from-[#315ca6] to-[#24457f] px-4 py-2.5 text-sm font-bold text-white shadow-sm">Save profile</button></div>
          </form>
        </section>}

        {role === "parent" && <section className="xl:col-span-2">
          <div className="mb-3 flex items-center gap-2.5 rounded-2xl border border-[#dce5f7] bg-white/80 px-4 py-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#edf3ff] text-[#3975db]"><UsersRound size={19} /></span>
            <div><h2 className="text-sm font-extrabold text-[#1b3567]">Child information</h2><p className="text-xs text-[#7182a3]">Review and update your child&apos;s profile information.</p></div>
            <span className="ml-auto rounded-full bg-[#edf3ff] px-3 py-1 text-[11px] font-bold text-[#315ca6]">{students.length} {students.length === 1 ? "student" : "students"}</span>
          </div>
          {students.length === 0 && <div className="rounded-2xl border border-dashed border-[#dce5f7] bg-white p-8 text-center text-sm text-[#7182a3]">No student records are linked to this account.</div>}
          <div className="grid items-start gap-4 lg:grid-cols-2">{students.map((student) => <form key={student.id} onSubmit={(event) => void saveStudent(event, student)} className="overflow-hidden rounded-[1.5rem] border border-[#dce5f7] bg-white shadow-[0_12px_30px_rgba(32,58,112,.08)]">
            <header className="relative overflow-hidden border-b border-[#e5ebf8] bg-gradient-to-br from-[#eef3ff] via-white to-[#e6efff] p-4 sm:p-5">
              <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-14 size-40 rounded-full bg-[#dbe7ff]/70 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#4d83e5] to-[#3162c3] text-white shadow-sm"><BookOpen size={20} /></span>
                <div className="min-w-0"><h3 className="truncate text-base font-extrabold text-[#1b3567]">{student.name}</h3><p className="text-xs text-[#7182a3]">Student profile · ID #{student.id}</p></div>
                <span className="ml-auto hidden items-center gap-1 rounded-full border border-[#dce6ff] bg-white/80 px-2.5 py-1 text-[10px] font-bold text-[#416199] sm:inline-flex"><UserRound size={12} />Profile</span>
              </div>
            </header>
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <div className="flex items-center gap-2 border-b border-[#edf1f8] pb-2 sm:col-span-2"><UserRound size={15} className="text-[#3975db]" /><p className="text-xs font-extrabold uppercase tracking-wide text-[#52678f]">Personal information</p></div>
              <label className={fieldLabel}>Full name<input required maxLength={100} value={student.name} onChange={(event) => updateStudent(student.id, "name", event.target.value)} className={c} /></label>
              <label className={fieldLabel}><span className="inline-flex items-center gap-1"><CalendarDays size={13} />Date of birth</span><input type="date" value={student.birth_date ?? ""} onChange={(event) => updateStudent(student.id, "birth_date", event.target.value)} className={c} /></label>
              <label className={fieldLabel}>Gender<select value={student.gender ?? ""} onChange={(event) => updateStudent(student.id, "gender", event.target.value)} className={c}><option value="">Not provided</option><option value="male">Male</option><option value="female">Female</option></select></label>
              <label className={fieldLabel}>Student phone<input value={student.phone ?? ""} onChange={(event) => updateStudent(student.id, "phone", event.target.value)} className={c} inputMode="tel" /></label>
              <div className="flex items-center gap-2 border-b border-[#edf1f8] pb-2 sm:col-span-2"><School size={15} className="text-[#3975db]" /><p className="text-xs font-extrabold uppercase tracking-wide text-[#52678f]">School information</p></div>
              <label className={fieldLabel}>School name<input value={student.school_name ?? ""} onChange={(event) => updateStudent(student.id, "school_name", event.target.value)} className={c} /></label>
              <label className={fieldLabel}>School class<input value={student.school_class ?? ""} onChange={(event) => updateStudent(student.id, "school_class", event.target.value)} className={c} placeholder="1SD, 1SMP" /></label>
              <label className={fieldLabel}>Sector<select value={student.sector ?? ""} onChange={(event) => updateStudent(student.id, "sector", event.target.value)} className={c}><option value="">Select sector</option>{STUDENT_SECTORS.map((sector) => <option key={sector} value={sector}>{sector}</option>)}</select></label>
              <label className={fieldLabel}>Parent/guardian phone<input value={student.guardian_phone ?? ""} onChange={(event) => updateStudent(student.id, "guardian_phone", event.target.value)} className={c} inputMode="tel" /></label>
              <label className={`${fieldLabel} sm:col-span-2`}>Guardian relationship<input value={student.guardian_relation ?? ""} onChange={(event) => updateStudent(student.id, "guardian_relation", event.target.value)} className={c} /></label>
              <div className="flex justify-end border-t border-[#e8edf7] pt-3 sm:col-span-2"><button className="rounded-xl bg-gradient-to-r from-[#315ca6] to-[#24457f] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110">Save student information</button></div>
            </div>
          </form>)}</div>
        </section>}

        <section className="overflow-hidden rounded-[1.5rem] border border-[#dce5f7] bg-white shadow-[0_12px_30px_rgba(32,58,112,.08)]">
          <div className="flex items-center gap-2 border-b border-[#e5ebf8] bg-[#f0f4ff] px-5 py-3"><ShieldCheck size={18} className="text-[#3975db]" /><div><h2 className="text-sm font-extrabold text-[#1b3567]">Account security</h2><p className="text-xs text-[#7182a3]">Change your password to keep your account secure.</p></div></div>
          <form id="change-password" onSubmit={submit} className="grid gap-4 p-4 sm:p-5">
            <label className={fieldLabel}>Current password<PasswordInput required value={f.current_password} onChange={set("current_password")} className={c} autoComplete="current-password" /></label>
            <label className={fieldLabel}>New password (at least 8 characters)<PasswordInput required minLength={8} value={f.password} onChange={set("password")} className={c} autoComplete="new-password" /></label>
            <label className={fieldLabel}>Confirm new password<PasswordInput required minLength={8} value={f.password_confirmation} onChange={set("password_confirmation")} className={c} autoComplete="new-password" /></label>
            <div className="flex items-center justify-between gap-3 border-t border-[#e8edf7] pt-3"><p className="flex items-center gap-1.5 text-[11px] text-[#7182a3]"><KeyRound size={14} />You&apos;ll need to sign in again after changing it.</p><button className="shrink-0 rounded-xl bg-gradient-to-r from-[#315ca6] to-[#24457f] px-4 py-2.5 text-sm font-bold text-white shadow-sm">Change password</button></div>
          </form>
        </section>
      </div>
    </>
  );
}
