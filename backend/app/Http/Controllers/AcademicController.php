<?php
namespace App\Http\Controllers;

use App\Models\{Enrollment, Score, Student};
use Illuminate\Http\Request;

class AcademicController extends Controller
{
    const SKILLS = ['Speaking', 'Listening', 'Reading', 'Writing'];

    public function summary(Request $r)
    {
        $term = $r->query('term', now()->year . '-1');
        $en = Enrollment::where('term', $term);
        return [
            'students' => Student::where('status', 'active')->count(),
            'enrollments' => (clone $en)->count(),
            'pending' => (clone $en)->where('status', 'pending')->count(),
            'scoresFilled' => Score::whereIn('enrollment_id', (clone $en)->pluck('id'))->count(),
            'scoresTarget' => (clone $en)->count() * count(self::SKILLS),
        ];
    }

    // Guru/admin: semua murid. Orang tua: hanya anaknya.
    public function roster(Request $r)
    {
        $q = Enrollment::with(['student', 'classroom', 'scores'])->where('term', $r->query('term', now()->year . '-1'));
        if ($r->user()->role === 'parent') $q->whereHas('student', fn ($s) => $s->where('guardian_id', $r->user()->id));
        return $q->get()->map(fn ($e) => [
            'id' => $e->id, 'student_id' => $e->student_id, 'classroom_id' => $e->classroom_id, 'note' => $e->note, 'name' => $e->student->name, 'level' => $e->student->level,
            'class' => $e->classroom->name, 'status' => $e->status,
            'scores' => $e->scores->pluck('value', 'skill'),
        ]);
    }

    public function saveScores(Request $r)
    {
        abort_if($r->user()->role === 'parent', 403);
        $data = $r->validate(['rows' => 'required|array', 'rows.*.id' => 'exists:enrollments,id', 'rows.*.scores' => 'array', 'rows.*.note' => 'nullable|string|max:500']);
        foreach ($data['rows'] as $row) {
            if (array_key_exists('note', $row)) Enrollment::whereKey($row['id'])->update(['note' => $row['note']]);
            foreach ($row['scores'] ?? [] as $skill => $v)
                if (in_array($skill, self::SKILLS) && is_numeric($v) && $v >= 0 && $v <= 100)
                    Score::updateOrCreate(['enrollment_id' => $row['id'], 'skill' => $skill], ['value' => $v]);
        }
        return ['ok' => true];
    }

    // Daftar ulang: ajukan semua murid yang belum keluar ke term berikutnya.
    public function proposeReenroll(Request $r)
    {
        abort_unless($r->user()->role === 'admin', 403);
        $r->validate(['from' => 'required', 'to' => 'required']);
        $n = 0;
        foreach (Enrollment::where('term', $r->from)->where('status', '!=', 'left')->get() as $e)
            $n += Enrollment::firstOrCreate(['student_id' => $e->student_id, 'term' => $r->to],
                ['classroom_id' => $e->classroom_id])->wasRecentlyCreated;
        return ['created' => $n];
    }

    public function setStatus(Request $r, Enrollment $enrollment)
    {
        abort_unless($r->user()->role === 'admin', 403);
        $enrollment->update($r->validate(['status' => 'in:pending,confirmed,left']));
        return $enrollment;
    }
}
