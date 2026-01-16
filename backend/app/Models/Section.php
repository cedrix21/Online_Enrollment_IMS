<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Section extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',           // e.g., Diamond, Archimedes
        'gradeLevel',     // e.g., Grade 7, Grade 8
        'teacher_id',     // The Advisory Teacher (Foreign Key)
        'capacity',       // Max students allowed (e.g., 40)
        'students_count',  // Current number of enrolled students
    ];

    /**
     * The Advisory Teacher for this section.
     */
    public function advisor()
    {
        return $this->belongsTo(Teacher::class, 'teacher_id');
    }

    /**
     * Students belonging to this section.
     */
    public function students()
    {
        return $this->hasMany(Student::class);
    }

    /**
     * The schedules/subjects assigned to this section.
     */
    public function schedules()
    {
        return $this->hasMany(Schedule::class);
    }
}