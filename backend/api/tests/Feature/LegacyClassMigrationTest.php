<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Score;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LegacyClassMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_legacy_classes_are_removed_without_deleting_student_history(): void
    {
        $student = Student::create([
            'nis' => 'STU-'.fake()->unique()->numerify('#####'),
            'name' => 'Legacy Student',
            'level' => 'Junior 1',
        ]);
        $legacyClass = Classroom::create(['name' => 'Kids 2 A', 'term' => '2026']);
        Classroom::create(['name' => 'Matthew A', 'term' => '2026']);
        $enrollment = Enrollment::create([
            'student_id' => $student->id,
            'classroom_id' => $legacyClass->id,
            'term' => '2026',
            'level_snapshot' => 'Junior 1',
            'status' => 'confirmed',
        ]);
        Attendance::create(['enrollment_id' => $enrollment->id, 'date' => '2026-03-01', 'status' => 'present']);
        Score::create(['enrollment_id' => $enrollment->id, 'skill' => 'Final Test', 'value' => 80]);

        $migration = require database_path('migrations/2026_11_01_000001_remove_legacy_classes.php');
        $migration->up();

        $this->assertDatabaseCount('classrooms', 1);
        $this->assertDatabaseHas('classrooms', ['name' => 'MATTHEW A', 'term' => '2026']);
        $this->assertDatabaseHas('enrollments', [
            'id' => $enrollment->id,
            'classroom_id' => null,
            'level_snapshot' => 'Junior 1',
        ]);
        $this->assertDatabaseHas('students', ['id' => $student->id, 'level' => 'Junior 1']);
        $this->assertDatabaseHas('attendances', ['enrollment_id' => $enrollment->id, 'status' => 'present']);
        $this->assertDatabaseHas('scores', ['enrollment_id' => $enrollment->id, 'skill' => 'Final Test', 'value' => 80]);
    }
}
