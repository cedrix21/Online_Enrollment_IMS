<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
class ObservedValue extends Model
{
    use HasFactory;
    protected $fillable = [
        'student_id', 'school_year', 'grade', 'core_value_key',
        'q1', 'q2', 'q3', 'q4',
    ];
}
