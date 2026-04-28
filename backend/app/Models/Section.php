<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
class Section extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',            
        'gradeLevel',     
        'teacher_id',      
        'capacity',        
        'students_count', 
        'school_year'  
    ];

     use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'gradeLevel', 'teacher_id', 'capacity', 'students_count', 'school_year']) // Adjust these fields based on your actual column names
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

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

    public function subjects()
{
    return $this->belongsToMany(Subject::class, 'section_subjects')
                ->withPivot('school_year')
                ->withTimestamps();
}
}