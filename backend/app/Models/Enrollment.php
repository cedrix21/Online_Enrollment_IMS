<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\EnrollmentSibling;

class Enrollment extends Model
{
    use HasFactory;

   protected $fillable = [
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
    'status', 

];
    // Default status for new applications
    protected $attributes = [
        'status' => 'pending',
    ];

    public function siblings()
{
    return $this->hasMany(EnrollmentSibling::class);
}
}