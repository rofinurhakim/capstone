<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_academic_admin')->default(false);
        });

        Schema::table('students', function (Blueprint $table) {
            $table->string('school_name')->nullable();
            $table->string('school_class', 50)->nullable();
            $table->dropColumn(['blood_type', 'medical_notes']);
        });

        Schema::table('enrollments', function (Blueprint $table) {
            $table->boolean('requires_placement_test')->default(false);
            $table->timestamp('placement_test_completed_at')->nullable();
            $table->timestamp('revision_requested_at')->nullable();
        });

        Schema::table('report_publication_schedules', function (Blueprint $table) {
            $table->dropColumn('grade_submission_deadline');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropColumn(['requires_placement_test', 'placement_test_completed_at', 'revision_requested_at']);
        });

        Schema::table('report_publication_schedules', function (Blueprint $table) {
            $table->dateTime('grade_submission_deadline')->nullable()->after('term');
        });

        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['school_name', 'school_class']);
            $table->string('blood_type', 3)->nullable();
            $table->text('medical_notes')->nullable();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_academic_admin');
        });
    }
};
