"use client";
import { useEffect, useState } from "react";
import { CalendarDays, ChevronRight, GraduationCap, UserRoundPlus, UsersRound } from "lucide-react";
import { AcademicYear, academicYearLabel, api, STUDENT_SECTORS } from "@/lib/api";

type Res = { student?: { name: string; nis: string }; guardianPassword?: string | null };
const empty = { name: "", gender: "", birth_date: "", school_name: "", school_class: "", sector: "", phone: "", guardian_phone: "", guardian_relation: "", guardian_name: "", guardian_email: "", term: "" };

export default function MuridBaru() {
  const [f, setF] = useState(empty);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [res, setRes] = useState<Res | null>(null);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    void api<AcademicYear[]>("/academic-years", []).then((items) => {
      setAcademicYears(items);
      const availableYears = items.filter((item) => !item.registration_locked);
      setF((current) => ({
        ...current,
        term: availableYears.some((item) => item.term === current.term) ? current.term : availableYears[0]?.term ?? "",
      }));
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await api<Res>("/students", {}, { method: "POST", body: JSON.stringify(f) }, "Student registration completed.");
    if (r.student) { setRes(r); setF({ ...empty, term: f.term }); }
  }
  function clearForm() { setF((current) => ({ ...empty, term: current.term })); setRes(null); }
  const availableYears = academicYears.filter((year) => !year.registration_locked);
  const c = "mt-1.5 w-full rounded-xl border border-[#dce5f7] bg-white px-3 py-2.5 text-sm font-medium text-[#263d68] outline-none transition focus:border-[#7599e6] focus:ring-2 focus:ring-[#e5edff]";
  const fieldLabel = "block text-xs font-bold text-[#42577f]";
  return (
    <>
      <section className="relative mt-3 overflow-hidden rounded-[1.75rem] border border-[#dbe5ff] bg-gradient-to-br from-[#eef3ff] via-white to-[#e6efff] p-5 shadow-[0_16px_38px_rgba(50,87,166,.1)] sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full bg-[#dbe7ff]/70 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#4d83e5] to-[#3162c3] text-white shadow-md shadow-blue-900/15"><UserRoundPlus size={27} /></span>
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#dce6ff] bg-white/80 px-3 py-1 text-xs font-bold text-[#416199]"><GraduationCap size={14} /><span>Academic</span><ChevronRight size={13} /><span>New student</span></div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#172d59] sm:text-4xl">Register a new student</h1>
            <p className="mt-1 max-w-3xl text-sm text-[#52678f]">New students start at Matthew A and remain pending until the placement test is complete and Academic confirms their level.</p>
          </div>
        </div>
      </section>
      {res?.student && (
        <div role="status" className="mt-4 rounded-2xl border border-[#b8dfd0] bg-[#effaf4] p-4 text-sm font-semibold text-[#24784a]">
          {res.student.name} was registered at Matthew A with student ID {res.student.nis}. The enrollment is pending academic confirmation.
          {res.guardianPassword && <div className="mt-1 font-normal">Temporary guardian password: <b>{res.guardianPassword}</b>. Copy it now; it will not be shown again.</div>}
        </div>
      )}
      <form id="create-student" onSubmit={submit} className="mt-5 overflow-hidden rounded-[1.5rem] border border-[#dce5f7] bg-white shadow-[0_12px_30px_rgba(32,58,112,.08)]">
        <div className="flex items-center gap-2 border-b border-[#e5ebf8] bg-[#f0f4ff] px-5 py-3"><UsersRound size={17} className="text-[#3975db]" /><h2 className="text-xs font-extrabold uppercase tracking-wide text-[#315ca6]">Student information</h2></div>
        <div className="grid gap-x-6 gap-y-4 p-4 sm:grid-cols-2 sm:p-5">
          <label className={fieldLabel}>Student name<input required value={f.name} onChange={set("name")} className={c} autoComplete="off" /></label>
          <label className={fieldLabel}>Gender<select value={f.gender} onChange={set("gender")} className={c}><option value="">Select</option><option value="male">Male</option><option value="female">Female</option></select></label>
          <label className={fieldLabel}>Date of birth<input type="date" value={f.birth_date} onChange={set("birth_date")} className={c} /></label>
          <label className={fieldLabel}>School name<input value={f.school_name} onChange={set("school_name")} className={c} /></label>
          <label className={fieldLabel}>School class<input value={f.school_class} onChange={set("school_class")} className={c} placeholder="1SD, 1SMP" /></label>
          <label className={fieldLabel}>Student phone<input value={f.phone} onChange={set("phone")} className={c} inputMode="tel" /></label>
          <label className={fieldLabel}>Sector<select value={f.sector} onChange={set("sector")} className={c}><option value="">Select sector</option>{STUDENT_SECTORS.map((sector) => <option key={sector} value={sector}>{sector}</option>)}</select></label>
          <label className={fieldLabel}>Academic period<span className="relative mt-1.5 block"><CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6483be]" /><select required value={f.term} onChange={set("term")} className={`${c} mt-0 w-full pl-9`}><option value="" disabled>{availableYears.length ? "Select an academic year" : "No open academic year"}</option>{academicYears.map((year) => <option key={year.term} value={year.term} disabled={year.registration_locked}>{academicYearLabel(year.term, academicYears)}{year.registration_locked ? " (Locked for new registrations)" : ""}</option>)}</select></span></label>
          {availableYears.length === 0 && <p className="rounded-xl border border-[#f2d89b] bg-[#fff9e9] p-3 text-xs leading-5 text-[#80611d] sm:col-span-2">{academicYears.length > 0 ? "Registration is closed for all configured academic years." : "No academic year is available for registration."} Please create the next academic year in Classes before registering a new student.</p>}
          <div className="rounded-xl bg-[#f0f4ff] p-3.5 sm:col-span-2"><h3 className="text-sm font-extrabold text-[#263d68]">Parent / guardian account</h3><p className="mt-0.5 text-xs text-[#7182a3]">This email will be used to sign in and view the student&apos;s report cards.</p></div>
          <label className={fieldLabel}>Parent/guardian name<input required value={f.guardian_name} onChange={set("guardian_name")} className={c} autoComplete="name" /></label>
          <label className={fieldLabel}>Relationship<input value={f.guardian_relation} onChange={set("guardian_relation")} placeholder="Father / Mother / Guardian" className={c} /></label>
          <label className={fieldLabel}>Guardian phone<input required value={f.guardian_phone} onChange={set("guardian_phone")} className={c} inputMode="tel" autoComplete="tel" /></label>
          <label className={fieldLabel}>Parent/guardian email<input type="email" required value={f.guardian_email} onChange={set("guardian_email")} className={c} autoComplete="email" /></label>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[#e8edf7] bg-[#fbfcff] px-4 py-3 sm:px-5">
          <button type="button" onClick={clearForm} className="rounded-xl border border-[#dce5f7] bg-white px-4 py-2.5 text-sm font-bold text-[#52678f] hover:bg-[#f4f7ff]">Clear form</button>
          <button type="submit" disabled={availableYears.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#315ca6] to-[#24457f] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-900/15 transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"><UserRoundPlus size={16} />Register student</button>
        </div>
      </form>
    </>
  );
}
