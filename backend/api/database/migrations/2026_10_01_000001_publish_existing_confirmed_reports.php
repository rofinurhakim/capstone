<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::table('enrollments')->where('status', 'confirmed')->update([
            'teacher_verified_at' => now(),
            'academic_verified_at' => now(),
            'published_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('enrollments')->update([
            'teacher_verified_at' => null,
            'academic_verified_at' => null,
            'published_at' => null,
        ]);
    }
};
