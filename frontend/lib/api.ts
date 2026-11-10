export type Row = { id: number; name: string; nis?: string; level: string; class: string; status: string; status_note?: string; scores: Record<string, number | null>; quiz_count?: number; quiz_scores?: { quiz_id: number; quiz_name?: string | null; score: number }[]; attendance?: { present: number; excused: number; sick: number; absent: number }; note?: string; student_id?: number; classroom_id?: number; gender?: string; birth_date?: string; school_name?: string; school_class?: string; sector?: string; phone?: string; guardian_name?: string; guardian_email?: string; guardian_phone?: string; guardian_relation?: string; teacher_name?: string; coordinator_name?: string; teacher_verified_at?: string; academic_verified_at?: string; report_publish_at?: string | null; published_at?: string; requires_placement_test?: boolean; placement_test_completed_at?: string | null; revision_requested_at?: string | null; report_status?: string };
export const SKILLS = ["Participation", "Assignment", "Mid Term Test", "Final Test"];
export const WEIGHTS: Record<string, number> = { Participation: 20, Assignment: 30, "Mid Term Test": 20, "Final Test": 30 };
export const BEC_LEVELS = ["MATTHEW A", "MATTHEW B", "MARK", "LUKE", "JOHN", "TIMOTHY", "GENESIS", "ECSC"];
export const STUDENT_SECTORS = ["Eden", "Efrata", "Galilea", "Gloria", "Haleluya", "Hosiana", "Imanuel", "Makedonia", "Maranatha", "Nafiri", "Nazareth", "Sion", "Syalom", "Yerusalem"];

export const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
export const CURRENT_TERM = String(new Date().getFullYear());

export type Role = "admin" | "academic_admin" | "teacher" | "parent";
export type AcademicYear = { term: string; start_date: string; end_date: string; registration_locked?: boolean; registration_lock_date?: string };
export function academicYearLabel(term: string, academicYears: AcademicYear[] = []): string {
  const period = academicYears.find((year) => year.term === term);
  const start = period?.start_date ?? `${term}-08-01`;
  const end = period?.end_date ?? `${Number(term) + 1}-05-31`;
  const formatDate = (date: string) => new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));

  return `${formatDate(start)} - ${formatDate(end)}`;
}
export type Session = { token: string; role: Role; roles?: Role[]; name: string };
export function session(): Session | null {
  try { return JSON.parse(localStorage.getItem("session") ?? "null"); } catch { return null; }
}
export function hasRole(role: Role, current = session()): boolean {
  return Boolean(current && (current.roles?.includes(role) || current.role === role));
}
export function logout(redirectTo = "/login") { localStorage.removeItem("session"); window.location.href = redirectTo; }

const say = (m: string) => window.dispatchEvent(new CustomEvent("app-error", { detail: m }));
export function notify(message: string, type: "success" | "error" = "success") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("app-toast", { detail: { message, type } }));
}

function englishError(message: string): string {
  if (message.includes("UNIQUE constraint failed: attendances.enrollment_id, attendances.date")) {
    return "Attendance for this student and date has already been saved. Refresh the page and try again.";
  }
  const translations: Record<string, string> = {
    "Email atau kata sandi salah.": "The email or password is incorrect.",
    "Tautan tidak valid atau sudah kedaluwarsa.": "This link is invalid or has expired.",
    "Email tersebut sudah digunakan oleh akun internal. Gunakan email orang tua/wali lain.": "This email belongs to an internal account. Use a different parent or guardian email.",
    "Murid ini belum punya akun orang tua.": "This student does not have a parent account yet.",
    "Kelas wajib dipilih untuk pendaftaran oleh admin.": "An administrator must select a class when registering a student.",
    "Pengguna yang dipilih bukan guru.": "The selected user is not a teacher.",
    "Semua komponen nilai harus diisi sebelum e-report diverifikasi.": "Complete every score component before verifying this report.",
    "Batas pengisian nilai belum terlewati.": "The grade submission deadline has not passed yet.",
    "E-report yang sudah dipublikasikan harus dibuka untuk revisi terlebih dahulu.": "Reopen the published report for revision before making changes.",
    "E-report belum pernah dipublikasikan.": "This report has not been published.",
    "Revisi hanya tersedia setelah tanggal publikasi.": "Revisions are available only after the publication date.",
    "Publikasi belum mencapai tanggal yang dijadwalkan.": "The scheduled publication date has not arrived yet.",
    "Jadwal tidak dapat diubah setelah rapor periode ini dipublikasikan.": "The schedule cannot be changed after reports for this academic year have been published.",
    "Bobot tidak dapat diubah setelah e-report mulai diverifikasi.": "Weights cannot be changed after report verification begins.",
    "Total bobot penilaian harus 100%.": "Assessment weights must total 100%.",
    "Kata sandi saat ini salah.": "The current password is incorrect.",
    "Anda tidak berwenang mengubah absensi kelas ini.": "You are not authorized to update attendance for this class.",
    "Anda tidak berwenang mengubah nilai kelas ini.": "You are not authorized to update scores for this class.",
    "E-report yang sudah dipublikasikan harus dibuka untuk revisi sebelum absensi diubah.": "Reopen the published report for revision before changing attendance.",
    "E-report yang sudah dipublikasikan harus dibuka untuk revisi sebelum nilai diubah.": "Reopen the published report for revision before changing scores.",
    "Teacher harus memverifikasi e-report sebelum dipublikasikan.": "The teacher must verify this report before it can be published.",
    "Pendaftaran siswa baru untuk tahun ajaran ini sudah ditutup. Silakan pilih tahun ajaran berikutnya.": "New student registration for this academic year is closed. Please select the next academic year.",
  };
  if (translations[message]) return translations[message];
  if (message.includes("has already been taken")) return "This value is already in use.";
  return message || "Something went wrong. Please try again.";
}

export async function api<T>(path: string, fallback: T, init?: RequestInit, successMessage?: string): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  try {
    const r = await fetch(BASE + path, { ...init, headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${session()?.token ?? ""}` } });
    if (r.status === 401) { logout(); return fallback; }
    const body = await r.json().catch(() => ({}));
    if (!r.ok) { say(englishError(body.message ?? "Something went wrong. Please try again.")); return fallback; }
    if (method !== "GET" || successMessage) {
      const defaultMessage = method === "DELETE" ? "Deleted successfully." : method === "POST" ? "Completed successfully." : "Changes saved successfully.";
      notify(successMessage ?? defaultMessage);
    }
    return body;
  } catch { say("Unable to connect to the server. Check your connection and API URL."); return fallback; }
}
export const avg = (s: Record<string, number | null>, weights: Record<string, number> = WEIGHTS) => Math.round(SKILLS.reduce((total, key) => total + (s[key] ?? 0) * (weights[key] / 100), 0) * 100) / 100;
export const predicate = (n: number) => (n >= 85 ? "Excellent" : n >= 70 ? "Good" : "Needs practice");
