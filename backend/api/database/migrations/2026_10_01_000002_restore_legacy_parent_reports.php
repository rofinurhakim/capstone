<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::table('enrollments')
            ->join('students', 'students.id', '=', 'enrollments.student_id')
            ->whereNotNull('students.guardian_id')
            ->whereExists(fn ($query) => $query->select(DB::raw(1))->from('scores')->whereColumn('scores.enrollment_id', 'enrollments.id'))
            ->update(['published_at' => now(), 'teacher_verified_at' => now(), 'academic_verified_at' => now()]);
    }

    public function down(): void
    {
        // Existing publication state is intentionally retained on rollback.
    }
};
