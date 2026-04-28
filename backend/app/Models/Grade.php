<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
class Grade extends Model
{
    protected $fillable = [
        'teacher_id',
        'student_id',
        'subject_id',
        'score',
        'remarks',
        'quarter',  // Q1, Q2, Q3, Q4
        'component' // For MAPEH: music, arts, pe, health
    ];
     use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['teacher_id', 'student_id', 'subject_id', 'score', 'remarks', 'quarter', 'component']) // Adjust these fields based on your actual column names
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }
}
