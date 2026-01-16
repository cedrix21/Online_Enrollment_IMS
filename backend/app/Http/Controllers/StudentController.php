<?php

namespace App\Http\Controllers;

use App\Models\Student;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function index()
    {
        // This only fetches students who have been approved and moved to the students table
        $students = Student::all(); 
        return response()->json(Student::orderBy('created_at', 'desc')->get());
    }
}