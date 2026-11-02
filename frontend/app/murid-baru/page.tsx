"use client";
import { useEffect, useState } from "react";
import { AcademicYear, academicYearLabel, api, CURRENT_TERM } from "@/lib/api";
import { FormModal } from "@/components/AppModal";

type Res = { student?: { name: string; nis: string }; guardianPassword?: string | null };
const empty = { name: "", gender: "", birth_date: "", school_name: "", school_class: "", address: "", phone: "", guardian_phone: "", guardian_relation: "", guardian_name: "", guardian_email: "", term: CURRENT_TERM };

export default function MuridBaru() {
  const [f, setF] = useState(empty);
  const [terms, setTerms] = useState<string[]>([CURRENT_TERM]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [res, setRes] = useState<Res | null>(null);
  const [open, setOpen] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    void api<AcademicYear[]>("/academic-years", []).then((items) => {
      setAcademicYears(items);
      const years = items.map((item) => item.term);
      setTerms(years.length ? years : [CURRENT_TERM]);
      setF((current) => ({ ...current, term: years.includes(current.term) ? current.term : years[0] ?? CURRENT_TERM }));
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await api<Res>("/students", {}, { method: "POST", body: JSON.stringify(f) }, "Student registration completed.");
    if (r.student) { setRes(r); setF({ ...empty, term: f.term }); setOpen(false); }
  }
  const c = "mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5";
  return (
    <>
      <h1 className="mt-8 text-3xl font-extrabold">Register a new student</h1>
      <p className="mt-2 opacity-70">New students start at Matthew A and remain pending until the placement test is complete and Academic confirms their level.</p>
      {res?.student && (
        <div role="status" className="mt-6 rounded-2xl bg-[var(--mint)] p-4 font-semibold text-white">
          {res.student.name} was registered at Matthew A with student ID {res.student.nis}. The enrollment is pending academic confirmation.
          {res.guardianPassword && <div className="mt-1 font-normal">Temporary guardian password: <b>{res.guardianPassword}</b>. Copy it now; it will not be shown again.</div>}
        </div>
      )}
      <button onClick={() => setOpen(true)} className="mt-6 rounded-xl bg-[var(--ink)] px-5 py-3 font-semibold text-white">Open student registration form</button>
      <FormModal open={open} title="Register a new student" formId="create-student" confirmLabel="Register student" onClose={() => setOpen(false)}>
      <form id="create-student" onSubmit={submit} className="grid max-h-[70vh] gap-4 overflow-y-auto pr-2 sm:grid-cols-2">
        <label className="text-sm font-semibold">Student name<input required value={f.name} onChange={set("name")} className={c} /></label>
        <label className="text-sm font-semibold">Gender<select value={f.gender} onChange={set("gender")} className={c}><option value="">Select</option><option value="male">Male</option><option value="female">Female</option></select></label>
        <label className="text-sm font-semibold">Date of birth<input type="date" value={f.birth_date} onChange={set("birth_date")} className={c} /></label>
        <label className="text-sm font-semibold">School name<input value={f.school_name} onChange={set("school_name")} className={c} /></label>
        <label className="text-sm font-semibold">School class<input value={f.school_class} onChange={set("school_class")} className={c} placeholder="1SD, 1SMP" /></label>
        <label className="text-sm font-semibold">Student phone<input value={f.phone} onChange={set("phone")} className={c} inputMode="tel" /></label>
        <label className="text-sm font-semibold sm:col-span-2">Address<textarea value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className={c} rows={2} /></label>
        <label className="text-sm font-semibold">Academic period<select required value={f.term} onChange={set("term")} className={c}>{terms.map((year) => <option key={year} value={year}>{academicYearLabel(year, academicYears)}</option>)}</select></label>
        <div className="sm:col-span-2 rounded-xl bg-[var(--paper)] p-4"><h2 className="font-bold">Parent / guardian account</h2><p className="mt-1 text-sm opacity-70">This email will be used to sign in and view the student&apos;s report cards.</p></div>
        <label className="text-sm font-semibold">Parent/guardian name<input required value={f.guardian_name} onChange={set("guardian_name")} className={c} /></label>
        <label className="text-sm font-semibold">Relationship<input value={f.guardian_relation} onChange={set("guardian_relation")} placeholder="Father / Mother / Guardian" className={c} /></label>
        <label className="text-sm font-semibold">Guardian phone<input required value={f.guardian_phone} onChange={set("guardian_phone")} className={c} inputMode="tel" /></label>
        <label className="text-sm font-semibold">Parent/guardian email<input type="email" required value={f.guardian_email} onChange={set("guardian_email")} className={c} /></label>
      </form>
      </FormModal>
    </>
  );
}
