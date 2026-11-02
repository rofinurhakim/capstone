<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\ClassroomTheme;
use App\Models\Enrollment;
use App\Models\Score;
use Illuminate\Database\Seeder;

class ReportCardExampleSeeder extends Seeder
{
    public function run(): void
    {
        $term = (string) now()->year;
        $examples = [
            'S0001' => [
                'note' => 'Alya participates with curiosity and is growing in confidence when sharing ideas in English.',
                'scores' => ['Assignment' => 88, 'Mid Term Test' => 84, 'Final Test' => 91],
                'attendance' => ['present', 'present', 'present', 'excused'],
                'themes' => ['Greetings and introductions', 'Numbers and classroom objects', 'Family and body parts'],
            ],
            'S0002' => [
                'note' => 'Raka is making steady progress and contributes positively during classroom activities.',
                'scores' => ['Assignment' => 82, 'Mid Term Test' => 79, 'Final Test' => 86],
                'attendance' => ['present', 'present', 'present', 'present'],
                'themes' => ['Greetings and introductions', 'Numbers and classroom objects', 'Family and body parts'],
            ],
            'S0003' => [
                'note' => 'Nadia shows strong understanding and works thoughtfully through each assignment.',
                'scores' => ['Assignment' => 94, 'Mid Term Test' => 91, 'Final Test' => 96],
                'attendance' => ['present', 'present', 'present', 'present'],
                'themes' => ['Daily routines', 'Food and preferences', 'Describing people and places'],
            ],
            'S0004' => [
                'note' => 'Dimas is encouraged to keep practicing and ask questions whenever he needs support.',
                'scores' => ['Assignment' => 68, 'Mid Term Test' => 72, 'Final Test' => 70],
                'attendance' => ['present', 'present', 'excused', 'sick'],
                'themes' => ['Daily routines', 'Food and preferences', 'Describing people and places'],
            ],
        ];

        foreach ($examples as $nis => $example) {
            $enrollment = Enrollment::with('classroom')
                ->where('term', $term)
                ->whereHas('student', fn ($query) => $query->where('nis', $nis))
                ->first();

            if (! $enrollment || ! $enrollment->classroom) {
                continue;
            }

            $enrollment->update(['note' => $example['note']]);

            foreach ($example['scores'] as $skill => $value) {
                Score::updateOrCreate(
                    ['enrollment_id' => $enrollment->id, 'skill' => $skill],
                    ['value' => $value],
                );
            }

            foreach ($example['attendance'] as $index => $status) {
                $date = now()->subWeeks(4 - $index)->toDateString();
                $attendance = Attendance::where('enrollment_id', $enrollment->id)
                    ->whereDate('date', $date)
                    ->first() ?? new Attendance(['enrollment_id' => $enrollment->id, 'date' => $date]);
                $attendance->fill(['status' => $status, 'note' => null])->save();
            }

            foreach ($example['themes'] as $index => $theme) {
                ClassroomTheme::updateOrCreate(
                    ['classroom_id' => $enrollment->classroom_id, 'term' => $term, 'theme' => $theme],
                    ['academic_year' => (int) substr($term, 0, 4), 'position' => $index + 1],
                );
            }
        }
    }
}
