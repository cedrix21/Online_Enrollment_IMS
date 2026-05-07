<?php

namespace App\Traits;

use App\Models\Setting;           

trait SchoolYearTrait
{
    protected function getCurrentSchoolYear(): string
    {
        // 1. Manual override from the settings table
        $manual = Setting::where('key', 'current_school_year')->value('value');
        if ($manual) {
            return $manual;
        }

        // 2. Automatic calculation (June–May cycle)
        $month = (int) date('n');
        $year  = (int) date('Y');
        return ($month >= 6) ? "{$year}-" . ($year + 1) : ($year - 1) . "-{$year}";
    }
}