<?php

namespace App\Http\Controllers;

use App\Models\StudentRecord;
use Illuminate\Http\Request;


class StudentRecordController extends Controller
{
    public function index()
    {
        return StudentRecord::orderBy('created_at', 'desc')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'studentId' => 'required|string|unique:student_records,student_id',
            'firstName' => 'required|string',
            'lastName' => 'required|string',
            'gradeLevel' => 'required|string',
            'lrn' => 'nullable|string',
            'contactNumber' => 'required|string',
            'schoolYear' => 'required|string',
        ]);

        $record = StudentRecord::create([
        'student_id' => $validated['studentId'],
        'first_name' => $validated['firstName'],
        'last_name' => $validated['lastName'],
        'grade_level' => $validated['gradeLevel'],
        'lrn' => $validated['lrn'],
        'contact_number' => $validated['contactNumber'],
        'school_year' => $validated['schoolYear'],
    ]);

        return response()->json($record, 201);
    }

    public function destroy($id)
    {
        $record = StudentRecord::findOrFail($id);
        $record->delete();
        return response()->json(['message' => 'Record deleted successfully']);
    }
    public function update(Request $request, $id)
{
    $record = StudentRecord::findOrFail($id);

    $validated = $request->validate([
        'firstName' => 'required|string',
        'lastName' => 'required|string',
        'gradeLevel' => 'required|string',
        'lrn' => 'nullable|string',
        'contactNumber' => 'required|string',
        'schoolYear' => 'required|string',
    ]);

    $record->update([
        'first_name' => $validated['firstName'],
        'last_name' => $validated['lastName'],
        'grade_level' => $validated['gradeLevel'],
        'lrn' => $validated['lrn'],
        'contact_number' => $validated['contactNumber'],
        'school_year' => $validated['schoolYear'],
    ]);

    return response()->json($record);
}

}