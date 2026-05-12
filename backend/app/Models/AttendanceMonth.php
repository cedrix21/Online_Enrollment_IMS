<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttendanceMonth extends Model
{
    use HasFactory;
    protected $fillable = ['student_id', 'school_year', 'grade', 'month', 'school_days', 'present', 'absent'];
}
