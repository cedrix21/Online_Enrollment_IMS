<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TuitionFee extends Model
{
    protected $fillable = [
        'grade_level',
        'school_year',
        'tuition_fee',
        'korean_fee',
        'down_payment',
        'monthly_terms',
        'is_active',
    ];

    protected $casts = [
        'tuition_fee'   => 'decimal:2',
        'korean_fee'    => 'decimal:2',
        'down_payment'  => 'decimal:2',
        'is_active'     => 'boolean',
    ];

    public function miscItems()
    {
        return $this->hasMany(MiscFeeItem::class)
                    ->orderBy('sort_order');
    }

    // Auto-computed fields
    public function getMiscTotalAttribute(): float
    {
        return $this->miscItems->sum('amount');
    }

    public function getTotalFeeAttribute(): float
    {
        return $this->tuition_fee + $this->misc_total + $this->korean_fee;
    }

    public function getRemainingBalanceAttribute(): float
    {
        return $this->total_fee - $this->down_payment;
    }

    public function getMonthlyPaymentAttribute(): float
    {
        if ($this->monthly_terms <= 0) return 0;
        return round($this->remaining_balance / $this->monthly_terms, 2);
    }
}