<?php

namespace App\Traits;

trait SchoolYearTrait
{
    /**
     * Get the current school year based on the current date.
     * The school year starts in June.
     *
     * @return string
     */
    protected function getCurrentSchoolYear(): string
    {
        // return '2026-2027';
        $month = (int) date('n');
        $year  = (int) date('Y');
        return ($month >= 6) ? "{$year}-" . ($year + 1) : ($year - 1) . "-{$year}";
    }
}