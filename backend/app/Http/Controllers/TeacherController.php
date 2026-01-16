<?php

namespace App\Http\Controllers;

use App\Models\Teacher;
use App\Models\SubjectAssignment;
use Illuminate\Http\Request;

class TeacherController extends Controller
{
    public function index()
    {
        // Get all teachers with their subject assignments
        return response()->json(Teacher::with('assignments.subject')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'firstName' => 'required',
            'lastName' => 'required',
            'email' => 'required|unique:teachers',
            'specialization' => 'required',
            'advisory_grade' => 'nullable'
        ]);

        // Generate ID: TCH-2026-001
        $count = Teacher::count() + 1;
        $validated['teacherId'] = 'TCH-' . date('Y') . '-' . str_pad($count, 3, '0', STR_PAD_LEFT);

        $teacher = Teacher::create($validated);
        return response()->json($teacher, 201);
    }

    public function assignSubject(Request $request)
    {
        $validated = $request->validate([
            'teacher_id' => 'required|exists:teachers,id',
            'subject_id' => 'required|exists:subjects,id',
            'gradeLevel' => 'required'
        ]);

        $assignment = SubjectAssignment::create($validated);
        return response()->json(['message' => 'Subject assigned successfully', 'data' => $assignment]);
    }
}
