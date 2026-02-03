<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    /**
     * Get all subjects (already exists as a closure in your routes)
     * This is the proper controller method
     */
    public function index()
    {
        $subjects = Subject::with('teacher')->orderBy('gradeLevel')->orderBy('subjectName')->get();
        return response()->json($subjects);
    }

    /**
     * Create a new subject
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'subjectName' => 'required|string|max:255',
            'subjectCode' => 'required|string|max:50',
            'gradeLevel' => 'required|string',
            'description' => 'nullable|string',
        ]);

        // Check if subject code already exists for this grade level
        $exists = Subject::where('subjectCode', $validated['subjectCode'])
            ->where('gradeLevel', $validated['gradeLevel'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'A subject with this code already exists for this grade level'
            ], 400);
        }

        $subject = Subject::create($validated);

        return response()->json([
            'message' => 'Subject created successfully',
            'subject' => $subject
        ], 201);
    }

    /**
     * Update an existing subject
     */
    public function update(Request $request, $id)
    {
        $subject = Subject::findOrFail($id);

        $validated = $request->validate([
            'subjectName' => 'sometimes|string|max:255',
            'subjectCode' => 'sometimes|string|max:50',
            'gradeLevel' => 'sometimes|string',
            'description' => 'nullable|string',
        ]);

        // Check if updated subject code already exists for this grade level (excluding current subject)
        if (isset($validated['subjectCode']) || isset($validated['gradeLevel'])) {
            $exists = Subject::where('subjectCode', $validated['subjectCode'] ?? $subject->subjectCode)
                ->where('gradeLevel', $validated['gradeLevel'] ?? $subject->gradeLevel)
                ->where('id', '!=', $id)
                ->exists();

            if ($exists) {
                return response()->json([
                    'message' => 'A subject with this code already exists for this grade level'
                ], 400);
            }
        }

        $subject->update($validated);

        return response()->json([
            'message' => 'Subject updated successfully',
            'subject' => $subject->fresh()
        ]);
    }

    /**
     * Delete a subject
     */
    public function destroy($id)
    {
        $subject = Subject::findOrFail($id);

        // Check if subject has any assignments
        $hasAssignments = \App\Models\SubjectAssignment::where('subject_id', $id)->exists();
        
        if ($hasAssignments) {
            return response()->json([
                'message' => 'Cannot delete subject. It has active teacher assignments. Please remove assignments first.'
            ], 400);
        }

        // Check if subject has any grades
        $hasGrades = \App\Models\Grade::where('subject_id', $id)->exists();
        
        if ($hasGrades) {
            return response()->json([
                'message' => 'Cannot delete subject. It has student grades recorded. Please remove grades first.'
            ], 400);
        }

        $subject->delete();

        return response()->json([
            'message' => 'Subject deleted successfully'
        ]);
    }

    /**
     * Get subjects by grade level
     */
    public function getByGrade($gradeLevel)
    {
        $subjects = Subject::where('gradeLevel', $gradeLevel)
            ->orderBy('subjectName')
            ->get();

        return response()->json($subjects);
    }
}