<?php

namespace Database\Seeders;

use App\Models\Classroom;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class ExampleTeachersAndClassesSeeder extends Seeder
{
    private const EXAMPLE_TEACHERS = [
        ['name' => 'Pengajar Contoh', 'email' => 'guru@kursus.test', 'level' => 'MATTHEW A'],
        ['name' => 'Pengajar Contoh 2', 'email' => 'guru2@kursus.test', 'level' => 'MARK'],
        ['name' => 'Pengajar Contoh 3', 'email' => 'guru3@kursus.test', 'level' => 'MATTHEW B'],
        ['name' => 'Pengajar Contoh 4', 'email' => 'guru4@kursus.test', 'level' => 'LUKE'],
        ['name' => 'Pengajar Contoh 5', 'email' => 'guru5@kursus.test', 'level' => 'JOHN'],
        ['name' => 'Pengajar Contoh 6', 'email' => 'guru6@kursus.test', 'level' => 'TIMOTHY'],
        ['name' => 'Pengajar Contoh 7', 'email' => 'guru7@kursus.test', 'level' => 'GENESIS'],
        ['name' => 'Pengajar Contoh 8', 'email' => 'guru8@kursus.test', 'level' => 'ECSC'],
    ];

    public function run(): void
    {
        DB::transaction(function () {
            $teachersByLevel = [];

            foreach (self::EXAMPLE_TEACHERS as $example) {
                $teacher = User::firstOrNew(['email' => $example['email']]);
                if ($teacher->exists && $teacher->role !== 'teacher') {
                    throw new RuntimeException("Example teacher email {$example['email']} belongs to a non-teacher account.");
                }

                $teacher->forceFill([
                    'name' => $example['name'],
                    'role' => 'teacher',
                    'password' => Hash::make('password'),
                ])->save();
                $teachersByLevel[$example['level']] = $teacher;
            }

            $terms = DB::table('academic_years')
                ->pluck('term')
                ->merge(Classroom::query()->distinct()->pluck('term'))
                ->merge([(string) now()->year, (string) (now()->year + 1)])
                ->filter(fn ($term) => preg_match('/^\d{4}$/', (string) $term) === 1)
                ->unique()
                ->sort()
                ->values();

            foreach ($terms as $term) {
                foreach (Classroom::LEVELS as $level) {
                    $teacher = $teachersByLevel[$level];
                    $classroom = Classroom::firstOrCreate(
                        ['name' => $level, 'term' => $term],
                        ['teacher_id' => $teacher->id],
                    );

                    if ($classroom->wasRecentlyCreated) {
                        $classroom->teachers()->sync([$teacher->id]);
                    } elseif ($classroom->teachers()->count() === 0 && $classroom->teacher_id !== null) {
                        $classroom->teachers()->sync([$classroom->teacher_id]);
                    }
                }
            }
        });
    }
}
