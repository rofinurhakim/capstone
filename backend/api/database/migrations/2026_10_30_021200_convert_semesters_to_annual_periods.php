<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            $classroomMap = $this->mergeClassrooms();
            $this->mergeQuizzes();
            $this->mergeEnrollments($classroomMap);
            $this->mergeYearlyRecords('report_publication_schedules');
            $this->mergeYearlyRecords('assessment_weights');
            $this->mergeThemes($classroomMap);
            $this->normalizeEventYears();
        });
    }

    public function down(): void
    {
        throw new LogicException('Annual academic periods cannot be reversed because semester records were merged.');
    }

    private function annualYear(string $term): string
    {
        if (preg_match('/^(\d{4})(?:-[12])?$/', $term, $matches) !== 1) {
            throw new LogicException("Cannot convert unsupported academic period [{$term}].");
        }

        return $matches[1];
    }

    private function mergeClassrooms(): array
    {
        $classrooms = DB::table('classrooms')->orderBy('id')->get();
        $groups = $classrooms->groupBy(fn ($classroom) => $classroom->name.'|'.$this->annualYear($classroom->term));
        $classroomMap = [];

        foreach ($groups as $group) {
            $keeper = $group->first();
            $year = $this->annualYear($keeper->term);
            $teacherIds = DB::table('classroom_teacher')
                ->whereIn('classroom_id', $group->pluck('id'))
                ->pluck('teacher_id')
                ->merge($group->pluck('teacher_id'))
                ->filter()
                ->unique()
                ->sort()
                ->values();

            foreach ($group as $classroom) {
                $classroomMap[$classroom->id] = $keeper->id;
                if ($classroom->id !== $keeper->id) {
                    DB::table('enrollments')->where('classroom_id', $classroom->id)->update(['classroom_id' => $keeper->id]);
                    DB::table('quizzes')->where('classroom_id', $classroom->id)->update(['classroom_id' => $keeper->id]);
                    DB::table('classroom_themes')->where('classroom_id', $classroom->id)->update(['classroom_id' => $keeper->id]);
                }
            }

            DB::table('classrooms')->where('id', $keeper->id)->update([
                'term' => $year,
                'teacher_id' => $keeper->teacher_id ?? $teacherIds->first(),
            ]);

            foreach ($teacherIds as $teacherId) {
                DB::table('classroom_teacher')->insertOrIgnore([
                    'classroom_id' => $keeper->id,
                    'teacher_id' => $teacherId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $duplicates = $group->pluck('id')->reject(fn ($id) => $id === $keeper->id);
            if ($duplicates->isNotEmpty()) {
                DB::table('classroom_teacher')->whereIn('classroom_id', $duplicates)->delete();
                DB::table('classrooms')->whereIn('id', $duplicates)->delete();
            }
        }

        return $classroomMap;
    }

    private function mergeQuizzes(): void
    {
        $groups = DB::table('quizzes')
            ->orderBy('id')
            ->get()
            ->groupBy(fn ($quiz) => implode('|', [$quiz->classroom_id, $quiz->academic_year, $quiz->name]));

        foreach ($groups as $group) {
            $keeper = $group->first();
            $duplicates = $group->pluck('id')->reject(fn ($id) => $id === $keeper->id);
            if ($duplicates->isEmpty()) {
                continue;
            }

            $scores = DB::table('quiz_scores')->whereIn('quiz_id', $group->pluck('id'))->get();
            $scoresByEnrollment = $scores->groupBy('enrollment_id')->map(fn (Collection $items) => $items
                ->sortByDesc(fn ($score) => [$score->updated_at ?? '', $score->id])
                ->first());
            DB::table('quiz_scores')->whereIn('quiz_id', $group->pluck('id'))->delete();
            foreach ($scoresByEnrollment as $score) {
                $data = (array) $score;
                unset($data['id']);
                $data['quiz_id'] = $keeper->id;
                DB::table('quiz_scores')->insert($data);
            }
            DB::table('quizzes')->whereIn('id', $duplicates)->delete();
        }
    }

    private function mergeEnrollments(array $classroomMap): void
    {
        $enrollments = DB::table('enrollments')->orderBy('id')->get();
        $groups = $enrollments->groupBy(fn ($enrollment) => $enrollment->student_id.'|'.$this->annualYear($enrollment->term));

        foreach ($groups as $group) {
            $year = $this->annualYear($group->first()->term);
            $ordered = $group->sort(function ($left, $right) {
                return [$right->term, $right->updated_at, $right->id]
                    <=> [$left->term, $left->updated_at, $left->id];
            })->values();
            $latest = $ordered->first();
            $keeper = $group->sortBy('id')->first();
            $ids = $group->pluck('id')->all();
            $fields = array_intersect([
                'classroom_id',
                'level_snapshot',
                'status',
                'confirmed_at',
                'status_note',
                'requires_placement_test',
                'placement_test_completed_at',
                'note',
            ], array_keys((array) $latest));
            $values = [];
            foreach ($fields as $field) {
                $values[$field] = $latest->{$field};
            }
            if ($group->count() > 1 && in_array('note', $fields, true)) {
                $values['note'] = $ordered->first(fn ($enrollment) => is_string($enrollment->note) && trim($enrollment->note) !== '')?->note;
            }
            if ($values['classroom_id'] ?? null) {
                $values['classroom_id'] = $classroomMap[$values['classroom_id']] ?? $values['classroom_id'];
            }
            $values['term'] = $year;

            $this->mergeEnrollmentRecords('attendances', $ids, $keeper->id, 'date');
            $this->mergeEnrollmentRecords('scores', $ids, $keeper->id, 'skill');
            $this->mergeEnrollmentQuizScores($ids, $keeper->id);

            if ($group->count() > 1) {
                $values['teacher_verified_at'] = null;
                $values['academic_verified_at'] = null;
                $values['published_at'] = null;
                $values['revision_requested_at'] = null;
            }

            DB::table('enrollments')->whereIn('id', $group->pluck('id')->reject(fn ($id) => $id === $keeper->id))->delete();
            DB::table('enrollments')->where('id', $keeper->id)->update($values);
        }
    }

    private function mergeEnrollmentRecords(string $table, array $enrollmentIds, int $keeperId, string $uniqueColumn): void
    {
        $records = DB::table($table)->whereIn('enrollment_id', $enrollmentIds)->get();
        if ($records->isEmpty()) {
            return;
        }

        $latestByKey = $records->groupBy($uniqueColumn)->map(fn (Collection $group) => $group
            ->sortByDesc(fn ($record) => [$record->updated_at ?? '', $record->id])
            ->first());
        DB::table($table)->whereIn('enrollment_id', $enrollmentIds)->delete();

        foreach ($latestByKey as $record) {
            $data = (array) $record;
            unset($data['id']);
            $data['enrollment_id'] = $keeperId;
            DB::table($table)->insert($data);
        }
    }

    private function mergeEnrollmentQuizScores(array $enrollmentIds, int $keeperId): void
    {
        $records = DB::table('quiz_scores')->whereIn('enrollment_id', $enrollmentIds)->get();
        if ($records->isEmpty()) {
            return;
        }

        $latestByQuiz = $records->groupBy('quiz_id')->map(fn (Collection $group) => $group
            ->sortByDesc(fn ($record) => [$record->updated_at ?? '', $record->id])
            ->first());
        DB::table('quiz_scores')->whereIn('enrollment_id', $enrollmentIds)->delete();

        foreach ($latestByQuiz as $record) {
            $data = (array) $record;
            unset($data['id']);
            $data['enrollment_id'] = $keeperId;
            DB::table('quiz_scores')->insert($data);
        }
    }

    private function mergeYearlyRecords(string $table): void
    {
        $groups = DB::table($table)
            ->orderBy('id')
            ->get()
            ->groupBy(fn ($record) => $this->annualYear($record->term));

        foreach ($groups as $year => $group) {
            $keeper = $group->sortByDesc(fn ($record) => [$record->updated_at ?? '', $record->id])->first();
            DB::table($table)->whereIn('id', $group->pluck('id')->reject(fn ($id) => $id === $keeper->id))->delete();
            DB::table($table)->where('id', $keeper->id)->update(['term' => $year]);
        }
    }

    private function mergeThemes(array $classroomMap): void
    {
        foreach (DB::table('classroom_themes')->get() as $theme) {
            DB::table('classroom_themes')->where('id', $theme->id)->update([
                'classroom_id' => $classroomMap[$theme->classroom_id] ?? $theme->classroom_id,
                'term' => $this->annualYear($theme->term),
                'academic_year' => (int) $this->annualYear($theme->term),
            ]);
        }

        $groups = DB::table('classroom_themes')
            ->orderBy('position')
            ->orderBy('id')
            ->get()
            ->groupBy(fn ($theme) => implode('|', [$theme->classroom_id, $theme->term, $theme->theme]));
        foreach ($groups as $group) {
            DB::table('classroom_themes')->whereIn('id', $group->pluck('id')->slice(1))->delete();
        }
    }

    private function normalizeEventYears(): void
    {
        foreach (DB::table('academic_events')->whereNotNull('term')->get(['id', 'term']) as $event) {
            if (preg_match('/^\d{4}-[12]$/', $event->term) === 1) {
                DB::table('academic_events')->where('id', $event->id)->update(['term' => $this->annualYear($event->term)]);
            }
        }
    }
};
