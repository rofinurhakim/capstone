<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('users', fn (Blueprint $t) => $t->string('role')->default('teacher')); // admin|teacher|parent
        Schema::create('students', function (Blueprint $t) {
            $t->id(); $t->string('nis')->unique(); $t->string('name'); $t->string('level');
            $t->foreignId('guardian_id')->nullable()->constrained('users');
            $t->string('status')->default('active'); $t->timestamps();
        });
        Schema::create('classrooms', function (Blueprint $t) {
            $t->id(); $t->string('name'); $t->string('term');
            $t->foreignId('teacher_id')->nullable()->constrained('users'); $t->timestamps();
        });
        Schema::create('enrollments', function (Blueprint $t) {
            $t->id(); $t->foreignId('student_id')->constrained()->cascadeOnDelete();
            $t->foreignId('classroom_id')->constrained()->cascadeOnDelete();
            $t->string('term'); $t->string('status')->default('pending'); // pending|confirmed|left
            $t->timestamps(); $t->unique(['student_id', 'term']);
        });
        Schema::create('scores', function (Blueprint $t) {
            $t->id(); $t->foreignId('enrollment_id')->constrained()->cascadeOnDelete();
            $t->string('skill'); $t->unsignedTinyInteger('value'); $t->text('note')->nullable();
            $t->timestamps(); $t->unique(['enrollment_id', 'skill']);
        });
    }
    public function down(): void {
        foreach (['scores', 'enrollments', 'classrooms', 'students'] as $t) Schema::dropIfExists($t);
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('role'));
    }
};
