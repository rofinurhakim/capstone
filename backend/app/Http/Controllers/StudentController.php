<?php
namespace App\Http\Controllers;

use App\Models\{Classroom, Enrollment, Student, User};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{DB, Hash};
use Illuminate\Support\Str;

class StudentController extends Controller
{
    public function classrooms() { return Classroom::orderBy('name')->get(['id', 'name']); }

    // Admin mendaftarkan murid baru; akun orang tua dibuat otomatis bila email belum ada.
    public function store(Request $r)
    {
        abort_unless($r->user()->role === 'admin', 403);
        $d = $r->validate([
            'name' => 'required|string|max:100', 'level' => 'required|string|max:50',
            'classroom_id' => 'required|exists:classrooms,id', 'term' => 'required|string|max:20',
            'guardian_name' => 'required|string|max:100', 'guardian_email' => 'required|email',
        ]);
        return DB::transaction(function () use ($d) {
            $pw = null;
            $g = User::where('email', $d['guardian_email'])->first();
            if (!$g) {
                $pw = Str::random(10);
                $g = User::forceCreate(['name' => $d['guardian_name'], 'email' => $d['guardian_email'], 'role' => 'parent', 'password' => Hash::make($pw)]);
            }
            $s = Student::create(['nis' => 'S' . now()->format('ymd') . strtoupper(Str::random(4)), 'name' => $d['name'], 'level' => $d['level'], 'guardian_id' => $g->id]);
            Enrollment::create(['student_id' => $s->id, 'classroom_id' => $d['classroom_id'], 'term' => $d['term']]);
            return ['student' => $s, 'guardianPassword' => $pw];
        });
    }
}
