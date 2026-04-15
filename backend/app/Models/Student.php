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
    'middleName',      
    'nickname',        
    'email',
    'gender',          
    'dateOfBirth',     
    'gradeLevel',
    'section_id',
    'status',
    'school_year',
    'lrn',
    'contact_number',
];

    protected $casts = [
        'created_at' => 'datetime:Y-m-d',
    ];

    // A student has many enrollments (one per school year/grade)
    public function enrollments()
    {
        return $this->hasMany(Enrollment::class);
    }

    // Current/latest enrollment
    public function latestEnrollment()
    {
        return $this->hasOne(Enrollment::class)->latestOfMany();
    }

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'student_id', 'id');
    }

    public function grades()
    {
        return $this->hasMany(Grade::class);
    }
    public function currentEnrollment()
{
    return $this->hasOne(Enrollment::class)->latestOfMany();
}
}