<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentRecord extends Model
{
    use HasFactory;

    protected $fillable = [
         'student_id',
        'first_name',
        'last_name',
        'grade_level',
        'lrn',
        'contact_number',
        'school_year',
    ];
}