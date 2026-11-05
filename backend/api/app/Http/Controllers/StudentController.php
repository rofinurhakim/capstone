<?php

namespace App\Http\Controllers;

use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function myStudents(Request $r)
    {
        abort_unless($r->user()->hasRole('parent'), 403);

        return Student::where('guardian_id', $r->user()->id)->orderBy('name')->get(['id', 'name', 'gender', 'birth_date', 'school_name', 'school_class', 'sector', 'phone', 'guardian_phone', 'guardian_relation']);
    }

    public function updateOwnStudent(Request $r, Student $student)
    {
        abort_unless($r->user()->hasRole('parent') && $student->guardian_id === $r->user()->id, 403);
        $data = $r->validate([
            'name' => 'required|string|max:100',
            'gender' => 'nullable|in:male,female',
            'birth_date' => 'nullable|date',
            'school_name' => 'nullable|string|max:150',
            'school_class' => 'nullable|string|max:50',
            'sector' => ['nullable', Rule::in(Student::SECTORS)],
            'phone' => 'nullable|string|max:30',
            'guardian_phone' => 'nullable|string|max:30',
            'guardian_relation' => 'nullable|string|max:50',
        ]);
        $student->update($data);

        return $student->only(['id', 'name', 'gender', 'birth_date', 'school_name', 'school_class', 'sector', 'phone', 'guardian_phone', 'guardian_relation']);
    }

    public function terms()
    {
        return collect(DB::table('academic_years')->pluck('term'))
            ->merge(Classroom::query()->pluck('term'))
            ->merge(Enrollment::query()->pluck('term'))
            ->filter(fn ($term) => preg_match('/^\d{4}$/', $term) === 1)
            ->unique()
            ->sortDesc()
            ->values();
    }

    public function createAcademicYear(Request $r)
    {
        abort_unless($r->user()->hasAnyRole(['admin', 'academic_admin']), 403);
        $data = $r->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
        ]);
        $data['term'] = substr($data['start_date'], 0, 4);
        $latestYear = (int) ($this->terms()->first() ?? now()->year);
        abort_unless((int) $data['term'] === $latestYear + 1, 422, 'Periode baru harus dimulai pada tahun kalender berikutnya.');
        abort_if(
            DB::table('academic_years')
                ->whereDate('start_date', '<=', $data['end_date'])
                ->whereDate('end_date', '>=', $data['start_date'])
                ->exists(),
            422,
            'Rentang periode akademik tidak boleh bertumpang tindih.',
        );

        $created = DB::table('academic_years')->insertOrIgnore([
            'term' => $data['term'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'created_by' => $r->user()->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        abort_unless($created, 422, 'Tahun akademik tersebut sudah tersedia.');

        return [
            'term' => $data['term'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
        ];
    }

    public function academicYears()
    {
        $terms = $this->terms();
        $years = DB::table('academic_years')->whereIn('term', $terms)->get()->keyBy('term');

        return $terms->map(function ($term) use ($years) {
            $startDate = $years->get($term)?->start_date ?? "{$term}-08-01";
            $lockDate = $this->registrationLockDate($startDate);

            return [
                'term' => $term,
                'start_date' => $startDate,
                'end_date' => $years->get($term)?->end_date ?? ((int) $term + 1).'-05-31',
                'registration_locked' => $this->registrationIsLocked($lockDate),
                'registration_lock_date' => $lockDate,
            ];
        });
    }

    public function teachers()
    {
        return User::where('role', 'teacher')->orderBy('name')->get(['id', 'name', 'email', 'is_academic_admin', 'is_admin']);
    }

    public function updateTeacher(Request $r, User $teacher)
    {
        abort_unless($r->user()->hasAnyRole(['admin', 'academic_admin']), 403);
        abort_unless($teacher->role === 'teacher', 404);
        $d = $r->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email,'.$teacher->id,
            'additional_role' => 'sometimes|in:none,academic_admin,admin',
        ]);
        $teacher->update(collect($d)->except('additional_role')->all());
        if (array_key_exists('additional_role', $d)) {
            $teacher->update([
                'is_academic_admin' => $d['additional_role'] === 'academic_admin',
                'is_admin' => $d['additional_role'] === 'admin',
            ]);
        }

        return $teacher->only(['id', 'name', 'email', 'is_academic_admin', 'is_admin']);
    }

    public function deleteTeacher(Request $r, User $teacher)
    {
        abort_unless($r->user()->hasAnyRole(['admin', 'academic_admin']), 403);
        abort_unless($teacher->role === 'teacher', 404);
        $teacher->classrooms()->detach();
        Classroom::where('teacher_id', $teacher->id)->update(['teacher_id' => null]);
        $teacher->delete();

        return ['ok' => true];
    }

    public function resetTeacherPassword(Request $r, User $teacher)
    {
        abort_unless($r->user()->hasAnyRole(['admin', 'academic_admin']), 403);
        abort_unless($teacher->role === 'teacher', 404);

        $password = Str::random(12);
        $teacher->forceFill(['password' => Hash::make($password)])->save();
        $teacher->tokens()->delete();

        return ['password' => $password];
    }

    public function classrooms(Request $r)
    {
        $q = Classroom::with(['teacher:id,name', 'teachers:id,name']);
        if ($r->filled('term')) {
            $data = $r->validate(['term' => ['required', 'regex:/^\d{4}$/']]);
            $q->where('term', $data['term']);
        }

       return $q->orderBy('name')->get(['id', 'name', 'term', 'teacher_id']);
    }

    public function createTeacher(Request $r)
    {
        abort_unless($r->user()->hasAnyRole(['admin', 'academic_admin']), 403);
        $d = $r->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'additional_role' => 'sometimes|in:none,academic_admin,admin',
        ]);

        return User::forceCreate([
            'name' => $d['name'],
            'email' => $d['email'],
            'role' => 'teacher',
            'is_academic_admin' => ($d['additional_role'] ?? 'none') === 'academic_admin',
            'is_admin' => ($d['additional_role'] ?? 'none') === 'admin',
            'password' => Hash::make($d['password']),
        ]);
    }

    public function createClassroom(Request $r)
    {
        abort_unless($r->user()->hasAnyRole(['admin', 'academic_admin']), 403);
        $d = $r->validate([
            'name' => ['required', Rule::in(Classroom::LEVELS)],
            'term' => ['required', 'regex:/^\d{4}$/'],
            'teacher_id' => 'nullable|exists:users,id',
            'teacher_ids' => 'sometimes|array|max:3',
            'teacher_ids.*' => 'distinct|exists:users,id',
        ]);
        abort_if(
            Classroom::where('name', $d['name'])->where('term', $d['term'])->exists(),
            422,
            'Kelas untuk level dan tahun ajaran ini sudah tersedia.',
        );
        $teacherIds = $d['teacher_ids'] ?? (empty($d['teacher_id']) ? [] : [(int) $d['teacher_id']]);
        $this->validateTeacherAssignments($teacherIds, $d['term']);
        $classroom = Classroom::create([
            'name' => $d['name'],
            'term' => $d['term'],
            'teacher_id' => $teacherIds[0] ?? null,
        ]);
        $classroom->teachers()->sync($teacherIds);

        return $classroom->load(['teacher:id,name', 'teachers:id,name']);
    }

    public function updateClassroom(Request $r, Classroom $classroom)
    {
        abort_unless($r->user()->hasAnyRole(['admin', 'academic_admin']), 403);
        $d = $r->validate([
            'name' => ['required', Rule::in(Classroom::LEVELS)],
            'term' => ['required', 'regex:/^\d{4}$/'],
            'teacher_id' => 'nullable|exists:users,id',
            'teacher_ids' => 'sometimes|array|max:3',
            'teacher_ids.*' => 'distinct|exists:users,id',
        ]);
        abort_if(
            Classroom::where('name', $d['name'])
                ->where('term', $d['term'])
                ->where('id', '!=', $classroom->id)
                ->exists(),
            422,
            'Kelas untuk level dan tahun ajaran ini sudah tersedia.',
        );
        $teacherIds = $d['teacher_ids'] ?? (empty($d['teacher_id']) ? [] : [(int) $d['teacher_id']]);
        $this->validateTeacherAssignments($teacherIds, $d['term'], $classroom->id);
        $classroom->update([
            'name' => $d['name'],
            'term' => $d['term'],
            'teacher_id' => $teacherIds[0] ?? null,
        ]);
        $classroom->teachers()->sync($teacherIds);

        return $classroom->load(['teacher:id,name', 'teachers:id,name']);
    }

    public function store(Request $r)
    {
        abort_unless($r->user()->hasAnyRole(['admin', 'academic_admin']), 403);
        $d = $r->validate([
            'name' => 'required|string|max:100',
            'gender' => 'nullable|in:male,female',
            'birth_date' => 'nullable|date',
            'school_name' => 'nullable|string|max:150',
            'school_class' => 'nullable|string|max:50',
            'sector' => ['nullable', Rule::in(Student::SECTORS)],
            'phone' => 'nullable|string|max:30',
            'guardian_phone' => 'nullable|string|max:30',
            'guardian_relation' => 'nullable|string|max:50',
            'term' => ['required', 'regex:/^\d{4}$/'],
            'guardian_name' => 'required|string|max:100',
            'guardian_email' => 'required|email',
        ]);
        $academicYear = DB::table('academic_years')->where('term', $d['term'])->first();
        $startDate = $academicYear?->start_date ?? "{$d['term']}-08-01";
        $lockDate = $this->registrationLockDate($startDate);
        abort_if(
            $this->registrationIsLocked($lockDate),
            422,
            'Pendaftaran siswa baru untuk tahun ajaran ini sudah ditutup. Silakan pilih tahun ajaran berikutnya.',
        );

        return DB::transaction(function () use ($d) {
            $pw = null;
            $g = User::where('email', $d['guardian_email'])->first();
            abort_if($g && $g->role !== 'parent', 422, 'Email tersebut sudah digunakan oleh akun internal. Gunakan email orang tua/wali lain.');
            if (! $g) {
                $pw = Str::random(10);
                $g = User::forceCreate(['name' => $d['guardian_name'], 'email' => $d['guardian_email'], 'role' => 'parent', 'password' => Hash::make($pw)]);
            }
            $s = Student::create([
                'nis' => 'S'.now()->format('ymd').strtoupper(Str::random(4)),
                ...collect($d)->only(['name', 'gender', 'birth_date', 'school_name', 'school_class', 'sector', 'phone', 'guardian_phone', 'guardian_relation'])->all(),
                'level' => 'MATTHEW A',
                'guardian_id' => $g->id,
            ]);
            Enrollment::create([
                'student_id' => $s->id,
                'classroom_id' => null,
                'term' => $d['term'],
                'level_snapshot' => $s->level,
                'status' => 'pending',
                'requires_placement_test' => true,
            ]);

            return ['student' => $s->load('guardian'), 'guardianPassword' => $pw];
        });
    }

    private function registrationLockDate(string $startDate): string
    {
        return Carbon::parse($startDate)->addMonthNoOverflow()->toDateString();
    }

    private function registrationIsLocked(string $lockDate): bool
    {
        return $lockDate <= Carbon::today('Asia/Jakarta')->toDateString();
    }

    private function validateTeacherAssignments(array $teacherIds, string $term, ?int $classroomId = null): void
    {
        abort_if(count($teacherIds) > 3, 422, 'Kelas hanya dapat memiliki maksimal tiga guru.');
        abort_unless(
            User::whereIn('id', $teacherIds)->where('role', 'teacher')->count() === count($teacherIds),
            422,
            'Semua pengguna yang dipilih harus merupakan guru.',
        );

        $assignedElsewhere = Classroom::where('term', $term)
            ->where(function ($query) use ($teacherIds) {
                $query->whereIn('teacher_id', $teacherIds)
                    ->orWhereHas('teachers', fn ($teachers) => $teachers->whereIn('users.id', $teacherIds));
            })
            ->when($classroomId, fn ($query) => $query->where('id', '!=', $classroomId))
            ->exists();
        abort_if($assignedElsewhere, 422, 'Seorang guru hanya dapat ditugaskan ke satu kelas per tahun ajaran.');
    }
}
