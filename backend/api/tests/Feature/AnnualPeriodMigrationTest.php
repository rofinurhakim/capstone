<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Classroom;
use App\Models\ClassroomTheme;
use App\Models\Enrollment;
use App\Models\Quiz;
use App\Models\QuizScore;
use App\Models\Score;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AnnualPeriodMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_semester_records_are_merged_into_one_annual_enrollment(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $student = Student::create([
            'nis' => 'STU-'.fake()->unique()->numerify('#####'),
            'name' => 'Annual Migration Student',
            'level' => 'MATTHEW A',
            'status' => 'active',
        ]);
        $firstClassroom = Classroom::create(['name' => 'Matthew A', 'term' => '2026-1', 'teacher_id' => $teacher->id]);
        $secondClassroom = Classroom::create(['name' => 'Matthew A', 'term' => '2026-2', 'teacher_id' => $teacher->id]);
        $firstEnrollment = Enrollment::create([
            'student_id' => $student->id,
            'classroom_id' => $firstClassroom->id,
            'term' => '2026-1',
            'level_snapshot' => 'MATTHEW A',
            'status' => 'confirmed',
            'note' => 'Earlier teacher comment',
            'published_at' => now(),
            'teacher_verified_at' => now(),
        ]);
        $secondEnrollment = Enrollment::create([
            'student_id' => $student->id,
            'classroom_id' => $secondClassroom->id,
            'term' => '2026-2',
            'level_snapshot' => 'MATTHEW B',
            'status' => 'confirmed',
            'note' => null,
            'published_at' => now(),
            'teacher_verified_at' => now(),
        ]);

        Attendance::create(['enrollment_id' => $firstEnrollment->id, 'date' => '2026-03-01', 'status' => 'present']);
        Attendance::create(['enrollment_id' => $secondEnrollment->id, 'date' => '2026-03-01', 'status' => 'absent']);
        Attendance::create(['enrollment_id' => $secondEnrollment->id, 'date' => '2026-06-01', 'status' => 'sick']);
        Score::create(['enrollment_id' => $firstEnrollment->id, 'skill' => 'Final Test', 'value' => 70]);
        Score::create(['enrollment_id' => $secondEnrollment->id, 'skill' => 'Final Test', 'value' => 95]);
        $firstQuiz = Quiz::create(['classroom_id' => $firstClassroom->id, 'academic_year' => 2026, 'name' => 'Quiz 1', 'created_by' => $teacher->id]);
        $secondQuiz = Quiz::create(['classroom_id' => $secondClassroom->id, 'academic_year' => 2026, 'name' => 'Quiz 1', 'created_by' => $teacher->id]);
        QuizScore::create(['quiz_id' => $firstQuiz->id, 'enrollment_id' => $firstEnrollment->id, 'value' => 75]);
        QuizScore::create(['quiz_id' => $secondQuiz->id, 'enrollment_id' => $secondEnrollment->id, 'value' => 85]);
        foreach ([$firstClassroom, $secondClassroom] as $classroom) {
            ClassroomTheme::create([
                'classroom_id' => $classroom->id,
                'term' => $classroom->term,
                'academic_year' => 2026,
                'theme' => 'Greetings',
                'position' => 1,
            ]);
        }
        foreach (['2026-1', '2026-2'] as $term) {
            DB::table('assessment_weights')->insert([
                'term' => $term,
                'participation' => 20,
                'assignment' => 30,
                'mid_term_test' => 20,
                'final_test' => 30,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('report_publication_schedules')->insert([
                'term' => $term,
                'publish_at' => now(),
                'status' => 'published',
                'created_by' => $teacher->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $migration = require database_path('migrations/2026_10_30_021200_convert_semesters_to_annual_periods.php');
        $migration->up();

        $this->assertDatabaseCount('classrooms', 1);
        $this->assertDatabaseCount('enrollments', 1);
        $this->assertDatabaseHas('enrollments', [
            'id' => $firstEnrollment->id,
            'term' => '2026',
            'classroom_id' => $firstClassroom->id,
            'note' => 'Earlier teacher comment',
            'published_at' => null,
            'teacher_verified_at' => null,
        ]);
        $this->assertDatabaseHas('scores', ['enrollment_id' => $firstEnrollment->id, 'skill' => 'Final Test', 'value' => 95]);
        $this->assertDatabaseCount('attendances', 2);
        $this->assertDatabaseHas('attendances', ['enrollment_id' => $firstEnrollment->id, 'date' => '2026-03-01 00:00:00', 'status' => 'absent']);
        $this->assertDatabaseCount('quizzes', 1);
        $this->assertDatabaseHas('quiz_scores', ['enrollment_id' => $firstEnrollment->id, 'value' => 85]);
        $this->assertDatabaseCount('classroom_themes', 1);
        $this->assertDatabaseHas('assessment_weights', ['term' => '2026']);
        $this->assertDatabaseCount('assessment_weights', 1);
        $this->assertDatabaseHas('report_publication_schedules', ['term' => '2026']);
        $this->assertDatabaseCount('report_publication_schedules', 1);
    }
}
