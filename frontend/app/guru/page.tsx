"use client";

import { useEffect, useState } from "react";
import { Mail, UserRound } from "lucide-react";
import { api } from "@/lib/api";

type Teacher = { id: number; name: string; email: string };

export default function GuruAnak() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  useEffect(() => { void api<Teacher[]>("/teacher-contacts", []).then(setTeachers); }, []);
  return <>
    <h1 className="mt-8 text-3xl font-extrabold">Your child&apos;s teachers</h1>
    <p className="mt-2 opacity-70">Contact information for the teachers working with your child.</p>
    <ul className="mt-6 space-y-3">{teachers.length === 0 && <li className="opacity-70">No teachers have been assigned yet.</li>}{teachers.map((teacher) => <li key={teacher.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-5"><span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--sun)]"><UserRound size={20} /></span><span className="mr-auto font-bold">{teacher.name}</span><a href={`mailto:${teacher.email}`} className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold"><Mail size={16} />{teacher.email}</a></li>)}</ul>
  </>;
}
