"use client";
import { useEffect, useState } from "react";
import { api, logout, session, STUDENT_SECTORS } from "@/lib/api";
import { FormModal } from "@/components/AppModal";
import { PasswordInput } from "@/components/PasswordInput";

type AccountProfile = { name: string; email: string };
type StudentProfile = { id: number; name: string; gender?: string | null; birth_date?: string | null; school_name?: string | null; school_class?: string | null; sector?: string | null; phone?: string | null; guardian_phone?: string | null; guardian_relation?: string | null };
type StudentField = keyof Omit<StudentProfile, "id">;

export default function Akun() {
  const role = session()?.role;
  const [profile, setProfile] = useState<AccountProfile>({ name: "", email: "" });
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [f, setF] = useState({ current_password: "", password: "", password_confirmation: "" });
  const [open, setOpen] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const c = "mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5";

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
      <h1 className="mt-8 text-3xl font-extrabold">Account</h1>
      {role === "teacher" && <section className="mt-6 border-b border-[var(--line)] pb-6"><h2 className="text-xl font-extrabold">Teacher profile</h2><form onSubmit={saveProfile} className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Name<input required maxLength={100} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} className={c} /></label><label className="text-sm font-semibold">Email<input required type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} className={c} /></label><button className="w-fit rounded-xl bg-[var(--ink)] px-4 py-2.5 font-semibold text-white sm:col-span-2">Save profile</button></form></section>}
      {role === "parent" && <section className="mt-6"><h2 className="text-xl font-extrabold">Child information</h2>{students.length === 0 && <p className="mt-3 opacity-70">No student records are linked to this account.</p>}{students.map((student) => <form key={student.id} onSubmit={(event) => void saveStudent(event, student)} className="grid gap-4 border-b border-[var(--line)] py-5 sm:grid-cols-2"><label className="text-sm font-semibold">Full name<input required maxLength={100} value={student.name} onChange={(event) => updateStudent(student.id, "name", event.target.value)} className={c} /></label><label className="text-sm font-semibold">Date of birth<input type="date" value={student.birth_date ?? ""} onChange={(event) => updateStudent(student.id, "birth_date", event.target.value)} className={c} /></label><label className="text-sm font-semibold">Gender<select value={student.gender ?? ""} onChange={(event) => updateStudent(student.id, "gender", event.target.value)} className={c}><option value="">Not provided</option><option value="male">Male</option><option value="female">Female</option></select></label><label className="text-sm font-semibold">School name<input value={student.school_name ?? ""} onChange={(event) => updateStudent(student.id, "school_name", event.target.value)} className={c} /></label><label className="text-sm font-semibold">School class<input value={student.school_class ?? ""} onChange={(event) => updateStudent(student.id, "school_class", event.target.value)} className={c} placeholder="1SD, 1SMP" /></label><label className="text-sm font-semibold">Sector<select value={student.sector ?? ""} onChange={(event) => updateStudent(student.id, "sector", event.target.value)} className={c}><option value="">Select sector</option>{STUDENT_SECTORS.map((sector) => <option key={sector} value={sector}>{sector}</option>)}</select></label><label className="text-sm font-semibold">Student phone<input value={student.phone ?? ""} onChange={(event) => updateStudent(student.id, "phone", event.target.value)} className={c} /></label><label className="text-sm font-semibold">Parent/guardian phone<input value={student.guardian_phone ?? ""} onChange={(event) => updateStudent(student.id, "guardian_phone", event.target.value)} className={c} /></label><label className="text-sm font-semibold">Guardian relationship<input value={student.guardian_relation ?? ""} onChange={(event) => updateStudent(student.id, "guardian_relation", event.target.value)} className={c} /></label><button className="w-fit rounded-xl bg-[var(--ink)] px-4 py-2.5 font-semibold text-white sm:col-span-2">Save student information</button></form>)}</section>}
      <section className="mt-6"><h2 className="text-xl font-extrabold">Account security</h2>
      <button onClick={() => setOpen(true)} className="mt-6 rounded-xl bg-[var(--ink)] px-5 py-3 font-semibold text-white">Change password</button>
      </section>
      <FormModal open={open} title="Change password" formId="change-password" confirmLabel="Save password" onClose={() => setOpen(false)}>
      <form id="change-password" onSubmit={submit} className="grid gap-4">
        <label className="block text-sm font-semibold">Current password<PasswordInput required value={f.current_password} onChange={set("current_password")} className={c} autoComplete="current-password" /></label>
        <label className="mt-4 block text-sm font-semibold">New password (at least 8 characters)<PasswordInput required minLength={8} value={f.password} onChange={set("password")} className={c} autoComplete="new-password" /></label>
        <label className="mt-4 block text-sm font-semibold">Confirm new password<PasswordInput required minLength={8} value={f.password_confirmation} onChange={set("password_confirmation")} className={c} autoComplete="new-password" /></label>
      </form>
      </FormModal>
    </>
  );
}
