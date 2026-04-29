<?php

namespace App\Http\Controllers;


class SchoolYearController extends Controller
{
    public function getCurrentYear()
    {
        return response()->json([
            'school_year' => $this->calculateSchoolYear()
        ]);
    }

    private function calculateSchoolYear(): string
    {
        $month = (int) date('n');
        $year  = (int) date('Y');
        return ($month >= 6) ? "{$year}-" . ($year + 1) : ($year - 1) . "-{$year}";
    }
}