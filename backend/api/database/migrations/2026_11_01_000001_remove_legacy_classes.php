<?php

use App\Models\Classroom;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            foreach (DB::table('students')->select('id', 'level')->get() as $student) {
                $level = strtoupper(trim($student->level));
                if (in_array($level, Classroom::LEVELS, true) && $student->level !== $level) {
                    DB::table('students')->where('id', $student->id)->update(['level' => $level]);
                }
            }

            foreach (DB::table('enrollments')->select('id', 'level_snapshot')->whereNotNull('level_snapshot')->get() as $enrollment) {
                $level = strtoupper(trim($enrollment->level_snapshot));
                if (in_array($level, Classroom::LEVELS, true) && $enrollment->level_snapshot !== $level) {
                    DB::table('enrollments')->where('id', $enrollment->id)->update(['level_snapshot' => $level]);
                }
            }

            foreach (DB::table('classrooms')->get() as $classroom) {
                $level = strtoupper(trim($classroom->name));
                if (in_array($level, Classroom::LEVELS, true)) {
                    if ($classroom->name !== $level) {
                        DB::table('classrooms')->where('id', $classroom->id)->update(['name' => $level]);
                    }

                    continue;
                }

                DB::table('enrollments')->where('classroom_id', $classroom->id)->update(['classroom_id' => null]);
                DB::table('classrooms')->where('id', $classroom->id)->delete();
            }
        });
    }

    public function down(): void
    {
        throw new LogicException('Deleted legacy class assignments cannot be restored automatically.');
    }
};
