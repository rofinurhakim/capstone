<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void { Schema::table('enrollments', fn (Blueprint $t) => $t->text('note')->nullable()); }
    public function down(): void { Schema::table('enrollments', fn (Blueprint $t) => $t->dropColumn('note')); }
};
