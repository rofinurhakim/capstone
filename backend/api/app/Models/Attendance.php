<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    protected $guarded = [];
    protected $casts = ['date' => 'date'];

    public function enrollment() { return $this->belongsTo(Enrollment::class); }
}