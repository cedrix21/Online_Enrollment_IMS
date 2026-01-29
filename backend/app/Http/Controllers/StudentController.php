<?php

namespace App\Http\Controllers;

use App\Models\Student;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function index()
    {
        // ✅ FIXED: Eagerly load payments, section, and enrollment relationships
        $students = Student::with(['payments', 'section', 'enrollment'])
            ->orderBy('created_at', 'desc')
            ->get();
        
        return response()->json($students);
    }
}