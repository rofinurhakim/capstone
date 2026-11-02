<?php

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\ReportCardExampleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportCardExampleSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_report_card_examples_include_scores_attendance_comments_and_themes(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $secondTeacher = User::factory()->create(['role' => 'teacher']);
        $firstClassroom = Classroom::create([
            'name' => 'MATTHEW A',
            'term' => '2026',
            'teacher_id' => $teacher->id,
        ]);
        $secondClassroom = Classroom::create([
            'name' => 'MARK',
            'term' => '2026',
            'teacher_id' => $secondTeacher->id,
        ]);
        $students = [];

        foreach (['Alya Putri', 'Raka Pratama', 'Nadia Salsabila', 'Dimas Ardiansyah'] as $index => $name) {
            $student = Student::create([
                'nis' => sprintf('S%04d', $index + 1),
                'name' => $name,
                'level' => 'MATTHEW A',
            ]);
            $classroom = $index < 2 ? $firstClassroom : $secondClassroom;
            Enrollment::create([
                'student_id' => $student->id,
                'classroom_id' => $classroom->id,
                'term' => '2026',
                'status' => 'confirmed',
            ]);
            $students[] = $student;
        }

        (new ReportCardExampleSeeder)->run();
        (new ReportCardExampleSeeder)->run();

        $this->assertDatabaseCount('attendances', 16);
        $this->assertDatabaseCount('classroom_themes', 6);
        $this->assertDatabaseHas('enrollments', [
            'student_id' => $students[0]->id,
            'term' => '2026',
            'note' => 'Alya participates with curiosity and is growing in confidence when sharing ideas in English.',
        ]);
        $this->assertDatabaseHas('scores', [
            'enrollment_id' => $students[0]->enrollments()->first()->id,
            'skill' => 'Assignment',
            'value' => 88,
        ]);

        $this->actingAs($teacher)
            ->getJson('/api/roster?term=2026')
            ->assertOk()
            ->assertJsonPath('0.scores.Participation', 75)
            ->assertJsonPath('0.note', 'Alya participates with curiosity and is growing in confidence when sharing ideas in English.');

        $this->actingAs($teacher)
            ->getJson('/api/themes?classroom_id='.$students[0]->enrollments()->first()->classroom_id.'&term=2026')
            ->assertOk()
            ->assertJsonCount(3);
    }
}
