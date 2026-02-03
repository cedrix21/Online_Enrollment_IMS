<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Teacher extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacherId',      // The unique TCH-2026-XXXX ID
        'firstName', 
        'lastName', 
        'email', 
        'specialization', // e.g., Mathematics, Filipino
        'advisory_grade',
        'phone',          // Contact info is vital for staff
        'status'          // active, on_leave, resigned
    ];

    // This teacher's advisory students
    public function advisoryStudents()
    {
        return $this->hasMany(Student::class, 
        'gradeLevel', 
        'advisory_grade');
    }

    
    // The subjects this teacher is assigned to teach
    public function assignments()
    {
        return $this->hasMany(SubjectAssignment::class);
    }
        public function subjects()
    {
        return $this->hasManyThrough(
            Subject::class,
            SubjectAssignment::class,
            'teacher_id',    // Foreign key on subject_assignments
            'id',            // Foreign key on subjects
            'id',            // Local key on teachers
            'subject_id'     // Local key on subject_assignments
        );
    }
     public function allStudents()
    {
        // Get unique grade levels this teacher handles
        $gradeLevels = $this->assignments()->pluck('gradeLevel')->unique();
        
        return Student::whereIn('gradeLevel', $gradeLevels)->get();
    }
}