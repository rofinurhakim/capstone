<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Quiz;
use App\Models\QuizScore;
use App\Models\ReportPublicationSchedule;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_academic_admin_cannot_publish_before_teacher_verification(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $enrollment = $this->createEnrollment($teacher);
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);

        $this->actingAs($academicAdmin)
            ->patchJson("/api/reports/{$enrollment->id}/verify")
            ->assertStatus(409);

        $this->assertDatabaseHas('enrollments', [
            'id' => $enrollment->id,
            'teacher_verified_at' => null,
            'academic_verified_at' => null,
            'published_at' => null,
        ]);
    }

    public function test_teacher_verification_allows_academic_admin_to_publish(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $enrollment = $this->createEnrollment($teacher);
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);
        ReportPublicationSchedule::create([
            'term' => $enrollment->term,
            'publish_at' => now(),
            'status' => 'scheduled',
            'created_by' => $academicAdmin->id,
        ]);

        $this->actingAs($teacher)
            ->patchJson("/api/reports/{$enrollment->id}/verify")
            ->assertOk();

        $this->actingAs($academicAdmin)
            ->patchJson("/api/reports/{$enrollment->id}/verify")
            ->assertOk();

        $enrollment->refresh();
        $this->assertNotNull($enrollment->teacher_verified_at);
        $this->assertNotNull($enrollment->academic_verified_at);
        $this->assertNotNull($enrollment->published_at);
    }

    public function test_academic_admin_cannot_publish_until_a_schedule_is_set(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $enrollment = $this->createEnrollment($teacher);
        $this->actingAs($teacher)
            ->patchJson("/api/reports/{$enrollment->id}/verify")
            ->assertOk();
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);

        $this->actingAs($academicAdmin)
            ->patchJson("/api/reports/{$enrollment->id}/verify")
            ->assertStatus(409)
            ->assertJsonPath('message', 'Jadwal publikasi belum ditentukan.');

        $this->assertNull($enrollment->fresh()->published_at);
    }

    public function test_publication_schedule_holds_reports_that_are_not_verified_yet(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $enrollment = $this->createEnrollment($teacher);
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);
        $schedule = ReportPublicationSchedule::create([
            'term' => '2026',
            'publish_at' => now(),
            'status' => 'scheduled',
            'created_by' => $academicAdmin->id,
        ]);

        $this->actingAs($academicAdmin)
            ->postJson("/api/report-publications/{$schedule->id}/publish")
            ->assertOk()
            ->assertJsonPath('status', 'partial');

        $this->assertDatabaseHas('report_publication_schedules', [
            'id' => $schedule->id,
            'status' => 'partial',
            'published_by' => $academicAdmin->id,
        ]);
        $this->assertNull($enrollment->fresh()->published_at);
    }

    public function test_teacher_cannot_verify_until_all_required_scores_are_recorded(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $enrollment = $this->createEnrollment($teacher);
        $enrollment->scores()->where('skill', 'Final Test')->delete();

        $this->actingAs($teacher)
            ->patchJson("/api/reports/{$enrollment->id}/verify")
            ->assertStatus(409);

        $this->assertNull($enrollment->fresh()->teacher_verified_at);
    }

    public function test_teacher_can_verify_before_the_publication_date(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $enrollment = $this->createEnrollment($teacher);
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);
        ReportPublicationSchedule::create([
            'term' => $enrollment->term,
            'publish_at' => now()->addDays(2),
            'status' => 'scheduled',
            'created_by' => $academicAdmin->id,
        ]);

        $this->actingAs($teacher)
            ->patchJson("/api/reports/{$enrollment->id}/verify")
            ->assertOk();

        $this->assertNotNull($enrollment->fresh()->teacher_verified_at);
    }

    public function test_assessment_weights_are_stored_per_academic_year_and_must_total_one_hundred(): void
    {
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);
        $this->actingAs($academicAdmin)
            ->putJson('/api/assessment-weights', [
                'term' => '2026',
                'weights' => [
                    'Participation' => 25,
                    'Assignment' => 25,
                    'Mid Term Test' => 20,
                    'Final Test' => 30,
                ],
            ])
            ->assertOk()
            ->assertJsonPath('weights.Participation', 25);

        $this->actingAs($academicAdmin)
            ->putJson('/api/assessment-weights', [
                'term' => '2027',
                'weights' => [
                    'Participation' => 20,
                    'Assignment' => 30,
                    'Mid Term Test' => 20,
                    'Final Test' => 20,
                ],
            ])
            ->assertStatus(422);

        $this->assertDatabaseHas('assessment_weights', ['term' => '2026', 'participation' => 25]);
        $this->assertDatabaseMissing('assessment_weights', ['term' => '2027']);
        $this->actingAs($academicAdmin)
            ->putJson('/api/assessment-weights', ['term' => '2026-1', 'weights' => []])
            ->assertStatus(422);
    }

    public function test_reenrollment_promotes_and_preserves_the_previous_term_level(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $enrollment = $this->createEnrollment($teacher);
        $enrollment->scores()->where('skill', 'Assignment')->update(['value' => 100]);
        $enrollment->scores()->where('skill', 'Mid Term Test')->update(['value' => 25]);
        $enrollment->scores()->where('skill', 'Final Test')->update(['value' => 100]);
        Attendance::create([
            'enrollment_id' => $enrollment->id,
            'date' => now()->toDateString(),
            'status' => 'absent',
        ]);
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);

        $this->actingAs($academicAdmin)
            ->postJson('/api/enrollments/propose', ['from' => '2026', 'to' => '2027'])
            ->assertOk()
            ->assertJsonPath('created', 1)
            ->assertJsonPath('held', 0)
            ->assertJsonPath('graduated', 0);

        $this->assertDatabaseHas('enrollments', [
            'student_id' => $enrollment->student_id,
            'term' => '2027',
            'level_snapshot' => 'MATTHEW B',
        ]);
        $this->assertDatabaseHas('students', ['id' => $enrollment->student_id, 'level' => 'MATTHEW B']);
        $this->assertSame('MATTHEW A', $enrollment->fresh()->level_snapshot);
    }

    public function test_reenrollment_accepts_only_the_next_annual_period(): void
    {
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);

        $this->actingAs($academicAdmin)
            ->postJson('/api/enrollments/propose', ['from' => '2026-1', 'to' => '2027-1'])
            ->assertUnprocessable();

        $this->postJson('/api/enrollments/propose', ['from' => '2026', 'to' => '2028'])
            ->assertUnprocessable();
    }

    public function test_reenrollment_retains_students_below_the_65_point_threshold(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $enrollment = $this->createEnrollment($teacher);
        $enrollment->scores()->where('skill', 'Assignment')->update(['value' => 100]);
        $enrollment->scores()->where('skill', 'Mid Term Test')->update(['value' => 20]);
        $enrollment->scores()->where('skill', 'Final Test')->update(['value' => 100]);
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);

        $this->actingAs($academicAdmin)
            ->postJson('/api/enrollments/propose', ['from' => '2026', 'to' => '2027'])
            ->assertOk()
            ->assertJsonPath('created', 1)
            ->assertJsonPath('held', 0);

        $this->assertDatabaseHas('enrollments', [
            'student_id' => $enrollment->student_id,
            'term' => '2027',
            'level_snapshot' => 'MATTHEW A',
        ]);
    }

    public function test_reenrollment_holds_students_with_incomplete_scores(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $enrollment = $this->createEnrollment($teacher);
        $enrollment->scores()->where('skill', 'Final Test')->delete();
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);

        $this->actingAs($academicAdmin)
            ->postJson('/api/enrollments/propose', ['from' => '2026', 'to' => '2027'])
            ->assertOk()
            ->assertJsonPath('created', 0)
            ->assertJsonPath('held', 1);

        $this->assertDatabaseMissing('enrollments', [
            'student_id' => $enrollment->student_id,
            'term' => '2027',
        ]);
    }

    public function test_students_who_pass_ecsc_are_graduated_instead_of_reenrolled(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $enrollment = $this->createEnrollment($teacher);
        $enrollment->student->update(['level' => 'ECSC']);
        $enrollment->classroom->update(['name' => 'ECSC']);
        $enrollment->update(['level_snapshot' => 'ECSC']);
        $enrollment->scores()->update(['value' => 100]);
        Attendance::create([
            'enrollment_id' => $enrollment->id,
            'date' => now()->toDateString(),
            'status' => 'present',
        ]);
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);

        $this->actingAs($academicAdmin)
            ->postJson('/api/enrollments/propose', ['from' => '2026', 'to' => '2027'])
            ->assertOk()
            ->assertJsonPath('graduated', 1)
            ->assertJsonPath('created', 0);

        $this->assertDatabaseHas('students', ['id' => $enrollment->student_id, 'status' => 'graduated']);
        $this->assertDatabaseMissing('enrollments', [
            'student_id' => $enrollment->student_id,
            'term' => '2027',
        ]);
    }

    public function test_roster_calculates_participation_from_attendance(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $enrollment = $this->createEnrollment($teacher);
        foreach (['present', 'present', 'excused', 'absent'] as $index => $status) {
            Attendance::create([
                'enrollment_id' => $enrollment->id,
                'date' => now()->subDays($index)->toDateString(),
                'status' => $status,
            ]);
        }

        $response = $this->actingAs($teacher)
            ->getJson('/api/roster?term=2026')
            ->assertOk();

        $response->assertJsonPath('0.scores.Participation', 50);
    }

    public function test_assignment_is_the_academic_year_average_of_quiz_scores(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $enrollment = $this->createEnrollment($teacher);
        $firstQuiz = Quiz::create([
            'classroom_id' => $enrollment->classroom_id,
            'academic_year' => 2026,
            'name' => 'Quiz 1',
            'created_by' => $teacher->id,
        ]);
        $secondQuiz = Quiz::create([
            'classroom_id' => $enrollment->classroom_id,
            'academic_year' => 2026,
            'name' => 'Quiz 2',
            'created_by' => $teacher->id,
        ]);
        QuizScore::create(['quiz_id' => $firstQuiz->id, 'enrollment_id' => $enrollment->id, 'value' => 90]);

        $this->actingAs($teacher)
            ->getJson('/api/roster?term=2026')
            ->assertOk()
            ->assertJsonPath('0.quiz_count', 2)
            ->assertJsonPath('0.scores.Assignment', 90);

        $this->actingAs($teacher)
            ->patchJson("/api/reports/{$enrollment->id}/verify", ['stage' => 'teacher'])
            ->assertStatus(409);

        QuizScore::create(['quiz_id' => $secondQuiz->id, 'enrollment_id' => $enrollment->id, 'value' => 70]);

        $this->actingAs($teacher)
            ->getJson('/api/roster?term=2026')
            ->assertOk()
            ->assertJsonPath('0.scores.Assignment', 80)
            ->assertJsonCount(2, '0.quiz_scores');

        $this->actingAs($teacher)
            ->patchJson("/api/reports/{$enrollment->id}/verify", ['stage' => 'teacher'])
            ->assertOk();
    }

    public function test_learning_themes_are_stored_for_the_annual_class_period(): void
    {
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);
        $classroom = Classroom::create(['name' => 'MATTHEW A', 'term' => '2026']);

        $this->actingAs($academicAdmin)->postJson('/api/themes', [
            'classroom_id' => $classroom->id,
            'term' => '2026',
            'theme' => 'Greetings',
        ])->assertCreated();

        $this->getJson("/api/themes?classroom_id={$classroom->id}&term=2026")
            ->assertOk()
            ->assertJsonPath('0.theme', 'Greetings');
        $this->getJson("/api/themes?classroom_id={$classroom->id}&term=2026-1")->assertStatus(422);
    }

    public function test_score_edits_clear_previous_report_verifications(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $enrollment = $this->createEnrollment($teacher);
        $enrollment->update([
            'teacher_verified_at' => now(),
            'academic_verified_at' => now(),
            'published_at' => now(),
        ]);
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);
        ReportPublicationSchedule::create([
            'term' => $enrollment->term,
            'publish_at' => now()->subDay(),
            'status' => 'published',
            'created_by' => $academicAdmin->id,
            'published_by' => $academicAdmin->id,
        ]);

        $this->actingAs($teacher)
            ->postJson("/api/reports/{$enrollment->id}/request-revision")
            ->assertOk();

        $this->actingAs($teacher)
            ->postJson('/api/scores', [
                'rows' => [[
                    'id' => $enrollment->id,
                    'scores' => ['Mid Term Test' => 80, 'Final Test' => 70],
                    'note' => 'Updated comment',
                ]],
            ])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->actingAs($teacher)
            ->patchJson("/api/reports/{$enrollment->id}/verify", ['stage' => 'teacher'])
            ->assertOk();
        $this->actingAs($academicAdmin)
            ->patchJson("/api/reports/{$enrollment->id}/verify", ['stage' => 'academic'])
            ->assertOk();

        $enrollment->refresh();
        $this->assertNotNull($enrollment->teacher_verified_at);
        $this->assertNotNull($enrollment->academic_verified_at);
        $this->assertNotNull($enrollment->published_at);
        $this->assertDatabaseHas('scores', [
            'enrollment_id' => $enrollment->id,
            'skill' => 'Final Test',
            'value' => 70,
        ]);
    }

    public function test_parent_can_update_only_their_child_profile(): void
    {
        $parent = User::factory()->create(['role' => 'parent']);
        $student = Student::create([
            'nis' => 'STU-'.fake()->unique()->numerify('#####'),
            'name' => 'Murid Uji',
            'level' => 'MATTHEW A',
            'guardian_id' => $parent->id,
            'status' => 'active',
        ]);

        $this->actingAs($parent)
            ->getJson('/api/my-students')
            ->assertOk()
            ->assertJsonPath('0.name', 'Murid Uji');

        $this->actingAs($parent)
            ->patchJson("/api/my-students/{$student->id}", [
                'name' => 'Nama Diperbarui',
                'sector' => 'Eden',
                'level' => 'ECSC',
            ])
            ->assertOk()
            ->assertJsonPath('name', 'Nama Diperbarui')
            ->assertJsonMissingPath('level');

        $this->assertDatabaseHas('students', [
            'id' => $student->id,
            'name' => 'Nama Diperbarui',
            'sector' => 'Eden',
            'level' => 'MATTHEW A',
        ]);
    }

    public function test_parent_cannot_update_another_guardians_student(): void
    {
        $owner = User::factory()->create(['role' => 'parent']);
        $otherParent = User::factory()->create(['role' => 'parent']);
        $student = Student::create([
            'nis' => 'STU-'.fake()->unique()->numerify('#####'),
            'name' => 'Murid Uji',
            'level' => 'MATTHEW A',
            'guardian_id' => $owner->id,
            'status' => 'active',
        ]);

        $this->actingAs($otherParent)
            ->patchJson("/api/my-students/{$student->id}", ['name' => 'Tidak Berwenang'])
            ->assertForbidden();

        $this->assertDatabaseHas('students', [
            'id' => $student->id,
            'name' => 'Murid Uji',
        ]);
    }

    public function test_teacher_can_update_their_own_identity(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);

        $this->actingAs($teacher)
            ->getJson('/api/account/profile')
            ->assertOk()
            ->assertJsonPath('email', $teacher->email);

        $this->actingAs($teacher)
            ->patchJson('/api/account/profile', [
                'name' => 'Guru Diperbarui',
                'email' => 'guru-baru@example.test',
            ])
            ->assertOk()
            ->assertJsonPath('name', 'Guru Diperbarui');

        $this->assertDatabaseHas('users', [
            'id' => $teacher->id,
            'name' => 'Guru Diperbarui',
            'email' => 'guru-baru@example.test',
        ]);
    }

    public function test_parent_cannot_read_scores_or_attendance_before_report_publication(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $parent = User::factory()->create(['role' => 'parent']);
        $enrollment = $this->createEnrollment($teacher);
        $enrollment->student->update(['guardian_id' => $parent->id]);
        $enrollment->update(['note' => 'Private teacher comment']);
        $enrollment->scores()->updateOrCreate(['skill' => 'Assignment'], ['value' => 95]);
        Attendance::create([
            'enrollment_id' => $enrollment->id,
            'date' => now()->toDateString(),
            'status' => 'present',
        ]);

        $this->actingAs($parent)
            ->getJson('/api/roster?term=2026&include_pending=1')
            ->assertOk()
            ->assertJsonPath('0.scores', [])
            ->assertJsonPath('0.note', null)
            ->assertJsonPath('0.attendance.present', 0);

        $this->getJson('/api/export/roster?term=2026')->assertForbidden();
    }

    private function createEnrollment(User $teacher): Enrollment
    {
        $student = Student::create([
            'nis' => 'STU-'.fake()->unique()->numerify('#####'),
            'name' => 'Murid Uji',
            'level' => 'MATTHEW A',
            'status' => 'active',
        ]);
        $classroom = Classroom::create([
            'name' => 'MATTHEW A',
            'term' => '2026',
            'teacher_id' => $teacher->id,
        ]);

        $enrollment = Enrollment::create([
            'student_id' => $student->id,
            'classroom_id' => $classroom->id,
            'term' => '2026',
            'level_snapshot' => 'MATTHEW A',
            'status' => 'confirmed',
        ]);
        $enrollment->scores()->createMany([
            ['skill' => 'Assignment', 'value' => 80],
            ['skill' => 'Mid Term Test', 'value' => 80],
            ['skill' => 'Final Test', 'value' => 80],
        ]);

        return $enrollment;
    }
}
