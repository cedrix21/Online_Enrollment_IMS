<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = [
        'enrollment_id',
        'student_id',
        'amount_paid',
        'paymentMethod',
        'reference_number',
        'payment_type',
        'receipt_path',
        'payment_date',
        'payment_status',
    ];
    // Relationships
    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function enrollment()
    {
        return $this->belongsTo(Enrollment::class);
    }

    // Cast payment_date as date
    protected $casts = [
        'payment_date' => 'date',
        'amount_paid' => 'decimal:2',
    ];
}
