<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
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

     use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['enrollment_id', 'student_id', 'amount_paid', 'paymentMethod', 'reference_number', 'payment_type', 'receipt_path', 'payment_date', 'payment_status']) // Adjust these fields based on your actual column names
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }
    // Relationships
    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function enrollment()
    {
        return $this->belongsTo(Enrollment::class);
    }
    // app/Models/Student.php

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function grades()
    {
        return $this->hasMany(Grade::class);
    }

    // Cast payment_date as date
    protected $casts = [
        'payment_date' => 'date',
        'amount_paid' => 'decimal:2',
    ];
}
