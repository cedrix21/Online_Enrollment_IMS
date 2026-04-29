<?php

namespace App\Http\Controllers;

use App\Traits\SchoolYearTrait;

class SchoolYearController extends Controller
{
    use SchoolYearTrait;

    public function getCurrentYear()
    {
        return response()->json([
            'school_year' => $this->getCurrentSchoolYear()
        ]);
    }
}