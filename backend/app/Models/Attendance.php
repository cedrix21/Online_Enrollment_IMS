<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory;
    protected $fillable = [
        'student_id', 'school_year', 'grade',
        'school_days', 'absent', 'cause1', 'tardy', 'cause2', 'present',
    ];
}