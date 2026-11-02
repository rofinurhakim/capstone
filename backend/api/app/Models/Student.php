<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Student extends Model { protected $guarded = []; public function guardian() { return $this->belongsTo(User::class, 'guardian_id'); } public function enrollments() { return $this->hasMany(Enrollment::class); } }