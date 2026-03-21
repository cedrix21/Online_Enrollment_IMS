<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EnrollmentRequirement extends Model
{
    protected $fillable = [
        'enrollment_id',
        'type',
        'file_path',
        'original_name',
        'status',
    ];

    // Human-readable label for each type
    public function getTypeLabelAttribute(): string
    {
        return match($this->type) {
            'psa'          => 'PSA Birth Certificate',
            'good_moral'   => 'Certificate of Good Moral',
            'report_card'  => 'Original Report Card',
            'picture_2x2'  => '2x2 ID Picture',
            'picture_1x1'  => '1x1 ID Picture',
            default        => ucfirst(str_replace('_', ' ', $this->type)),
        };
    }

    public function enrollment()
    {
        return $this->belongsTo(Enrollment::class);
    }
}