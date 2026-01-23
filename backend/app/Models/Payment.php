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
}
