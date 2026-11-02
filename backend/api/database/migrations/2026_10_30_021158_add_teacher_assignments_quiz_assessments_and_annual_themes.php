<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('classroom_teacher', function (Blueprint $table) {
            $table->id();
            $table->foreignId('classroom_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['classroom_id', 'teacher_id']);
            $table->index('teacher_id');
        });

        $assignedClasses = DB::table('classrooms')
            ->whereNotNull('teacher_id')
            ->get(['id', 'teacher_id']);
        foreach ($assignedClasses as $classroom) {
            DB::table('classroom_teacher')->insert([
                'classroom_id' => $classroom->id,
                'teacher_id' => $classroom->teacher_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        Schema::create('quizzes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('classroom_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('academic_year');
            $table->string('name', 100);
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
            $table->index(['classroom_id', 'academic_year']);
        });

        Schema::create('quiz_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quiz_id')->constrained()->cascadeOnDelete();
            $table->foreignId('enrollment_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('value');
            $table->timestamps();
            $table->unique(['quiz_id', 'enrollment_id']);
        });

        Schema::table('classroom_themes', function (Blueprint $table) {
            $table->unsignedSmallInteger('academic_year')->nullable();
        });

        foreach (DB::table('classroom_themes')->select('id', 'term')->cursor() as $theme) {
            $year = preg_match('/^\d{4}/', $theme->term, $matches)
                ? (int) $matches[0]
                : (int) now()->format('Y');
            DB::table('classroom_themes')->where('id', $theme->id)->update(['academic_year' => $year]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('classroom_themes', function (Blueprint $table) {
            $table->dropColumn('academic_year');
        });

        Schema::dropIfExists('quiz_scores');
        Schema::dropIfExists('quizzes');
        Schema::dropIfExists('classroom_teacher');
    }
};
