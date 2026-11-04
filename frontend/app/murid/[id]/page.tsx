"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Check,
  ChevronRight,
  GraduationCap,
  Hash,
  MessageCircle,
  Star,
  UserRound,
  UsersRound,
} from "lucide-react";
import { api, avg, CURRENT_TERM, Row, SKILLS } from "@/lib/api";

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-[#7182a3] sm:text-sm">{label}</dt>
      <dd className="mt-1 break-words text-sm font-bold text-[#1d3260]">{value || "-"}</dd>
    </div>
  );
}

export default function DetailMurid() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const term = search.get("term") ?? CURRENT_TERM;
  const recordKey = `${term}:${params.id}`;
  const [loadedRecord, setLoadedRecord] = useState<{ key: string; student: Row | null } | null>(null);

  useEffect(() => {
    let active = true;
    void api<Row[]>(`/roster?term=${encodeURIComponent(term)}`, []).then((rows) => {
      if (!active) return;
      setLoadedRecord({ key: recordKey, student: rows.find((row) => String(row.id) === params.id) ?? null });
    });
    return () => { active = false; };
  }, [recordKey, term, params.id]);

  const loading = loadedRecord?.key !== recordKey;
  const student = loadedRecord?.key === recordKey ? loadedRecord.student : null;
  if (loading) return <p className="mt-10 text-sm font-medium text-[#7182a3]">Loading student profile...</p>;
  if (!student) {
    return (
      <section className="mt-8 rounded-2xl border border-[#dce5f7] bg-white p-6 text-sm text-[#52678f]">
        <p>No student record was found for term {term}.</p>
        <Link href={`/murid?term=${encodeURIComponent(term)}`} className="mt-4 inline-flex rounded-xl bg-[#315ca6] px-4 py-2.5 font-bold text-white">Back to students</Link>
      </section>
    );
  }

  const scores = student.scores ?? {};
  const average = avg(scores);
  const status = student.status === "confirmed"
    ? "Confirmed"
    : student.status === "not_confirmed"
      ? "Not confirmed"
      : student.status === "left"
        ? "Not continuing"
        : "Pending";
  const statusColor = student.status === "confirmed"
    ? "bg-[#e7fbf3] text-[#07895f]"
    : student.status === "not_confirmed" || student.status === "left"
      ? "bg-[#fff0ef] text-[#c4473e]"
      : "bg-[#fff7e8] text-[#9a6a13]";

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
        <Link href={`/murid?term=${encodeURIComponent(term)}`} className="inline-flex items-center gap-2 rounded-xl border border-[#dce5f7] bg-white px-3.5 py-2.5 text-sm font-bold text-[#315ca6] transition hover:bg-[#f5f8ff]">
          <ChevronRight className="rotate-180" size={16} /> Back to students
        </Link>
        <span className="rounded-full border border-[#dce6ff] bg-white/80 px-3 py-1.5 text-xs font-bold text-[#416199]">Academic year {term}</span>
      </div>

      <header className="relative overflow-hidden rounded-[1.75rem] border border-[#dbe5ff] bg-gradient-to-br from-[#eef3ff] via-white to-[#e6efff] p-5 shadow-[0_16px_38px_rgba(50,87,166,.1)] sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full bg-[#dbe7ff]/70 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#4d83e5] to-[#3162c3] text-white shadow-md shadow-blue-900/15"><UsersRound size={27} /></span>
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#dce6ff] bg-white/80 px-3 py-1 text-xs font-bold text-[#416199]"><GraduationCap size={14} /><span>Academic</span><ChevronRight size={13} /><span>Student profile</span></div>
            <h1 className="break-words text-3xl font-extrabold tracking-tight text-[#172d59] sm:text-4xl">{student.name}</h1>
            <p className="mt-1 text-sm text-[#52678f]">Student ID {student.nis || "-"} <span className="px-1">·</span> {student.level || "-"} <span className="px-1">·</span> {student.class || "-"}</p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[1.5rem] border border-[#dce5f7] bg-white p-5 shadow-[0_12px_30px_rgba(32,58,112,.06)] sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-[#1b3567]"><UserRound size={19} className="text-[#315ca6]" />Personal information</h2>
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-[#edf1f8] pt-4 sm:gap-x-6">
            <InfoItem label="Gender" value={student.gender === "male" ? "Male" : student.gender === "female" ? "Female" : undefined} />
            <InfoItem label="Date of birth" value={student.birth_date} />
            <InfoItem label="School name" value={student.school_name} />
            <InfoItem label="School class" value={student.school_class} />
            <InfoItem label="Student phone" value={student.phone} />
            <InfoItem label="Sector" value={student.sector} />
          </dl>
        </section>

        <section className="rounded-[1.5rem] border border-[#dce5f7] bg-white p-5 shadow-[0_12px_30px_rgba(32,58,112,.06)] sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-[#1b3567]"><UsersRound size={19} className="text-[#315ca6]" />Parent / guardian</h2>
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-[#edf1f8] pt-4 sm:gap-x-6">
            <InfoItem label="Name" value={student.guardian_name} />
            <InfoItem label="Relationship" value={student.guardian_relation} />
            <InfoItem label="Phone" value={student.guardian_phone} />
            <InfoItem label="Email" value={student.guardian_email} />
          </dl>
        </section>
      </div>

      <section aria-label="Enrollment summary" className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-[1.35rem] border border-[#dce5f7] bg-white p-4 shadow-[0_10px_26px_rgba(32,58,112,.05)] sm:p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#efedff] text-[#5142be]"><BarChart3 size={20} /></span>
          <div><p className="text-xs font-medium text-[#7182a3]">Average score</p><p className="text-2xl font-extrabold text-[#172d59]">{average.toFixed(2)}</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.35rem] border border-[#dce5f7] bg-white p-4 shadow-[0_10px_26px_rgba(32,58,112,.05)] sm:p-5">
          <span className={`grid size-11 shrink-0 place-items-center rounded-full ${student.status === "confirmed" ? "bg-[#d9f9ee] text-[#0ba77a]" : "bg-[#fff2d8] text-[#a8730e]"}`}><Check size={21} /></span>
          <div><p className="text-xs font-medium text-[#7182a3]">Enrollment status</p><p className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-sm font-extrabold ${statusColor}`}>{status}</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.35rem] border border-[#dce5f7] bg-white p-4 shadow-[0_10px_26px_rgba(32,58,112,.05)] sm:p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#efedff] text-[#5142be]"><Hash size={20} /></span>
          <div><p className="text-xs font-medium text-[#7182a3]">Enrollment ID</p><p className="text-2xl font-extrabold text-[#172d59]">#{student.id}</p></div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-[#dce5f7] bg-white p-5 shadow-[0_12px_30px_rgba(32,58,112,.06)] sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-extrabold text-[#1b3567]"><Star size={19} className="fill-[#315ca6] text-[#315ca6]" />Skill scores</h2>
        <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {SKILLS.map((skill) => {
            const score = scores[skill];
            const progress = Math.max(0, Math.min(100, score ?? 0));
            return (
              <div key={skill}>
                <div className="flex items-center justify-between gap-3 text-xs font-bold text-[#263d68]"><span>{skill}</span><span>{score ?? "-"}</span></div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#e5eaf5]"><div className="h-full rounded-full bg-gradient-to-r from-[#25c493] to-[#13a97e] transition-[width]" style={{ width: `${progress}%` }} /></div>
              </div>
            );
          })}
        </div>
        {student.note && <p className="mt-5 flex items-start gap-2 rounded-xl bg-[#edf3ff] p-3.5 text-sm leading-6 text-[#263d68]"><MessageCircle size={17} className="mt-1 shrink-0 text-[#3975db]" /><span><b className="mr-2">Teacher&apos;s comment:</b>{student.note}</span></p>}
      </section>
    </div>
  );
}
