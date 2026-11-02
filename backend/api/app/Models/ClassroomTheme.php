<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClassroomTheme extends Model
{
    protected $guarded = [];
    public function classroom() { return $this->belongsTo(Classroom::class); }
}
