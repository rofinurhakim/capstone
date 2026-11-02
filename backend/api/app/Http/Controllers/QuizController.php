<?php

namespace App\Http\Controllers;

use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Quiz;
use App\Models\QuizScore;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuizController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'classroom_id' => 'required|exists:classrooms,id',
            'term' => ['required', 'regex:/^\d{4}$/'],
        ]);
        $classroom = Classroom::findOrFail($data['classroom_id']);
        $this->authorizeClass($request->user(), $classroom);
        $year = (int) substr($data['term'], 0, 4);

        return Quiz::with('scores:id,quiz_id,enrollment_id,value')
            ->where('classroom_id', $classroom->id)
            ->where('academic_year', $year)
            ->orderBy('id')
            ->get(['id', 'classroom_id', 'academic_year', 'name']);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->hasAnyRole(['admin', 'academic_admin', 'teacher']), 403);
        $data = $request->validate([
            'classroom_id' => 'required|exists:classrooms,id',
            'term' => ['required', 'regex:/^\d{4}$/'],
            'name' => 'required|string|max:100',
        ]);
        $classroom = Classroom::findOrFail($data['classroom_id']);
        $this->authorizeClass($request->user(), $classroom);
        abort_unless((int) substr($data['term'], 0, 4) === (int) substr($classroom->term, 0, 4), 422, 'Quiz year must match the class academic year.');

        return Quiz::create([
            'classroom_id' => $classroom->id,
            'academic_year' => (int) substr($data['term'], 0, 4),
            'name' => $data['name'],
            'created_by' => $request->user()->id,
        ]);
    }

    public function saveScores(Request $request)
    {
        abort_unless($request->user()->hasRole('teacher'), 403);
        $data = $request->validate([
            'scores' => 'required|array',
            'scores.*.quiz_id' => 'required|exists:quizzes,id',
            'scores.*.enrollment_id' => 'required|exists:enrollments,id',
            'scores.*.value' => 'nullable|numeric|between:0,100',
        ]);
        $records = collect($data['scores'])->map(function (array $score) use ($request) {
            $quiz = Quiz::findOrFail($score['quiz_id']);
            $enrollment = Enrollment::with('classroom')->findOrFail($score['enrollment_id']);
            abort_unless(
                $quiz->classroom_id === $enrollment->classroom_id
                    && (int) substr($enrollment->term, 0, 4) === $quiz->academic_year,
                422,
                'Quiz and student enrollment must belong to the same class and academic year.',
            );
            $this->authorizeClass($request->user(), $enrollment->classroom);
            abort_if($enrollment->published_at, 409, 'E-report yang sudah dipublikasikan harus dibuka untuk revisi terlebih dahulu.');

            return [$score, $enrollment];
        });

        DB::transaction(function () use ($records) {
            foreach ($records as [$score, $enrollment]) {
                if ($score['value'] === null) {
                    QuizScore::where('quiz_id', $score['quiz_id'])
                        ->where('enrollment_id', $score['enrollment_id'])
                        ->delete();
                } else {
                    QuizScore::updateOrCreate(
                        ['quiz_id' => $score['quiz_id'], 'enrollment_id' => $score['enrollment_id']],
                        ['value' => $score['value']],
                    );
                }
                $enrollment->update(['teacher_verified_at' => null, 'academic_verified_at' => null]);
            }
        });

        return ['ok' => true];
    }

    private function authorizeClass(User $user, Classroom $classroom): void
    {
        if ($user->hasAnyRole(['admin', 'academic_admin'])) {
            return;
        }

        abort_unless(
            $user->hasRole('teacher')
                && ($classroom->teacher_id === $user->id || $classroom->teachers()->whereKey($user->id)->exists()),
            403,
        );
    }
}
