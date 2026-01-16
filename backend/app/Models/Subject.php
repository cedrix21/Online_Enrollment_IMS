<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    protected $fillable = [
    'subjectCode', 
    'subjectName', 
    'gradeLevel', // The "Class" this subject belongs to
    'teacher_id'  // The teacher assigned to teach this subject
];
}
