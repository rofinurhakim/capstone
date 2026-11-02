<?php

namespace App\Http\Controllers;

use App\Models\Classroom;
use App\Models\ClassroomTheme;
use App\Models\AssessmentWeight;
use App\Models\Enrollment;
use App\Models\ReportPublicationSchedule;
use App\Models\User;
use Illuminate\Http\Request;

class AcademicExtrasController extends Controller
{
    private function canManage(Request $request): void
    {
        abort_unless($request->user()->hasAnyRole(['admin', 'academic_admin']), 403);
    }

    public function schedules()
    {
        return ReportPublicationSchedule::orderByDesc('publish_at')->get();
    }

    public function storeSchedule(Request $request)
    {
        $this->canManage($request);
        $data = $request->validate([
            'term' => ['required', 'regex:/^\d{4}$/'],
            'publish_at' => 'required|date',
        ]);
        abort_if(
            Enrollment::where('term', $data['term'])->whereNotNull('published_at')->exists(),
            409,
            'Jadwal tidak dapat diubah setelah rapor periode ini dipublikasikan.',
        );

        return ReportPublicationSchedule::updateOrCreate(
            ['term' => $data['term']],
            $data + ['created_by' => $request->user()->id, 'status' => 'scheduled'],
        );
    }

    public function publishSchedule(Request $request, ReportPublicationSchedule $schedule)
    {
        $this->canManage($request);
        abort_if($schedule->publish_at->isFuture(), 409, 'Publikasi belum mencapai tanggal yang dijadwalkan.');
        Enrollment::where('term', $schedule->term)
            ->where('status', 'confirmed')
            ->whereNotNull('teacher_verified_at')
            ->whereNull('published_at')
            ->update(['academic_verified_at' => now(), 'published_at' => now()]);
        $hasUnpublishedReports = Enrollment::where('term', $schedule->term)
            ->where('status', 'confirmed')
            ->whereNull('published_at')
            ->exists();
        $schedule->update([
            'status' => $hasUnpublishedReports ? 'partial' : 'published',
            'published_by' => $request->user()->id,
        ]);

        return $schedule->fresh();
    }

    public function assessmentWeights(Request $request)
    {
        $data = $request->validate(['term' => ['required', 'regex:/^\d{4}$/']]);
        $weights = AssessmentWeight::firstOrCreate(
            ['term' => $data['term']],
            ['participation' => 20, 'assignment' => 30, 'mid_term_test' => 20, 'final_test' => 30],
        );

        return [
            'term' => $weights->term,
            'weights' => [
                'Participation' => $weights->participation,
                'Assignment' => $weights->assignment,
                'Mid Term Test' => $weights->mid_term_test,
                'Final Test' => $weights->final_test,
            ],
        ];
    }

    public function updateAssessmentWeights(Request $request)
    {
        $this->canManage($request);
        $data = $request->validate([
            'term' => ['required', 'regex:/^\d{4}$/'],
            'weights' => 'required|array:Participation,Assignment,Mid Term Test,Final Test',
            'weights.Participation' => 'required|integer|min:0|max:100',
            'weights.Assignment' => 'required|integer|min:0|max:100',
            'weights.Mid Term Test' => 'required|integer|min:0|max:100',
            'weights.Final Test' => 'required|integer|min:0|max:100',
        ]);
        abort_if(
            Enrollment::where('term', $data['term'])
                ->where(fn ($query) => $query->whereNotNull('teacher_verified_at')->orWhereNotNull('published_at'))
                ->exists(),
            409,
            'Bobot tidak dapat diubah setelah e-report mulai diverifikasi.',
        );
        abort_unless(
            $data['weights']['Participation'] + $data['weights']['Assignment'] + $data['weights']['Mid Term Test'] + $data['weights']['Final Test'] === 100,
            422,
            'Total bobot penilaian harus 100%.',
        );

        $weights = AssessmentWeight::updateOrCreate(
            ['term' => $data['term']],
            [
                'participation' => $data['weights']['Participation'],
                'assignment' => $data['weights']['Assignment'],
                'mid_term_test' => $data['weights']['Mid Term Test'],
                'final_test' => $data['weights']['Final Test'],
            ],
        );

        return [
            'term' => $weights->term,
            'weights' => [
                'Participation' => $weights->participation,
                'Assignment' => $weights->assignment,
                'Mid Term Test' => $weights->mid_term_test,
                'Final Test' => $weights->final_test,
            ],
        ];
    }

    public function themes(Request $request)
    {
        $data = $request->validate(['classroom_id' => 'required|exists:classrooms,id', 'term' => ['required', 'regex:/^\d{4}$/']]);
        $year = (int) substr($data['term'], 0, 4);
        $classroom = Classroom::findOrFail($data['classroom_id']);
        $classroomIds = Classroom::where('name', $classroom->name)
            ->where('term', (string) $year)
            ->pluck('id');

        return ClassroomTheme::whereIn('classroom_id', $classroomIds)
            ->where('academic_year', $year)
            ->orderBy('position')
            ->get()
            ->unique('theme')
            ->values();
    }

    public function storeTheme(Request $request)
    {
        $this->canManage($request);
        $data = $request->validate([
            'classroom_id' => 'required|exists:classrooms,id',
            'term' => ['required', 'regex:/^\d{4}$/'],
            'theme' => 'required|string|max:150',
            'position' => 'nullable|integer|min:1|max:100',
        ]);
        $year = (int) substr($data['term'], 0, 4);
        $classroom = Classroom::findOrFail($data['classroom_id']);
        abort_unless((int) $classroom->term === $year, 422, 'Theme year must match the class academic year.');

        return ClassroomTheme::create($data + ['academic_year' => $year]);
    }

    public function deleteTheme(Request $request, ClassroomTheme $theme)
    {
        $this->canManage($request);
        $theme->delete();

        return ['ok' => true];
    }

    public function teacherContacts(Request $request)
    {
        abort_unless($request->user()->hasRole('parent'), 403);

        return User::query()->where('role', 'teacher')->whereHas('classrooms.enrollments.student', fn ($student) => $student->where('guardian_id', $request->user()->id))->get(['users.id', 'users.name', 'users.email']);
    }
}
