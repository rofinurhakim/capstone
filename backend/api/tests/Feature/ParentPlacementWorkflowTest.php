<?php

namespace Tests\Feature;

use App\Models\AcademicEvent;
use App\Models\Enrollment;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ParentPlacementWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_placement_is_scheduled_in_calendar_and_academic_controls_enrollment(): void
    {
        $parent = User::factory()->create(['role' => 'parent']);
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);
        $student = Student::create([
            'nis' => 'STU-'.fake()->unique()->numerify('#####'),
            'name' => 'Placement Student',
            'level' => 'MATTHEW A',
            'guardian_id' => $parent->id,
        ]);
        $enrollment = Enrollment::create([
            'student_id' => $student->id,
            'classroom_id' => null,
            'term' => '2026',
            'level_snapshot' => 'MATTHEW A',
            'status' => 'pending',
            'requires_placement_test' => true,
        ]);

        $this->actingAs($academicAdmin)->getJson('/api/attendance?term=2026')
            ->assertOk()
            ->assertJsonPath('0.class', 'Waiting for class placement');
        $this->getJson('/api/attendance/report?term=2026')
            ->assertOk()
            ->assertJsonPath('0.class', 'Waiting for class placement');

        $this->actingAs($parent)->postJson('/api/students', [])->assertForbidden();

        $this->actingAs($academicAdmin)->postJson('/api/calendar', [
            'title' => 'Placement Student assessment',
            'type' => 'placement_test',
            'start_date' => '2026-08-15',
            'term' => '2026',
        ])->assertCreated()->assertJsonPath('type', 'placement_test');

        $this->assertDatabaseHas('academic_events', [
            'title' => 'Placement Student assessment',
            'type' => 'placement_test',
        ]);
        $this->actingAs($parent)->patchJson("/api/enrollments/{$enrollment->id}", [
            'status' => 'confirmed',
        ])->assertForbidden();

        $this->actingAs($academicAdmin)->patchJson("/api/enrollments/{$enrollment->id}", [
            'status' => 'confirmed',
            'placement_test_completed' => true,
            'level' => 'MARK',
        ])->assertOk()->assertJsonPath('status', 'confirmed')->assertJsonPath('level_snapshot', 'MARK');

        $this->assertDatabaseHas('students', ['id' => $student->id, 'level' => 'MARK']);
        $this->assertDatabaseHas('classrooms', ['name' => 'MARK', 'term' => '2026']);
        $this->assertSame('MARK', $enrollment->fresh()->classroom->name);
        $this->assertNotNull($enrollment->fresh()->placement_test_completed_at);
        $this->getJson('/api/placement-tests')->assertNotFound();
    }

    public function test_calendar_rejects_an_end_time_before_the_start_time(): void
    {
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);

        $this->actingAs($academicAdmin)->postJson('/api/calendar', [
            'title' => 'Invalid event',
            'type' => 'placement_test',
            'start_date' => '2026-08-15',
            'end_date' => '2026-08-15',
            'start_time' => '14:00',
            'end_time' => '13:00',
        ])->assertUnprocessable();
    }
}
