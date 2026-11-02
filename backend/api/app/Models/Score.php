<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Score extends Model { protected $guarded = []; public function enrollment() { return $this->belongsTo(Enrollment::class); } }