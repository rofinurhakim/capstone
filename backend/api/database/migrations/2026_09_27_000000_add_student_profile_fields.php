<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('gender', 20)->nullable()->after('name');
            $table->date('birth_date')->nullable()->after('gender');
            $table->string('blood_type', 3)->nullable()->after('birth_date');
            $table->text('address')->nullable()->after('blood_type');
            $table->string('phone', 30)->nullable()->after('address');
            $table->string('guardian_phone', 30)->nullable()->after('phone');
            $table->string('guardian_relation', 50)->nullable()->after('guardian_phone');
            $table->text('medical_notes')->nullable()->after('guardian_relation');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['gender', 'birth_date', 'blood_type', 'address', 'phone', 'guardian_phone', 'guardian_relation', 'medical_notes']);
        });
    }
};