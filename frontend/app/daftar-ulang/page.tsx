"use client";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AcademicYear, academicYearLabel, api, BEC_LEVELS, CURRENT_TERM, hasRole, Row } from "@/lib/api";
import { InputModal } from "@/components/AppModal";

const pill: Record<string, string> = { confirmed: "bg-[var(--mint)] text-white", pending: "bg-[var(--sun)]", not_confirmed: "bg-[var(--coral)] text-white", left: "bg-[var(--coral)] text-white" };
const label: Record<string, string> = { confirmed: "Confirmed", pending: "Pending", not_confirmed: "Not confirmed", left: "Not continuing" };
const y = new Date().getFullYear();
function nextTerm(term: string): string {
  return /^\d{4}$/.test(term) ? String(Number(term) + 1) : String(y + 1);
}

export default function DaftarUlang() {
  const isParent = hasRole("parent");
  const canManage = hasRole("admin") || hasRole("academic_admin");
  const [from, setFrom] = useState(CURRENT_TERM), [to, setTo] = useState(nextTerm(CURRENT_TERM));
  const [terms, setTerms] = useState<string[]>([CURRENT_TERM]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [placementDone, setPlacementDone] = useState<Record<number, boolean>>({});
  const [levels, setLevels] = useState<Record<number, string>>({});
  const [note, setNote] = useState("");
  const [leftTarget, setLeftTarget] = useState<number | null>(null);
  const load = useCallback(() => { api<Row[]>(`/roster?term=${encodeURIComponent(to)}${isParent ? "&include_pending=1" : ""}`, []).then(setRows); }, [isParent, to]);
  useEffect(() => {
    void (async () => {
      const periods = await api<AcademicYear[]>("/academic-years", []);
      setAcademicYears(periods);
      const items = periods.map((period) => period.term);
      const sorted = [...new Set(items)].filter((item) => /^\d{4}$/.test(item)).sort((a, b) => b.localeCompare(a));
      const rosters = await Promise.all(sorted.map((year) => api<Row[]>(`/roster?term=${encodeURIComponent(year)}`, [])));
      const source = sorted.find((_, index) => rosters[index]?.some((row) => row.status === "confirmed")) ?? sorted[0] ?? CURRENT_TERM;
      const target = nextTerm(source);
      setTerms([...new Set([...sorted, target])]);
      setFrom(source);
      setTo(target);
    })();
  }, []);
  useEffect(load, [load]);

  async function propose() {
    const r = await api<{ created?: number; held?: number; graduated?: number }>("/enrollments/propose", {}, { method: "POST", body: JSON.stringify({ from, to }) }, "Enrollment proposals submitted.");
    if (r.created !== undefined) {
      const outcomes = [`${r.created} student(s) submitted for academic year ${to}`];
      if (r.held) outcomes.push(`${r.held} held because grades are incomplete`);
      if (r.graduated) outcomes.push(`${r.graduated} student(s) graduated from ECSC`);
      setNote(`${outcomes.join(". ")}.`);
      load();
    }
  }
  async function setStatus(id: number, status: string, reason = "") {
    if (status === "left" && !reason) { setLeftTarget(id); return; }
    const row = rows.find((item) => item.id === id);
    if (!row) return;
    const result = await api<{ status?: string }>(`/enrollments/${id}`, {}, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        status_note: reason,
        placement_test_completed: row.requires_placement_test ? Boolean(placementDone[id]) : undefined,
        level: row.requires_placement_test ? levels[id] || undefined : undefined,
      }),
    }, "Enrollment status updated.");
    if (result.status) {
      load();
    }
  }
  async function saveLeftReason(value: string) { if (leftTarget === null) return; await setStatus(leftTarget, "left", value); setLeftTarget(null); }
  const c = "w-28 rounded-lg border border-[var(--line)] bg-white px-2 py-1.5";
  return (
    <>
      <h1 className="mt-8 text-3xl font-extrabold">Enrollment</h1>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold">From academic period<select value={from} onChange={(e) => setFrom(e.target.value)} className={`${c} block`}>{terms.map((item) => <option key={item} value={item}>{academicYearLabel(item, academicYears)}</option>)}</select></label>
        <label className="text-sm font-semibold">To academic period<select value={to} onChange={(e) => setTo(e.target.value)} className={`${c} block`}>{terms.map((item) => <option key={item} value={item}>{academicYearLabel(item, academicYears)}</option>)}</select></label>
        {canManage && <button onClick={propose} className="rounded-xl bg-[var(--ink)] px-4 py-2 font-semibold text-white">Propose returning students</button>}
      </div>
      {note && <p role="status" className="mt-3 font-semibold text-[var(--mint)]">{note}</p>}
      <ul className="mt-6 space-y-3">
        {rows.length === 0 && <li className="opacity-70">There are no enrollment requests for academic year {to}.</li>}
        {rows.map((r) => (
          <motion.li layout key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-4">
            <div className="mr-auto"><div className="font-semibold">{r.name}</div><div className="text-sm opacity-60">{r.class}</div></div>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${pill[r.status] ?? pill.pending}`}>{label[r.status] ?? r.status}</span>
            {r.status_note && <span className="w-full text-sm opacity-70">Note: {r.status_note}</span>}
            {canManage && r.status === "pending" && r.requires_placement_test && <>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={placementDone[r.id] ?? Boolean(r.placement_test_completed_at)} onChange={(event) => setPlacementDone((items) => ({ ...items, [r.id]: event.target.checked }))} />Placement test completed</label>
              <select aria-label={`Level for ${r.name}`} required value={levels[r.id] ?? ""} onChange={(event) => setLevels((items) => ({ ...items, [r.id]: event.target.value }))} className={c}><option value="">Select level</option>{BEC_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}</select>
            </>}
            {canManage && r.status === "pending" && <button onClick={() => void setStatus(r.id, "confirmed")} disabled={r.requires_placement_test && (!(placementDone[r.id] ?? Boolean(r.placement_test_completed_at)) || !levels[r.id])} className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-semibold hover:bg-[var(--line)] disabled:cursor-not-allowed disabled:opacity-45">Confirm enrollment</button>}
            {isParent && r.status === "pending" && <button onClick={() => void setStatus(r.id, "left")} className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-semibold hover:bg-[var(--line)]">Not continuing</button>}
            {canManage && r.status === "pending" && <button onClick={() => void setStatus(r.id, "not_confirmed")} className="rounded-lg border border-[var(--coral)] px-3 py-1.5 text-sm font-semibold text-[var(--coral)]">Not confirmed</button>}
          </motion.li>
        ))}
      </ul>
      <InputModal open={leftTarget !== null} title="Not continuing" message="Record a reason to keep the re-enrollment history clear." label="Reason (optional)" confirmLabel="Save status" onClose={() => setLeftTarget(null)} onConfirm={saveLeftReason} />
    </>
  );
}
