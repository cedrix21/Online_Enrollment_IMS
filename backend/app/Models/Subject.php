<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    protected $fillable = [
    'subjectCode', 
    'subjectName', 
    'gradeLevel',
    'school_year',
];

    /**
     * Get the teacher that teaches this subject
     */
    public function teacher()
    {
        return $this->belongsTo(Teacher::class, 'teacher_id');
    }

    public function sections()
{
    return $this->belongsToMany(Section::class, 'section_subjects')
                ->withPivot('school_year')
                ->withTimestamps();
}
}
