<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Enrollment extends Model {
	protected $guarded = [];
	protected $casts = ['confirmed_at' => 'datetime', 'teacher_verified_at' => 'datetime', 'academic_verified_at' => 'datetime', 'report_publish_at' => 'datetime', 'published_at' => 'datetime', 'placement_test_completed_at' => 'datetime', 'revision_requested_at' => 'datetime'];
	public function student() { return $this->belongsTo(Student::class); }
	public function classroom() { return $this->belongsTo(Classroom::class); }
	public function scores() { return $this->hasMany(Score::class); }
	 public function attendances() { return $this->hasMany(Attendance::class); }
	 public function quizScores() { return $this->hasMany(QuizScore::class); }
}