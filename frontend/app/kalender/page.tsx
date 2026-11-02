"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { AcademicYear, academicYearLabel, api, CURRENT_TERM, hasRole, notify } from "@/lib/api";
import { ConfirmModal, FormModal } from "@/components/AppModal";

type EventItem = { id: number; title: string; type: "class" | "meeting" | "exam" | "holiday" | "activity" | "placement_test"; start_date: string; end_date?: string | null; start_time?: string | null; end_time?: string | null; description?: string | null; location?: string | null; term?: string | null };
const typeLabels = { class: "Class", meeting: "Meeting", exam: "Exam", holiday: "Holiday", activity: "Event", placement_test: "Placement test" };
const typeColors = { class: "calendar-blue", meeting: "calendar-coral", exam: "calendar-purple", holiday: "calendar-mint", activity: "calendar-yellow", placement_test: "calendar-blue" };
const empty = { title: "", type: "activity", start_date: "", end_date: "", start_time: "", end_time: "", description: "", location: "", term: CURRENT_TERM };

function dateKey(date: Date) { return date.toISOString().slice(0, 10); }
function eventDateKey(value?: string | null) { return value ? value.slice(0, 10) : ""; }
function monthLabel(date: Date) { return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date); }

export default function Kalender() {
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<EventItem[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<string[]>([CURRENT_TERM]);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [deleting, setDeleting] = useState<EventItem | null>(null);
  const canManage = hasRole("admin") || hasRole("academic_admin");
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const monthStartKey = dateKey(monthStart);
  const monthEndKey = dateKey(monthEnd);
  const load = () => void api<EventItem[]>(`/calendar?from=${monthStartKey}&to=${monthEndKey}`, []).then(setEvents);
  useEffect(load, [monthStartKey, monthEndKey]);
  useEffect(() => {
    void api<AcademicYear[]>("/academic-years", []).then((items) => {
      setAcademicYears(items);
      const years = items.map((item) => item.term);
      setTerms(years.length ? years : [CURRENT_TERM]);
      setForm((current) => ({ ...current, term: years.includes(current.term) ? current.term : years[0] ?? CURRENT_TERM }));
    });
  }, []);
  const cells = useMemo(() => { const first = (new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) % 7; return Array.from({ length: first + new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate() }, (_, index) => index < first ? null : new Date(cursor.getFullYear(), cursor.getMonth(), index - first + 1)); }, [cursor]);
  const input = "mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2";
  function newEvent(day?: Date) { setEditing(null); setForm({ ...empty, start_date: day ? dateKey(day) : dateKey(new Date()) }); setOpen(true); }
  function editEvent(item: EventItem) { setEditing(item); setForm({ title: item.title, type: item.type, start_date: item.start_date, end_date: item.end_date ?? "", start_time: item.start_time?.slice(0, 5) ?? "", end_time: item.end_time?.slice(0, 5) ?? "", description: item.description ?? "", location: item.location ?? "", term: item.term ?? CURRENT_TERM }); setOpen(true); }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.end_date && form.end_date < form.start_date) {
      notify("End date must be on or after the start date.", "error");
      return;
    }
    if ((!form.end_date || form.end_date === form.start_date) && form.start_time && form.end_time && form.end_time < form.start_time) {
      notify("End time must be after the start time.", "error");
      return;
    }
    const result = await api<EventItem>(editing ? `/calendar/${editing.id}` : "/calendar", {} as EventItem, { method: editing ? "PATCH" : "POST", body: JSON.stringify(form) }, editing ? "Calendar event updated." : "Calendar event added.");
    if (result.id) { setOpen(false); load(); }
  }
  async function remove() { if (!deleting) return; const result = await api<{ ok?: boolean }>(`/calendar/${deleting.id}`, {}, { method: "DELETE" }, "Calendar event deleted."); if (result.ok) { setDeleting(null); load(); } }
  return <>
    <div className="mt-8 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-extrabold">Academic calendar</h1><p className="mt-2 opacity-70">Manage classes, meetings, exams, holidays, and school events.</p></div>{canManage && <button onClick={() => newEvent()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 font-semibold text-white"><Plus size={17} />Add event</button>}</div>
    <section className="calendar-board mt-6 rounded-[1.5rem] border border-[var(--line)] bg-white p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><button aria-label="Previous month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="calendar-nav"><ChevronLeft size={18} /></button><div className="flex items-center gap-2 text-xl font-extrabold capitalize"><CalendarDays className="text-[var(--coral)]" size={22} />{monthLabel(cursor)}</div><div className="flex gap-2"><button onClick={() => setCursor(new Date())} className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-semibold">Today</button><button aria-label="Next month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="calendar-nav"><ChevronRight size={18} /></button></div></div><div className="mt-5 grid grid-cols-7 text-center text-xs font-bold uppercase opacity-60">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="p-2">{day}</div>)}</div><div className="grid grid-cols-7 overflow-hidden rounded-xl border-l border-t border-[var(--line)]">{cells.map((day, index) => { const key = day ? dateKey(day) : `empty-${index}`; const dayEvents = day ? events.filter((item) => { const start = eventDateKey(item.start_date); const end = eventDateKey(item.end_date) || start; return start <= key && key <= end; }) : []; return <div key={key} className={`calendar-cell min-h-28 border-b border-r border-[var(--line)] p-2 ${day && day.getMonth() === new Date().getMonth() && day.getDate() === new Date().getDate() ? "calendar-today" : ""}`}>{day && <><button onClick={() => canManage && newEvent(day)} className="calendar-day">{day.getDate()}</button><div className="mt-1 space-y-1">{dayEvents.map((item) => <div key={item.id} className={`calendar-event ${typeColors[item.type]}`}><button onClick={() => canManage ? editEvent(item) : undefined} className="min-w-0 flex-1 truncate text-left" title={item.title}>{item.title}</button>{canManage && <button onClick={() => setDeleting(item)} aria-label={`Delete ${item.title}`}><Trash2 size={12} /></button>}</div>)}</div></>}</div>; })}</div><div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">{Object.entries(typeLabels).map(([type, label]) => <span key={type} className={`calendar-legend ${typeColors[type as keyof typeof typeColors]}`}>{label}</span>)}</div></section>
    <FormModal open={open} title={editing ? "Edit event" : "Add academic event"} formId="calendar-form" confirmLabel={editing ? "Save changes" : "Add event"} onClose={() => setOpen(false)}><form id="calendar-form" onSubmit={submit} className="grid max-h-[68vh] gap-4 overflow-y-auto pr-2 sm:grid-cols-2"><label className="text-sm font-semibold sm:col-span-2">Event name<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={input} placeholder="Teacher meeting" /></label><label className="text-sm font-semibold">Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={input}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm font-semibold">Academic period<select value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} className={input}>{terms.map((year) => <option key={year} value={year}>{academicYearLabel(year, academicYears)}</option>)}</select></label><label className="text-sm font-semibold">Start date<input required type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={input} /></label><label className="text-sm font-semibold">End date<input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={input} /></label><label className="text-sm font-semibold">Start time<input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={input} /></label><label className="text-sm font-semibold">End time<input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className={input} /></label><label className="text-sm font-semibold sm:col-span-2">Location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={input} placeholder="Classroom / hall" /></label><label className="text-sm font-semibold sm:col-span-2">Notes<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={input} rows={3} /></label></form></FormModal>
    <ConfirmModal open={deleting !== null} title="Delete event?" message={`"${deleting?.title ?? "This event"}" will be removed from the calendar.`} confirmLabel="Delete event" tone="danger" onClose={() => setDeleting(null)} onConfirm={remove} />
  </>;
}