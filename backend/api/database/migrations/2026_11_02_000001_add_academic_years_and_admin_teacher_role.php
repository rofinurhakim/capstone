<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_admin')->default(false);
        });

        Schema::create('academic_years', function (Blueprint $table) {
            $table->id();
            $table->string('term', 4)->unique();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        foreach (['classrooms', 'enrollments', 'academic_events', 'report_publication_schedules', 'assessment_weights'] as $table) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'term')) {
                continue;
            }

            DB::table($table)->select('term')->distinct()->get()->each(function ($record) {
                if (preg_match('/^\d{4}$/', $record->term) !== 1) {
                    return;
                }

                DB::table('academic_years')->insertOrIgnore([
                    'term' => $record->term,
                    'created_by' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
        }

        DB::table('academic_years')->insertOrIgnore([
            'term' => (string) now()->year,
            'created_by' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('academic_years');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_admin');
        });
    }
};
