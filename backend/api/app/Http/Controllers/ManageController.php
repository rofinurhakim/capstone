<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\Classroom;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ManageController extends Controller
{
    public function profile(Request $r)
    {
        abort_unless($r->user()->hasRole('teacher'), 403);

        return $r->user()->only(['name', 'email']);
    }

    public function updateProfile(Request $r)
    {
        abort_unless($r->user()->hasRole('teacher'), 403);
        $data = $r->validate(['name' => 'required|string|max:100', 'email' => 'required|email|unique:users,email,'.$r->user()->id]);
        $r->user()->update($data);

        return $r->user()->only(['name', 'email']);
    }

    public function update(Request $r, Student $student)
    {
        abort_unless($r->user()->hasAnyRole(['admin', 'academic_admin']), 403);
        $d = $r->validate([
            'name' => 'required|string|max:100',
            'level' => 'required|in:MATTHEW A,MATTHEW B,MARK,LUKE,JOHN,TIMOTHY,GENESIS,ECSC',
            'gender' => 'nullable|in:male,female',
            'birth_date' => 'nullable|date',
            'school_name' => 'nullable|string|max:150',
            'school_class' => 'nullable|string|max:50',
            'sector' => ['nullable', Rule::in(Student::SECTORS)],
            'phone' => 'nullable|string|max:30',
            'guardian_phone' => 'nullable|string|max:30',
            'guardian_relation' => 'nullable|string|max:50',
            'term' => ['nullable', 'regex:/^\d{4}$/'],
        ]);
        $student->update(collect($d)->except(['classroom_id', 'term'])->all());
        if (! empty($d['term'])) {
            $enrollment = Enrollment::where('student_id', $student->id)->where('term', $d['term'])->first();
            if ($enrollment) {
                $classroom = Classroom::firstOrCreate([
                    'name' => $student->level,
                    'term' => $d['term'],
                ]);
                $enrollment->update([
                    'level_snapshot' => $student->level,
                    'classroom_id' => $classroom->id,
                ]);
            }
        }

        return $student->load('guardian');
    }

    public function destroy(Request $r, Student $student)
    {
        abort_unless($r->user()->hasAnyRole(['admin', 'academic_admin']), 403);
        $student->delete();

        return ['ok' => true];
    }

    public function resetGuardian(Request $r, Student $student)
    {
        abort_unless($r->user()->hasAnyRole(['admin', 'academic_admin']), 403);
        abort_unless($student->guardian, 422, 'Murid ini belum punya akun orang tua.');
        $pw = Str::random(10);
        $student->guardian->forceFill(['password' => Hash::make($pw)])->save();
        $student->guardian->tokens()->delete();

        return ['password' => $pw];
    }

    public function changePassword(Request $r)
    {
        $d = $r->validate(['current_password' => 'required', 'password' => 'required|min:8|confirmed']);
        $u = $r->user();
        abort_unless(Hash::check($d['current_password'], $u->password), 422, 'Kata sandi saat ini salah.');
        $u->forceFill(['password' => Hash::make($d['password'])])->save();
        $u->tokens()->delete();

        return ['ok' => true];
    }
}
