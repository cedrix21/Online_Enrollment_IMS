<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        'studentId',
        'firstName',
        'lastName',
        'email',
        'gradeLevel',
        'enrollment_id',
        'section_id',
        'status',
        'school_year',
        // 'created_at' removed from here
    ];

    // Use $casts to format the date for your React Frontend automatically
    protected $casts = [
        'created_at' => 'datetime:Y-m-d',
    ];

    public function enrollment()
    {
        return $this->belongsTo(Enrollment::class);
    }

    public function section()
{
    return $this->belongsTo(Section::class);
}

public function payments()
{
    return $this->hasMany(Payment::class, 'student_id', 'id');
}
}