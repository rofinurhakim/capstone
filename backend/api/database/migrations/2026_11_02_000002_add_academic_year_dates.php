<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('academic_years', function (Blueprint $table) {
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
        });

        foreach (DB::table('academic_years')->get(['term']) as $year) {
            DB::table('academic_years')->where('term', $year->term)->update([
                'start_date' => "{$year->term}-08-01",
                'end_date' => ((int) $year->term + 1).'-05-31',
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('academic_years', function (Blueprint $table) {
            $table->dropColumn(['start_date', 'end_date']);
        });
    }
};
