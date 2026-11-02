"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, avg, CURRENT_TERM, Row, SKILLS } from "@/lib/api";

export default function DetailMurid() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const term = search.get("term") ?? CURRENT_TERM;
  const [student, setStudent] = useState<Row | null>(null);
  useEffect(() => { api<Row[]>(`/roster?term=${encodeURIComponent(term)}`, []).then((rows) => setStudent(rows.find((row) => String(row.id) === params.id) ?? null)); }, [params.id, term]);

  if (!student) return <p className="mt-10">No student record was found for term {term}.</p>;
  const average = avg(student.scores);
  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3"><Link href={`/murid?term=${encodeURIComponent(term)}`} className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold">Back to students</Link><span className="text-sm opacity-60">Term {term}</span></div>
      <header className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-6"><p className="text-sm font-semibold uppercase tracking-wide opacity-60">Student profile</p><h1 className="mt-2 text-4xl font-extrabold">{student.name}</h1><p className="mt-2 opacity-70">Student ID {student.nis ?? "-"} · {student.level} · {student.class}</p></header>
      <section className="mt-5 rounded-2xl border border-[var(--line)] bg-white p-6"><h2 className="text-2xl font-extrabold">Personal information</h2><dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2"><div><dt className="text-sm opacity-60">Gender</dt><dd className="font-semibold">{student.gender === "male" ? "Male" : student.gender === "female" ? "Female" : "-"}</dd></div><div><dt className="text-sm opacity-60">Date of birth</dt><dd className="font-semibold">{student.birth_date ?? "-"}</dd></div><div><dt className="text-sm opacity-60">School name</dt><dd className="font-semibold">{student.school_name ?? "-"}</dd></div><div><dt className="text-sm opacity-60">School class</dt><dd className="font-semibold">{student.school_class ?? "-"}</dd></div><div><dt className="text-sm opacity-60">Student phone</dt><dd className="font-semibold">{student.phone ?? "-"}</dd></div><div className="sm:col-span-2"><dt className="text-sm opacity-60">Address</dt><dd className="font-semibold">{student.address ?? "-"}</dd></div></dl></section>
      <section className="mt-5 rounded-2xl border border-[var(--line)] bg-white p-6"><h2 className="text-2xl font-extrabold">Parent / guardian</h2><dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2"><div><dt className="text-sm opacity-60">Name</dt><dd className="font-semibold">{student.guardian_name ?? "-"}</dd></div><div><dt className="text-sm opacity-60">Relationship</dt><dd className="font-semibold">{student.guardian_relation ?? "-"}</dd></div><div><dt className="text-sm opacity-60">Phone</dt><dd className="font-semibold">{student.guardian_phone ?? "-"}</dd></div><div><dt className="text-sm opacity-60">Email</dt><dd className="font-semibold">{student.guardian_email ?? "-"}</dd></div></dl></section>
      <section className="mt-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-[var(--line)] bg-white p-5"><p className="text-sm opacity-60">Average score</p><p className="mt-1 text-4xl font-extrabold">{average}</p></div><div className="rounded-2xl border border-[var(--line)] bg-white p-5"><p className="text-sm opacity-60">Enrollment status</p><p className="mt-1 text-xl font-bold">{student.status === "confirmed" ? "Confirmed" : student.status === "not_confirmed" ? "Not confirmed" : student.status === "left" ? "Not continuing" : "Pending"}</p></div><div className="rounded-2xl border border-[var(--line)] bg-white p-5"><p className="text-sm opacity-60">Enrollment ID</p><p className="mt-1 text-xl font-bold">#{student.id}</p></div></section>
      <section className="mt-5 rounded-2xl border border-[var(--line)] bg-white p-6"><h2 className="text-2xl font-extrabold">Skill scores</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{SKILLS.map((skill) => <div key={skill}><div className="flex justify-between font-semibold"><span>{skill}</span><span>{student.scores[skill] ?? "-"}</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full rounded-full bg-[var(--mint)]" style={{ width: `${student.scores[skill] ?? 0}%` }} /></div></div>)}</div>{student.note && <p className="mt-6 rounded-xl bg-[var(--paper)] p-4"><b>Teacher&apos;s comment:</b> {student.note}</p>}</section>
    </>
  );
}