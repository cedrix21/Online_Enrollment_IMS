<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubjectAssignment extends Model
{
    protected $fillable = ['teacher_id', 'subject_id', 'gradeLevel','schedule'];

    public function teacher() {
        return $this->belongsTo(Teacher::class);
    }

    public function subject() {
        return $this->belongsTo(Subject::class);
    }
}