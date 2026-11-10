<?php

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\User;
use Database\Seeders\ExampleTeachersAndClassesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ExampleTeachersAndClassesSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_eight_example_teachers_and_all_classes_for_available_years_idempotently(): void
    {
        $this->seed(ExampleTeachersAndClassesSeeder::class);

        $teachers = User::whereIn('email', [
            'guru@kursus.test',
            'guru2@kursus.test',
            'guru3@kursus.test',
            'guru4@kursus.test',
            'guru5@kursus.test',
            'guru6@kursus.test',
            'guru7@kursus.test',
            'guru8@kursus.test',
        ])->get();

        $this->assertCount(8, $teachers);
        foreach ($teachers as $teacher) {
            $this->assertSame('teacher', $teacher->role);
            $this->assertTrue(Hash::check('password', $teacher->password));
        }

        $terms = [(string) now()->year, (string) (now()->year + 1)];
        foreach ($terms as $term) {
            $classes = Classroom::with('teachers')
                ->where('term', $term)
                ->get();

            $this->assertCount(8, $classes);
            $this->assertEqualsCanonicalizing(Classroom::LEVELS, $classes->pluck('name')->all());
            $this->assertCount(8, $classes->pluck('teacher_id')->unique());
            foreach ($classes as $classroom) {
                $this->assertCount(1, $classroom->teachers);
            }
        }

        $this->seed(ExampleTeachersAndClassesSeeder::class);
        $this->assertSame(8, User::where('role', 'teacher')->count());
        $this->assertSame(16, Classroom::count());
    }
}
