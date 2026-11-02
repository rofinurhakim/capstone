<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Model;
class Classroom extends Model
{
    public const LEVELS = ['MATTHEW A', 'MATTHEW B', 'MARK', 'LUKE', 'JOHN', 'TIMOTHY', 'GENESIS', 'ECSC'];

    protected $guarded = [];

    public function enrollments()
    {
        return $this->hasMany(Enrollment::class);
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function teachers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'classroom_teacher', 'classroom_id', 'teacher_id')->withTimestamps();
    }
}