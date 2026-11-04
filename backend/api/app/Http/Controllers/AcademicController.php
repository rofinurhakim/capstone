<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\AssessmentWeight;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Quiz;
use App\Models\QuizScore;
use App\Models\Score;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AcademicController extends Controller
{
    const SKILLS = ['Participation', 'Assignment', 'Mid Term Test', 'Final Test'];

    private function academicYear(Request $request): string
    {
        $data = $request->validate(['term' => ['sometimes', 'regex:/^\d{4}$/']]);

        return $data['term'] ?? (string) now()->year;
    }

    private function visible($query, Request $request)
    {
        if ($request->user()->hasRole('parent')) {
            return $query->whereHas('student', fn ($student) => $student->where('guardian_id', $request->user()->id));
        }

        if ($request->user()->hasRole('teacher') && ! $request->user()->hasAnyRole(['admin', 'academic_admin'])) {
            return $query->whereHas('classroom', fn ($classroom) => $classroom
                ->where('teacher_id', $request->user()->id)
                ->orWhereHas('teachers', fn ($teachers) => $teachers->whereKey($request->user()->id)));
        }

        return $query;
    }

    public function summary(Request $r)
    {
        $term = $this->academicYear($r);
        $en = $this->visible(Enrollment::where('term', $term), $r);
        $enrollments = (clone $en)->get(['id', 'student_id', 'classroom_id']);
        $ids = $enrollments->pluck('student_id');
        $enrollmentIds = $enrollments->pluck('id');
        $attendance = Attendance::whereIn('enrollment_id', $enrollmentIds)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $classrooms = Classroom::where('term', $term);
        if ($r->user()->hasRole('teacher') && ! $r->user()->hasAnyRole(['admin', 'academic_admin'])) {
            $classrooms->where(function ($query) use ($r) {
                $query->where('teacher_id', $r->user()->id)
                    ->orWhereHas('teachers', fn ($teachers) => $teachers->whereKey($r->user()->id));
            });
        }

        $quizCounts = Quiz::whereIn('classroom_id', $enrollments->pluck('classroom_id')->filter()->unique())
            ->where('academic_year', (int) substr($term, 0, 4))
            ->selectRaw('classroom_id, count(*) as aggregate')
            ->groupBy('classroom_id')
            ->pluck('aggregate', 'classroom_id');
        $quizScores = QuizScore::whereIn('enrollment_id', $enrollmentIds)
            ->whereHas('quiz', fn ($query) => $query->where('academic_year', (int) substr($term, 0, 4)))
            ->selectRaw('enrollment_id, count(*) as aggregate')
            ->groupBy('enrollment_id')
            ->pluck('aggregate', 'enrollment_id');
        $scores = Score::whereIn('enrollment_id', $enrollmentIds)
            ->whereIn('skill', ['Assignment', 'Mid Term Test', 'Final Test'])
            ->get(['enrollment_id', 'skill'])
            ->groupBy('enrollment_id');
        $scoresFilled = 0;
        $scoresTarget = 0;
        foreach ($enrollments as $enrollment) {
            $quizCount = (int) ($quizCounts[$enrollment->classroom_id] ?? 0);
            $enrollmentScores = $scores->get($enrollment->id, collect());
            $scoresFilled += $enrollmentScores->whereIn('skill', ['Mid Term Test', 'Final Test'])->count();
            $scoresTarget += 2 + max(1, $quizCount);
            $scoresFilled += $quizCount > 0
                ? (int) ($quizScores[$enrollment->id] ?? 0)
                : $enrollmentScores->where('skill', 'Assignment')->count();
        }

        return [
            'students' => Student::where('status', 'active')->whereIn('id', $ids)->count(),
            'enrollments' => $enrollments->count(),
            'pending' => (clone $en)->where('status', 'pending')->count(),
            'classes' => $classrooms->count(),
            'scoresFilled' => $scoresFilled,
            'scoresTarget' => $scoresTarget,
            'attendance' => ['present' => $attendance->get('present', 0), 'excused' => $attendance->get('excused', 0), 'sick' => $attendance->get('sick', 0), 'absent' => $attendance->get('absent', 0)],
        ];
    }

    public function roster(Request $r)
    {
        $term = $this->academicYear($r);
        $q = $this->visible(Enrollment::with(['student', 'classroom.teacher', 'classroom.teachers', 'scores', 'attendances', 'quizScores.quiz'])->where('term', $term), $r);
        if ($r->user()->hasRole('parent') && ! $r->boolean('include_pending')) {
            $q->whereNotNull('published_at');
        }

        $enrollments = $q->get();
        $quizCounts = Quiz::whereIn('classroom_id', $enrollments->pluck('classroom_id')->filter()->unique())
            ->where('academic_year', (int) substr($term, 0, 4))
            ->selectRaw('classroom_id, count(*) as aggregate')
            ->groupBy('classroom_id')
            ->pluck('aggregate', 'classroom_id');

        return $enrollments->map(fn ($e) => $this->row(
            $e,
            ! $r->user()->hasRole('parent') || $e->published_at !== null,
            ! $r->user()->hasRole('parent'),
            (int) ($quizCounts[$e->classroom_id] ?? 0),
        ));
    }

    private function row(Enrollment $e, bool $canSeeReport, bool $canSeeAttendance, int $quizCount): array
    {
        $attendance = $e->attendances->groupBy('status')->map->count();
        $scores = $canSeeReport ? $e->scores->pluck('value', 'skill') : collect();
        $quizScores = $canSeeReport
            ? $e->quizScores->filter(fn ($score) => (int) $score->quiz?->academic_year === (int) substr($e->term, 0, 4))->values()
            : collect();
        if ($quizCount > 0) {
            $scores->put('Assignment', $quizScores->isNotEmpty() ? round($quizScores->avg('value'), 2) : null);
        }
        $totalMeetings = $e->attendances->count();
        if ($canSeeReport) {
            $scores->put('Participation', $totalMeetings > 0 ? round(($attendance->get('present', 0) / $totalMeetings) * 100, 2) : 0);
        }
        $attendanceSummary = $canSeeAttendance ? ['present' => $attendance->get('present', 0), 'excused' => $attendance->get('excused', 0), 'sick' => $attendance->get('sick', 0), 'absent' => $attendance->get('absent', 0)] : ['present' => 0, 'excused' => 0, 'sick' => 0, 'absent' => 0];

        $teacherNames = $e->classroom?->teachers->pluck('name')->all() ?? [];
        if ($teacherNames === [] && $e->classroom?->teacher) {
            $teacherNames[] = $e->classroom->teacher->name;
        }

        return [
            'id' => $e->id,
            'student_id' => $e->student_id,
            'classroom_id' => $e->classroom_id,
            'note' => $canSeeReport ? $e->note : null,
            'status_note' => $e->status_note,
            'status' => $e->status,
            'requires_placement_test' => $e->requires_placement_test,
            'placement_test_completed_at' => $e->placement_test_completed_at,
            'confirmed_at' => $e->confirmed_at,
            'teacher_verified_at' => $e->teacher_verified_at,
            'academic_verified_at' => $e->academic_verified_at,
            'published_at' => $e->published_at,
            'revision_requested_at' => $e->revision_requested_at,
            'report_status' => $e->published_at ? 'published' : ($e->revision_requested_at ? 'draft' : ($e->teacher_verified_at ? 'awaiting_academic_approval' : 'draft')),
            'name' => $e->student->name,
            'nis' => $e->student->nis,
            'gender' => $e->student->gender,
            'birth_date' => $e->student->birth_date,
            'school_name' => $e->student->school_name,
            'school_class' => $e->student->school_class,
            'sector' => $e->student->sector,
            'phone' => $e->student->phone,
            'guardian_name' => $e->student->guardian?->name,
            'guardian_email' => $e->student->guardian?->email,
            'guardian_phone' => $e->student->guardian_phone,
            'guardian_relation' => $e->student->guardian_relation,
            'level' => $e->level_snapshot ?? $e->student->level,
            'class' => $e->classroom?->name ?? 'Waiting for class placement',
            'teacher_name' => implode(', ', $teacherNames),
            'coordinator_name' => 'Academic Admin',
            'scores' => $scores,
            'quiz_count' => $quizCount,
            'quiz_scores' => $canSeeReport ? $quizScores->map(fn ($score) => [
                'quiz_id' => $score->quiz_id,
                'quiz_name' => $score->quiz?->name,
                'score' => $score->value,
            ])->values() : [],
            'attendance' => $attendanceSummary,
        ];
    }

    public function attendance(Request $r)
    {
        $date = $r->query('date', now()->toDateString());
        $q = $this->visible(Enrollment::with(['student', 'classroom', 'attendances' => fn ($a) => $a->whereDate('date', $date)])->where('term', $this->academicYear($r)), $r);

        return $q->get()->map(fn ($e) => ['id' => $e->id, 'name' => $e->student->name, 'class' => $e->classroom?->name ?? 'Waiting for class placement', 'status' => $e->attendances->first()?->status ?? 'present', 'note' => $e->attendances->first()?->note, 'published_at' => $e->published_at]);
    }

    public function saveAttendance(Request $r)
    {
        abort_unless($r->user()->hasRole('teacher'), 403);
        $data = $r->validate(['date' => 'required|date', 'rows' => 'required|array', 'rows.*.id' => 'exists:enrollments,id', 'rows.*.status' => 'in:present,excused,sick,absent', 'rows.*.note' => 'nullable|string|max:300']);
        $allowed = Enrollment::whereIn('id', collect($data['rows'])->pluck('id'))
            ->whereHas('classroom', fn ($classroom) => $classroom
                ->where('teacher_id', $r->user()->id)
                ->orWhereHas('teachers', fn ($teachers) => $teachers->whereKey($r->user()->id)))
            ->pluck('id')->all();
        abort_unless(count($allowed) === count($data['rows']), 403, 'Anda tidak berwenang mengubah absensi kelas ini.');
        abort_if(Enrollment::whereIn('id', $allowed)->whereNotNull('published_at')->exists(), 409, 'E-report yang sudah dipublikasikan harus dibuka untuk revisi sebelum absensi diubah.');
        Enrollment::whereIn('id', $allowed)->update(['teacher_verified_at' => null, 'academic_verified_at' => null, 'published_at' => null]);
        foreach ($data['rows'] as $row) {
            Attendance::updateOrCreate(['enrollment_id' => $row['id'], 'date' => $data['date']], ['status' => $row['status'], 'note' => $row['note'] ?? null]);
        }

        return ['ok' => true];
    }

    public function attendanceReport(Request $r)
    {
        $data = $r->validate(['term' => ['required', 'regex:/^\d{4}$/'], 'from' => 'nullable|date', 'to' => 'nullable|date|after_or_equal:from']);
        $q = $this->visible(Enrollment::with(['student', 'classroom', 'attendances']), $r)->where('term', $data['term']);

        return $q->get()->map(function ($enrollment) use ($data) {
            $attendance = $enrollment->attendances->filter(fn ($item) => (! $data['from'] || $item->date->toDateString() >= $data['from']) && (! $data['to'] || $item->date->toDateString() <= $data['to']))->groupBy('status')->map->count();

            return ['id' => $enrollment->id, 'name' => $enrollment->student->name, 'class' => $enrollment->classroom?->name ?? 'Waiting for class placement', 'present' => $attendance->get('present', 0), 'excused' => $attendance->get('excused', 0), 'sick' => $attendance->get('sick', 0), 'absent' => $attendance->get('absent', 0), 'total' => $attendance->sum()];
        });
    }

    public function exportAttendance(Request $r)
    {
        $rows = $this->attendanceReport($r);

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Nama', 'Kelas', 'Hadir', 'Izin', 'Sakit', 'Alpa', 'Total pertemuan']);
            foreach ($rows as $row) {
                fputcsv($out, [$row['name'], $row['class'], $row['present'], $row['excused'], $row['sick'], $row['absent'], $row['total']]);
            }
            fclose($out);
        }, 'rekap-absensi-'.$r->query('term').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function saveScores(Request $r)
    {
        abort_unless($r->user()->hasRole('teacher'), 403);
        $data = $r->validate([
            'rows' => 'required|array',
            'rows.*.id' => 'required|exists:enrollments,id',
            'rows.*.scores' => 'required|array',
            'rows.*.scores.*' => 'nullable|numeric|between:0,100',
            'rows.*.note' => 'nullable|string|max:500',
        ]);
        $allowed = Enrollment::whereIn('id', collect($data['rows'])->pluck('id'))
            ->whereHas('classroom', fn ($classroom) => $classroom
                ->where('teacher_id', $r->user()->id)
                ->orWhereHas('teachers', fn ($teachers) => $teachers->whereKey($r->user()->id)))
            ->pluck('id')->all();
        abort_unless(count($allowed) === count($data['rows']), 403, 'Anda tidak berwenang mengubah nilai kelas ini.');
        abort_if(Enrollment::whereIn('id', $allowed)->whereNotNull('published_at')->exists(), 409, 'E-report yang sudah dipublikasikan harus dibuka untuk revisi sebelum nilai diubah.');

        DB::transaction(function () use ($data, $allowed) {
            Enrollment::whereIn('id', $allowed)->update(['teacher_verified_at' => null, 'academic_verified_at' => null]);
            foreach ($data['rows'] as $row) {
                if (array_key_exists('note', $row)) {
                    Enrollment::whereKey($row['id'])->update(['note' => $row['note']]);
                }
                foreach ($row['scores'] as $skill => $value) {
                    if (! in_array($skill, array_slice(self::SKILLS, 2), true)) {
                        continue;
                    }
                    if ($value === null) {
                        Score::where('enrollment_id', $row['id'])->where('skill', $skill)->delete();
                    } else {
                        Score::updateOrCreate(
                            ['enrollment_id' => $row['id'], 'skill' => $skill],
                            ['value' => $value],
                        );
                    }
                }
            }
        });

        return ['ok' => true];
    }

    public function proposeEnrollment(Request $r)
    {
        abort_unless($r->user()->hasAnyRole(['admin', 'academic_admin']), 403);
        $period = $r->validate([
            'from' => ['required', 'regex:/^\d{4}$/'],
            'to' => ['required', 'regex:/^\d{4}$/'],
        ]);
        abort_unless((int) $period['to'] === (int) $period['from'] + 1, 422, 'Enrollment must move to the next academic year.');
        $levels = ['MATTHEW A', 'MATTHEW B', 'MARK', 'LUKE', 'JOHN', 'TIMOTHY', 'GENESIS', 'ECSC'];
        $created = 0;
        $held = 0;
        $graduated = 0;
        $weights = AssessmentWeight::firstOrCreate(
            ['term' => $r->from],
            ['participation' => 20, 'assignment' => 30, 'mid_term_test' => 20, 'final_test' => 30],
        );

        foreach (Enrollment::with(['classroom.teachers', 'classroom.teacher', 'student', 'scores', 'attendances', 'quizScores'])
            ->where('term', $r->from)
            ->where('status', 'confirmed')
            ->get() as $enrollment) {
            if (! $enrollment->classroom) {
                $held++;
                continue;
            }

            $scores = $enrollment->scores->pluck('value', 'skill');
            $assignmentScores = $enrollment->quizScores->pluck('value');
            $quizCount = Quiz::where('classroom_id', $enrollment->classroom_id)
                ->where('academic_year', (int) substr($enrollment->term, 0, 4))
                ->count();
            if ($quizCount > 0 && $assignmentScores->count() !== $quizCount) {
                $held++;
                continue;
            }
            $assignment = $assignmentScores->isNotEmpty()
                ? $assignmentScores->avg()
                : $scores->get('Assignment');
            if ($assignment === null || ! $scores->has('Mid Term Test') || ! $scores->has('Final Test')) {
                $held++;
                continue;
            }

            $totalMeetings = $enrollment->attendances->count();
            $participation = $totalMeetings > 0
                ? ($enrollment->attendances->where('status', 'present')->count() / $totalMeetings) * 100
                : 0;
            $finalScore = round(
                $participation * ($weights->participation / 100)
                + $assignment * ($weights->assignment / 100)
                + $scores->get('Mid Term Test') * ($weights->mid_term_test / 100)
                + $scores->get('Final Test') * ($weights->final_test / 100),
                2,
            );
            $level = $enrollment->level_snapshot ?? $enrollment->student->level;
            $levelIndex = array_search(strtoupper($level), $levels, true);

            if ($finalScore >= 65 && $levelIndex === count($levels) - 1) {
                $enrollment->student->update(['status' => 'graduated']);
                $graduated++;
                continue;
            }

            if ($finalScore >= 65 && $levelIndex !== false) {
                $level = $levels[$levelIndex + 1];
            } elseif ($levelIndex === false) {
                $held++;
                continue;
            }

            $targetClassroom = Classroom::firstOrCreate(
                ['name' => $level, 'term' => $r->to],
                ['teacher_id' => $enrollment->classroom->teacher_id],
            );
            $teacherIds = $enrollment->classroom->teachers->pluck('id')->all();
            if ($teacherIds === [] && $enrollment->classroom->teacher_id) {
                $teacherIds = [$enrollment->classroom->teacher_id];
            }
            $teacherIds = array_values(array_filter($teacherIds, function ($teacherId) use ($targetClassroom, $r) {
                return ! Classroom::where('term', $r->to)
                    ->where('id', '!=', $targetClassroom->id)
                    ->where(function ($query) use ($teacherId) {
                        $query->where('teacher_id', $teacherId)
                            ->orWhereHas('teachers', fn ($teachers) => $teachers->whereKey($teacherId));
                    })
                    ->exists();
            }));
            $teacherIds = array_slice(array_unique($teacherIds), 0, 3);
            $targetClassroom->teachers()->syncWithoutDetaching($teacherIds);
            if ($teacherIds !== []) {
                $targetClassroom->update(['teacher_id' => $teacherIds[0]]);
            }
            $nextEnrollment = Enrollment::firstOrCreate(
                ['student_id' => $enrollment->student_id, 'term' => $r->to],
                ['classroom_id' => $targetClassroom->id, 'level_snapshot' => $level, 'status' => 'pending', 'requires_placement_test' => false],
            );
            if ($nextEnrollment->wasRecentlyCreated) {
                $enrollment->student->update(['level' => $level]);
                $created++;
            }
        }

        return ['created' => $created, 'held' => $held, 'graduated' => $graduated];
    }

    public function setStatus(Request $r, Enrollment $enrollment)
    {
        $isParent = $r->user()->hasRole('parent');
        abort_unless($isParent || $r->user()->hasAnyRole(['admin', 'academic_admin']), 403);
        $data = $r->validate([
            'status' => 'required|in:pending,confirmed,not_confirmed,left',
            'status_note' => 'nullable|string|max:500',
            'placement_test_completed' => 'sometimes|boolean',
            'level' => 'nullable|in:MATTHEW A,MATTHEW B,MARK,LUKE,JOHN,TIMOTHY,GENESIS,ECSC',
            'classroom_id' => 'nullable|exists:classrooms,id',
        ]);
        if ($isParent) {
            abort_unless($enrollment->student()->where('guardian_id', $r->user()->id)->exists(), 403);
            abort_unless($data['status'] === 'left', 403);
        } elseif ($data['status'] === 'confirmed' && $enrollment->requires_placement_test) {
            abort_unless($data['placement_test_completed'] ?? false, 422, 'Placement test harus diselesaikan sebelum konfirmasi.');
            abort_unless(isset($data['level']), 422, 'Level harus dipilih setelah placement test.');
            $classroom = Classroom::firstOrCreate([
                'name' => $data['level'],
                'term' => $enrollment->term,
            ]);
            $enrollment->student->update(['level' => $data['level']]);
            $data['level_snapshot'] = $data['level'];
            $data['placement_test_completed_at'] = now();
            $data['classroom_id'] = $classroom->id;
        }
        if (isset($data['classroom_id'])) {
            $classroom = Classroom::whereKey($data['classroom_id'])->where('term', $enrollment->term)->firstOrFail();
            if (isset($data['level'])) {
                abort_unless($classroom->name === $data['level'], 422, 'Kelas harus sesuai dengan level yang ditentukan.');
            }
            $data['classroom_id'] = $classroom->id;
        }
        if ($data['status'] === 'not_confirmed') {
            $data['confirmed_at'] = null;
        } else {
            $data['confirmed_at'] = $data['status'] === 'confirmed' ? now() : null;
        }
        unset($data['placement_test_completed'], $data['level']);
        $enrollment->update($data);

        return $enrollment->fresh();
    }

    public function export(Request $r)
    {
        abort_unless($r->user()->hasAnyRole(['admin', 'academic_admin', 'teacher']), 403);
        $rows = $this->roster($r);

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['NIS', 'Nama', 'Jenis kelamin', 'Tanggal lahir', 'Nama sekolah', 'Kelas sekolah', 'Sektor', 'Telepon murid', 'Nama wali', 'Hubungan wali', 'Telepon wali', 'Email wali', 'Level', 'Kelas BEC', 'Status', ...self::SKILLS, 'Catatan pengajar']);
            foreach ($rows as $row) {
                fputcsv($out, [$row['nis'] ?? '', $row['name'], $row['gender'] ?? '', $row['birth_date'] ?? '', $row['school_name'] ?? '', $row['school_class'] ?? '', $row['sector'] ?? '', $row['phone'] ?? '', $row['guardian_name'] ?? '', $row['guardian_relation'] ?? '', $row['guardian_phone'] ?? '', $row['guardian_email'] ?? '', $row['level'], $row['class'], $row['status'], ...array_map(fn ($skill) => $row['scores']->get($skill, ''), self::SKILLS), $row['note'] ?? '']);
            }
            fclose($out);
        }, 'data-akademik-'.($r->query('term', (string) now()->year)).'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
