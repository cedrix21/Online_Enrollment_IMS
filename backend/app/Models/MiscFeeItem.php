<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MiscFeeItem extends Model
{
    protected $fillable = [
        'tuition_fee_id',
        'label',
        'amount',
        'sort_order',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function tuitionFee()
    {
        return $this->belongsTo(TuitionFee::class);
    }
}