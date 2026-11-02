<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('report_publication_schedules', function (Blueprint $table) {
            $table->id();
            $table->string('term', 20)->unique();
            $table->dateTime('publish_at');
            $table->string('status')->default('scheduled');
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('published_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('classroom_themes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('classroom_id')->constrained()->cascadeOnDelete();
            $table->string('term', 20);
            $table->string('theme', 150);
            $table->unsignedSmallInteger('position')->default(1);
            $table->timestamps();
            $table->index(['classroom_id', 'term']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('classroom_themes');
        Schema::dropIfExists('report_publication_schedules');
    }
};
