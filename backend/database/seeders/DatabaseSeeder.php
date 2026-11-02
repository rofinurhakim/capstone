<?php
namespace Database\Seeders;

use App\Models\{Classroom, Enrollment, Score, Student, User};
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $mk = fn ($n, $e, $r) => User::forceCreate(['name' => $n, 'email' => $e, 'role' => $r, 'password' => Hash::make('password')]);
        $mk('Admin Akademik', 'admin@kursus.test', 'admin');
        $teacher = $mk('Pengajar Contoh', 'guru@kursus.test', 'teacher');
        $parent = $mk('Orang Tua Contoh', 'ortu@kursus.test', 'parent');
        $term = now()->year . '-1';

        $c1 = Classroom::create(['name' => 'Kids 2 A', 'term' => $term, 'teacher_id' => $teacher->id]);
        $c2 = Classroom::create(['name' => 'Junior 1 B', 'term' => $term, 'teacher_id' => $teacher->id]);

        foreach ([['Alya Putri', 'Kids 2', $c1, $parent->id], ['Raka Pratama', 'Kids 2', $c1, null], ['Nadia Salsabila', 'Junior 1', $c2, null], ['Dimas Ardiansyah', 'Junior 1', $c2, null]] as $i => [$n, $lv, $c, $g]) {
            $s = Student::create(['nis' => sprintf('S%04d', $i + 1), 'name' => $n, 'level' => $lv, 'guardian_id' => $g]);
            $e = Enrollment::create(['student_id' => $s->id, 'classroom_id' => $c->id, 'term' => $term, 'status' => 'confirmed']);
            foreach (['Speaking', 'Listening', 'Reading', 'Writing'] as $k)
                Score::create(['enrollment_id' => $e->id, 'skill' => $k, 'value' => rand(60, 95)]);
        }
    }
}
