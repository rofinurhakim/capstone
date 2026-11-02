<?php
namespace App\Http\Controllers;

use App\Models\{Enrollment, Student};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ManageController extends Controller
{
    public function update(Request $r, Student $student)
    {
        abort_unless($r->user()->role === 'admin', 403);
        $d = $r->validate(['name' => 'required|string|max:100', 'level' => 'required|string|max:50',
            'classroom_id' => 'nullable|exists:classrooms,id', 'term' => 'nullable|string|max:20']);
        $student->update(['name' => $d['name'], 'level' => $d['level']]);
        if (!empty($d['classroom_id']) && !empty($d['term']))
            Enrollment::where('student_id', $student->id)->where('term', $d['term'])->update(['classroom_id' => $d['classroom_id']]);
        return $student;
    }

    public function destroy(Request $r, Student $student)
    {
        abort_unless($r->user()->role === 'admin', 403);
        $student->delete(); // pendaftaran dan nilai ikut terhapus (cascade)
        return ['ok' => true];
    }

    public function resetGuardian(Request $r, Student $student)
    {
        abort_unless($r->user()->role === 'admin', 403);
        abort_unless($student->guardian, 422, 'Murid ini belum punya akun orang tua.');
        $pw = Str::random(10);
        $student->guardian->forceFill(['password' => Hash::make($pw)])->save();
        $student->guardian->tokens()->delete(); // paksa login ulang
        return ['password' => $pw];
    }

    public function changePassword(Request $r)
    {
        $d = $r->validate(['current_password' => 'required', 'password' => 'required|min:8|confirmed']);
        $u = $r->user();
        abort_unless(Hash::check($d['current_password'], $u->password), 422, 'Kata sandi saat ini salah.');
        $u->forceFill(['password' => Hash::make($d['password'])])->save();
        return ['ok' => true];
    }
}
