<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceCalendarWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_teacher_records_attendance_and_admin_manages_calendar_events(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);
        $classroom = Classroom::create(['name' => 'MATTHEW A', 'term' => '2026', 'teacher_id' => $teacher->id]);
        $student = Student::create([
            'nis' => 'STU-'.fake()->unique()->numerify('#####'),
            'name' => 'Attendance Student',
            'level' => 'MATTHEW A',
        ]);
        $enrollment = Enrollment::create([
            'student_id' => $student->id,
            'classroom_id' => $classroom->id,
            'term' => '2026',
            'status' => 'confirmed',
        ]);
        $date = now()->toDateString();

        $this->postJson('/api/attendance', [
            'date' => $date,
            'rows' => [['id' => $enrollment->id, 'status' => 'absent', 'note' => 'Family emergency']],
        ])->assertUnauthorized();

        $this->actingAs($teacher)
            ->postJson('/api/attendance', [
                'date' => $date,
                'rows' => [['id' => $enrollment->id, 'status' => 'excused', 'note' => 'Medical appointment']],
            ])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->getJson("/api/attendance?term=2026&date={$date}")
            ->assertOk()
            ->assertJsonPath('0.status', 'excused')
            ->assertJsonPath('0.note', 'Medical appointment');

        $this->getJson("/api/attendance/report?term=2026&from={$date}&to={$date}")
            ->assertOk()
            ->assertJsonPath('0.excused', 1)
            ->assertJsonPath('0.total', 1);

        $event = $this->actingAs($academicAdmin)->postJson('/api/calendar', [
            'title' => 'Workflow Event',
            'type' => 'exam',
            'start_date' => $date,
            'location' => 'Room 1',
            'term' => '2026',
        ])->assertSuccessful()->assertJsonPath('title', 'Workflow Event');

        $eventId = $event->json('id');
        $this->patchJson("/api/calendar/{$eventId}", [
            'title' => 'Updated Workflow Event',
            'type' => 'exam',
            'start_date' => $date,
            'location' => 'Room 2',
            'term' => '2026',
        ])->assertOk()->assertJsonPath('location', 'Room 2');

        $this->getJson("/api/calendar?from={$date}&to={$date}")
            ->assertOk()
            ->assertJsonPath('0.title', 'Updated Workflow Event');

        $this->deleteJson("/api/calendar/{$eventId}")
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->assertDatabaseHas('attendances', [
            'enrollment_id' => $enrollment->id,
            'date' => "{$date} 00:00:00",
            'status' => 'excused',
            'note' => 'Medical appointment',
        ]);
        $this->assertDatabaseMissing('academic_events', ['id' => $eventId]);
    }

    public function test_teacher_cannot_change_attendance_for_another_teachers_class(): void
    {
        $owner = User::factory()->create(['role' => 'teacher']);
        $otherTeacher = User::factory()->create(['role' => 'teacher']);
        $classroom = Classroom::create(['name' => 'MARK', 'term' => '2026', 'teacher_id' => $owner->id]);
        $student = Student::create([
            'nis' => 'STU-'.fake()->unique()->numerify('#####'),
            'name' => 'Private Student',
            'level' => 'MATTHEW A',
        ]);
        $enrollment = Enrollment::create([
            'student_id' => $student->id,
            'classroom_id' => $classroom->id,
            'term' => '2026',
            'status' => 'confirmed',
        ]);

        $this->actingAs($otherTeacher)
            ->postJson('/api/attendance', [
                'date' => now()->toDateString(),
                'rows' => [['id' => $enrollment->id, 'status' => 'present']],
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('attendances', ['enrollment_id' => $enrollment->id]);
    }

    public function test_teacher_can_save_attendance_for_unpublished_students_when_a_report_is_locked(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $classroom = Classroom::create(['name' => 'MATTHEW A', 'term' => '2026', 'teacher_id' => $teacher->id]);
        $lockedStudent = Student::create([
            'nis' => 'STU-'.fake()->unique()->numerify('#####'),
            'name' => 'Published Student',
            'level' => 'MATTHEW A',
        ]);
        $editableStudent = Student::create([
            'nis' => 'STU-'.fake()->unique()->numerify('#####'),
            'name' => 'Editable Student',
            'level' => 'MATTHEW A',
        ]);
        $lockedEnrollment = Enrollment::create([
            'student_id' => $lockedStudent->id,
            'classroom_id' => $classroom->id,
            'term' => '2026',
            'status' => 'confirmed',
            'published_at' => now(),
        ]);
        $editableEnrollment = Enrollment::create([
            'student_id' => $editableStudent->id,
            'classroom_id' => $classroom->id,
            'term' => '2026',
            'status' => 'confirmed',
        ]);
        $date = now()->toDateString();
        Attendance::create([
            'enrollment_id' => $lockedEnrollment->id,
            'date' => $date,
            'status' => 'present',
        ]);

        $attendanceRows = $this->actingAs($teacher)
            ->getJson("/api/attendance?term=2026&date={$date}")
            ->assertOk()
            ->json();
        $lockedRow = collect($attendanceRows)->firstWhere('id', $lockedEnrollment->id);
        $this->assertNotNull($lockedRow['published_at']);

        $this->postJson('/api/attendance', [
            'date' => $date,
            'rows' => [[
                'id' => $editableEnrollment->id,
                'status' => 'excused',
                'note' => 'Appointment',
            ]],
        ])->assertOk();

        $this->assertDatabaseHas('attendances', [
            'enrollment_id' => $lockedEnrollment->id,
            'date' => "{$date} 00:00:00",
            'status' => 'present',
        ]);
        $this->assertDatabaseHas('attendances', [
            'enrollment_id' => $editableEnrollment->id,
            'date' => "{$date} 00:00:00",
            'status' => 'excused',
            'note' => 'Appointment',
        ]);
    }
}
