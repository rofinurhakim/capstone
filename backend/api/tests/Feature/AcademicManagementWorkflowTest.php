<?php

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AcademicManagementWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_academic_admin_can_create_teacher_class_and_student_then_read_the_roster(): void
    {
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);

        $this->getJson('/api/classrooms')->assertUnauthorized();

        $teacher = $this->actingAs($academicAdmin)->postJson('/api/teachers', [
            'name' => 'Workflow Teacher',
            'email' => 'workflow-teacher@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertSuccessful()->assertJsonPath('role', 'teacher');

        $teacherId = $teacher->json('id');
        $classroom = $this->postJson('/api/classrooms', [
            'name' => 'MATTHEW A',
            'term' => '2026',
            'teacher_id' => $teacherId,
        ])->assertSuccessful()->assertJsonPath('teacher.id', $teacherId);

        $this->postJson('/api/students', [
            'name' => 'Workflow Student',
            'level' => 'MATTHEW A',
            'term' => '2026',
            'guardian_name' => 'Workflow Guardian',
            'guardian_email' => 'workflow-guardian@example.test',
            'school_name' => 'Sidoarjo School',
            'school_class' => '1SD',
        ])->assertSuccessful()->assertJsonPath('student.name', 'Workflow Student');

        $this->getJson('/api/roster?term=2026')
            ->assertOk()
            ->assertJsonPath('0.name', 'Workflow Student')
            ->assertJsonPath('0.class', 'Waiting for class placement')
            ->assertJsonPath('0.teacher_name', '');

        $this->assertDatabaseHas('users', ['id' => $teacherId, 'role' => 'teacher']);
        $this->assertDatabaseHas('classrooms', ['id' => $classroom->json('id'), 'teacher_id' => $teacherId]);
        $this->assertDatabaseHas('students', [
            'name' => 'Workflow Student',
            'level' => 'MATTHEW A',
            'school_name' => 'Sidoarjo School',
            'school_class' => '1SD',
        ]);
        $this->assertDatabaseHas('enrollments', [
            'term' => '2026',
            'status' => 'pending',
            'requires_placement_test' => true,
            'classroom_id' => null,
        ]);
    }

    public function test_teacher_cannot_manage_academic_accounts_or_classes(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);

        $this->actingAs($teacher)
            ->postJson('/api/classrooms', ['name' => 'MARK', 'term' => '2026'])
            ->assertForbidden();

        $this->postJson('/api/teachers', [
            'name' => 'Forbidden Teacher',
            'email' => 'forbidden@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertForbidden();

        $this->assertDatabaseMissing('classrooms', ['name' => 'MARK']);
        $this->assertDatabaseMissing('users', ['email' => 'forbidden@example.test']);
    }

    public function test_teacher_can_be_given_either_academic_admin_or_admin_as_an_additional_role(): void
    {
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);

        $teacher = $this->actingAs($academicAdmin)->postJson('/api/teachers', [
            'name' => 'Dual Role Teacher',
            'email' => 'dual-role@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'additional_role' => 'admin',
        ])->assertSuccessful()
            ->assertJsonPath('is_admin', true)
            ->assertJsonPath('is_academic_admin', false);

        $account = User::findOrFail($teacher->json('id'));
        $this->assertSame(['teacher', 'admin'], $account->roles());
        $this->postJson('/api/login', [
            'email' => 'dual-role@example.test',
            'password' => 'password123',
        ])->assertOk()->assertJsonPath('roles', ['teacher', 'admin']);

        $this->patchJson('/api/teachers/'.$teacher->json('id'), [
            'name' => 'Dual Role Teacher',
            'email' => 'dual-role@example.test',
            'additional_role' => 'academic_admin',
        ])->assertOk()
            ->assertJsonPath('is_admin', false)
            ->assertJsonPath('is_academic_admin', true);
    }

    public function test_academic_admin_can_add_only_the_next_academic_year_without_creating_a_class(): void
    {
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);
        $nextYear = (string) (now()->year + 1);
        $startDate = "{$nextYear}-08-15";
        $endDate = ((int) $nextYear + 1).'-05-20';

        $this->actingAs($academicAdmin)->postJson('/api/academic-years', [
            'start_date' => $startDate,
            'end_date' => $endDate,
        ])
            ->assertOk()
            ->assertJsonPath('term', $nextYear)
            ->assertJsonPath('start_date', $startDate)
            ->assertJsonPath('end_date', $endDate);

        $this->getJson('/api/terms')->assertOk()->assertExactJson([$nextYear, (string) now()->year]);
        $this->getJson('/api/academic-years')->assertOk()
            ->assertJsonPath('0.term', $nextYear)
            ->assertJsonPath('0.start_date', $startDate)
            ->assertJsonPath('0.end_date', $endDate);
        $this->assertDatabaseHas('academic_years', ['term' => $nextYear, 'created_by' => $academicAdmin->id]);
        $this->assertDatabaseCount('classrooms', 0);

        $this->postJson('/api/academic-years', [
            'start_date' => (string) (now()->year + 3).'-08-01',
            'end_date' => (string) (now()->year + 4).'-05-31',
        ])
            ->assertUnprocessable();
        $this->postJson('/api/academic-years', [
            'start_date' => "{$nextYear}-09-01",
            'end_date' => "{$nextYear}-08-01",
        ])->assertUnprocessable();
    }

    public function test_classrooms_only_allow_one_of_the_eight_levels_once_per_year(): void
    {
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);

        $this->actingAs($academicAdmin)->postJson('/api/classrooms', [
            'name' => 'Kids 2 A',
            'term' => '2026',
        ])->assertUnprocessable();

        $this->postJson('/api/classrooms', [
            'name' => 'MATTHEW A',
            'term' => '2026',
        ])->assertSuccessful();

        $this->postJson('/api/classrooms', [
            'name' => 'MATTHEW A',
            'term' => '2026',
        ])->assertUnprocessable();

        $this->assertDatabaseCount('classrooms', 1);
    }

    public function test_teacher_can_be_assigned_to_only_one_class_per_year_and_classes_allow_at_most_three_teachers(): void
    {
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);
        $teachers = User::factory()->count(4)->create(['role' => 'teacher']);
        $teacherIds = $teachers->pluck('id')->all();

        $classroom = $this->actingAs($academicAdmin)->postJson('/api/classrooms', [
            'name' => 'MATTHEW A',
            'term' => '2026',
            'teacher_ids' => array_slice($teacherIds, 0, 3),
        ])->assertCreated();

        $this->patchJson('/api/classrooms/'.$classroom->json('id'), [
            'name' => 'MATTHEW A',
            'term' => '2026',
            'teacher_ids' => $teacherIds,
        ])->assertUnprocessable();

        $this->postJson('/api/classrooms', [
            'name' => 'MARK',
            'term' => '2026',
            'teacher_ids' => [$teacherIds[0]],
        ])->assertUnprocessable();

        $this->assertDatabaseCount('classroom_teacher', 3);
    }

    public function test_semester_period_values_are_rejected(): void
    {
        $academicAdmin = User::factory()->create(['role' => 'academic_admin']);

        $this->actingAs($academicAdmin)->postJson('/api/classrooms', [
            'name' => 'Semester Class',
            'term' => '2026-1',
        ])->assertUnprocessable();

        $this->getJson('/api/classrooms?term=2026-1')->assertUnprocessable();
        $this->getJson('/api/roster?term=2026-1')->assertUnprocessable();
        $this->assertDatabaseMissing('classrooms', ['name' => 'Semester Class']);

        Classroom::create(['name' => 'MATTHEW A', 'term' => '2026']);
        Classroom::create(['name' => 'Legacy Semester Class', 'term' => '2026-1']);
        $this->getJson('/api/terms')->assertOk()->assertExactJson(['2026']);
    }
}
