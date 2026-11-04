<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Student extends Model
{
    public const SECTORS = [
        'Eden',
        'Efrata',
        'Galilea',
        'Gloria',
        'Haleluya',
        'Hosiana',
        'Imanuel',
        'Makedonia',
        'Maranatha',
        'Nafiri',
        'Nazareth',
        'Sion',
        'Syalom',
        'Yerusalem',
    ];

    protected $guarded = [];
    protected $hidden = ['address'];

    public function guardian()
    {
        return $this->belongsTo(User::class, 'guardian_id');
    }

    public function enrollments()
    {
        return $this->hasMany(Enrollment::class);
    }
}