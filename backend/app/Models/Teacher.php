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
        // A teacher is linked to subjects via the teacher_id column in the subjects table
        return $this->hasMany(Subject::class, 'teacher_id');
    }
}