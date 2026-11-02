<?php

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\ReEnrollmentExampleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReEnrollmentExampleSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_example_reenrollments_are_created_pending_for_all_sample_students(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $from = (string) now()->year;
        $to = (string) (now()->year + 1);
        $students = [];

        foreach (['Alya Putri', 'Raka Pratama', 'Nadia Salsabila', 'Dimas Ardiansyah'] as $index => $name) {
            $student = Student::create([
                'nis' => sprintf('S%04d', $index + 1),
                'name' => $name,
                'level' => 'MATTHEW A',
            ]);
            $classroom = Classroom::create([
                'name' => 'MATTHEW A',
                'term' => $from,
                'teacher_id' => $teacher->id,
            ]);
            Enrollment::create([
                'student_id' => $student->id,
                'classroom_id' => $classroom->id,
                'term' => $from,
                'status' => 'confirmed',
            ]);
            $students[] = $student;
        }

        $seeder = new ReEnrollmentExampleSeeder;
        $seeder->run();

        $this->assertDatabaseCount('enrollments', 8);
        foreach ($students as $student) {
            $this->assertDatabaseHas('enrollments', [
                'student_id' => $student->id,
                'term' => $to,
                'status' => 'pending',
                'confirmed_at' => null,
            ]);
        }

        $seeder->run();
        $this->assertDatabaseCount('enrollments', 8);
        $this->assertSame(4, Enrollment::where('term', $to)->where('status', 'pending')->count());
    }
}
