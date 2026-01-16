<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EnrollmentSibling extends Model
{
    protected $fillable = [
        'enrollment_id',
        'full_name',
        'birth_date',
    ];
}
