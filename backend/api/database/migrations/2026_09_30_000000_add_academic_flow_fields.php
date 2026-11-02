<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('classrooms', function (Blueprint $table) {
            $table->foreignId('teacher_id')->nullable()->change();
        });

        Schema::table('enrollments', function (Blueprint $table) {
            $table->foreignId('classroom_id')->nullable()->change();
        });

        Schema::table('enrollments', function (Blueprint $table) {
            $table->timestamp('teacher_verified_at')->nullable();
            $table->timestamp('academic_verified_at')->nullable();
            $table->timestamp('published_at')->nullable();
        });

        Schema::create('placement_tests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollment_id')->constrained()->cascadeOnDelete();
            $table->dateTime('scheduled_at')->nullable();
            $table->unsignedTinyInteger('score')->nullable();
            $table->string('status')->default('scheduled');
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('placement_tests');
        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropColumn(['teacher_verified_at', 'academic_verified_at', 'published_at']);
        });
        Schema::table('classrooms', function (Blueprint $table) {
            $table->foreignId('teacher_id')->nullable(false)->change();
        });
        Schema::table('enrollments', function (Blueprint $table) {
            $table->foreignId('classroom_id')->nullable(false)->change();
        });
    }
};
