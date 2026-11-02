<?php

namespace Database\Seeders;

use App\Models\Classroom;
use App\Models\Enrollment;
use Illuminate\Database\Seeder;

class ReEnrollmentExampleSeeder extends Seeder
{
    public function run(): void
    {
        $from = (string) now()->year;
        $to = (string) (now()->year + 1);

        $examples = Enrollment::with(['classroom', 'student'])
            ->where('term', $from)
            ->whereHas('student', fn ($query) => $query->whereIn('nis', ['S0001', 'S0002', 'S0003', 'S0004']))
            ->get();

        foreach ($examples as $enrollment) {
            $classroom = Classroom::firstOrCreate(
                ['name' => $enrollment->classroom->name, 'term' => $to],
                ['teacher_id' => $enrollment->classroom->teacher_id],
            );

            Enrollment::updateOrCreate(
                ['student_id' => $enrollment->student_id, 'term' => $to],
                [
                    'classroom_id' => $classroom->id,
                    'level_snapshot' => $enrollment->level_snapshot ?? $enrollment->student->level,
                    'status' => 'pending',
                    'confirmed_at' => null,
                    'status_note' => null,
                ],
            );
        }
    }
}
