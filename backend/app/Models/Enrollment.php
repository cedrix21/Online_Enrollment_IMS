<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Enrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',           // new
        'school_year',          // new
        'firstName',
        'lastName',
        'middleName',
        'nickname',
        'email',
        'gradeLevel',
        'gender',
        'dateOfBirth',
        'registrationType',
        'handedness',
        'fatherName',
        'fatherContact',
        'fatherOccupation',
        'fatherEmail',
        'fatherAddress',
        'motherName',
        'motherContact',
        'motherOccupation',
        'motherEmail',
        'motherAddress',
        'emergencyContact',
        'medicalConditions',
        'psa_received',
        'id_picture_received',
        'good_moral_received',
        'report_card_received',
        'kids_note_installed',
        'enrollmentDate',
        'status',
    ];

    protected $attributes = [
        'status' => 'pending',
    ];

    // Enrollment belongs to a Student
    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function siblings()
    {
        return $this->hasMany(EnrollmentSibling::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function requirements()
    {
        return $this->hasMany(EnrollmentRequirement::class);
    }

    // Optional: grades directly linked to enrollment
    public function grades()
    {
        return $this->hasMany(Grade::class);
    }
}