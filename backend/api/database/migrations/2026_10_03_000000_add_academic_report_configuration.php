<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            $table->string('level_snapshot', 50)->nullable()->after('term');
        });

        foreach (DB::table('enrollments')->join('students', 'students.id', '=', 'enrollments.student_id')->select('enrollments.id', 'students.level')->cursor() as $enrollment) {
            DB::table('enrollments')->where('id', $enrollment->id)->update(['level_snapshot' => $enrollment->level]);
        }

        Schema::table('report_publication_schedules', function (Blueprint $table) {
            $table->dateTime('grade_submission_deadline')->nullable()->after('term');
        });

        Schema::create('assessment_weights', function (Blueprint $table) {
            $table->id();
            $table->string('term', 20)->unique();
            $table->unsignedTinyInteger('participation')->default(20);
            $table->unsignedTinyInteger('assignment')->default(30);
            $table->unsignedTinyInteger('mid_term_test')->default(20);
            $table->unsignedTinyInteger('final_test')->default(30);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_weights');
        Schema::table('report_publication_schedules', function (Blueprint $table) {
            $table->dropColumn('grade_submission_deadline');
        });
        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropColumn('level_snapshot');
        });
    }
};
