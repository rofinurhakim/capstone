<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReportPublicationSchedule extends Model
{
    protected $guarded = [];
    protected $casts = ['publish_at' => 'datetime'];
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
    public function publisher() { return $this->belongsTo(User::class, 'published_by'); }
}
