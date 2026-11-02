<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Enrollment extends Model
{
    protected $guarded = [];
    public function student() { return $this->belongsTo(Student::class); }
    public function classroom() { return $this->belongsTo(Classroom::class); }
    public function scores() { return $this->hasMany(Score::class); }
}
