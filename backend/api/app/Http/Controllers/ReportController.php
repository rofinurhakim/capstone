<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\Quiz;
use App\Models\QuizScore;
use App\Models\ReportPublicationSchedule;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function verify(Request $request, Enrollment $enrollment)
    {
        $user = $request->user();
        $isTeacher = $user->hasRole('teacher');
        $isAcademic = $user->hasAnyRole(['admin', 'academic_admin']);
        abort_unless($isTeacher || $isAcademic, 403);
        abort_if($enrollment->published_at, 409, 'E-report yang sudah dipublikasikan harus dibuka untuk revisi terlebih dahulu.');
        $stage = $request->input('stage', $isAcademic ? 'academic' : 'teacher');
        if ($stage === 'teacher') {
            abort_unless($isTeacher, 403);
            abort_unless(
                $enrollment->classroom?->teachers()->whereKey($user->id)->exists()
                    || $enrollment->classroom?->teacher_id === $user->id,
                403,
            );
            $requiredExams = ['Mid Term Test', 'Final Test'];
            $hasAssignmentScore = $enrollment->scores()->where('skill', 'Assignment')->exists();
            if ($enrollment->classroom_id) {
                $year = (int) substr($enrollment->term, 0, 4);
                $quizIds = Quiz::where('classroom_id', $enrollment->classroom_id)
                    ->where('academic_year', $year)
                    ->pluck('id');
                $assignmentComplete = $quizIds->isNotEmpty()
                    ? QuizScore::where('enrollment_id', $enrollment->id)->whereIn('quiz_id', $quizIds)->count() === $quizIds->count()
                    : $hasAssignmentScore;
            } else {
                $assignmentComplete = $hasAssignmentScore;
            }
            abort_if(
                ! $assignmentComplete || $enrollment->scores()->whereIn('skill', $requiredExams)->count() !== count($requiredExams),
                409,
                'Semua komponen nilai harus diisi sebelum e-report diverifikasi.',
            );
            $enrollment->update(['teacher_verified_at' => now()]);
        }
        if ($stage === 'academic') {
            abort_unless($isAcademic, 403);
            abort_if(! $enrollment->teacher_verified_at, 409, 'Teacher harus memverifikasi e-report sebelum dipublikasikan.');
            $schedule = ReportPublicationSchedule::where('term', $enrollment->term)->first();
            abort_if($schedule?->publish_at->isFuture(), 409, 'Publikasi belum mencapai tanggal yang dijadwalkan.');
            $enrollment->update(['academic_verified_at' => now(), 'published_at' => now(), 'revision_requested_at' => null]);
        }
        abort_unless(in_array($stage, ['teacher', 'academic'], true), 422);

        return $enrollment->fresh();
    }

    public function reopen(Request $request, Enrollment $enrollment)
    {
        abort_unless($request->user()->hasRole('teacher'), 403);
        abort_unless(
            $enrollment->classroom?->teachers()->whereKey($request->user()->id)->exists()
                || $enrollment->classroom?->teacher_id === $request->user()->id,
            403,
        );
        abort_unless($enrollment->published_at, 409, 'E-report belum pernah dipublikasikan.');
        $schedule = ReportPublicationSchedule::where('term', $enrollment->term)->first();
        abort_unless($schedule && ! $schedule->publish_at->isFuture(), 409, 'Revisi hanya tersedia setelah tanggal publikasi.');

        $enrollment->update([
            'teacher_verified_at' => null,
            'academic_verified_at' => null,
            'published_at' => null,
            'revision_requested_at' => now(),
        ]);

        return $enrollment->fresh();
    }
}
