<?php

namespace App\Http\Controllers;

use App\Models\Teacher;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Grade;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TeacherPortalController extends Controller
{
    /**
     * Get all dashboard data in a single optimized query
     * Replaces 4 separate API calls with 1
     */
    public function getDashboardData(Request $request)
    {
        try {
            $user = Auth::user();
            
            // Adjust this based on your actual Teachers table structure
            // Check if teachers table has 'email' column directly
            $teacher = Teacher::where('email', $user->email)
                ->firstOrFail();

            // Get unique grade levels this teacher teaches
            // If using assignment relationship
            $gradeLevels = [];
            if (method_exists($teacher, 'assignments')) {
                $gradeLevels = $teacher->assignments()
                    ->pluck('gradeLevel')
                    ->unique()
                    ->values()
                    ->toArray();
            }

            // If no assignments, get from advisory_grade or fallback
            if (empty($gradeLevels) && !empty($teacher->advisory_grade)) {
                $gradeLevels = [$teacher->advisory_grade];
            }

            // If still empty, handle gracefully
            if (empty($gradeLevels)) {
                $gradeLevels = [];
            }

            // Prepare optimized queries with eager loading
            $data = [
                'teacher' => [
                    'id' => $teacher->id,
                    'firstName' => $teacher->firstName,
                    'lastName' => $teacher->lastName,
                    'advisory_grade' => $teacher->advisory_grade ?? 'N/A',
                    'gradeLevels' => $gradeLevels,
                ],
                'students' => !empty($gradeLevels) 
                    ? Student::select('id', 'studentId', 'firstName', 'lastName', 'gradeLevel', 'section_id')
                        ->whereIn('gradeLevel', $gradeLevels)
                        ->with('section:id,name')
                        ->orderBy('lastName')
                        ->get()
                    : [],
                'subjects' => !empty($gradeLevels)
                    ? $teacher->subjects()
                        ->select('subjects.id', 'subjects.subjectName', 'subjects.subjectCode', 'subjects.gradeLevel')
                        ->orderBy('subjects.gradeLevel')
                        ->orderBy('subjects.subjectName')
                        ->get()
                    : [],
                'grades' => !empty($gradeLevels)
                    ? Grade::select('id', 'student_id', 'subject_id', 'score', 'remarks', 'quarter', 'teacher_id','component')
                        ->whereHas('student', function ($q) use ($gradeLevels) {
                            $q->whereIn('gradeLevel', $gradeLevels);
                        })
                        ->where('teacher_id', $teacher->id)
                        ->get()
                    : [],
            ];

            return response()->json($data, 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Teacher not found',
                'error' => $e->getMessage()
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to load dashboard data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk save grades (batch operation)
     */
    public function bulkSaveGrades(Request $request)
    {
        try {
            $user = Auth::user();
            $teacher = Teacher::where('email', $user->email)->firstOrFail();

            $validated = $request->validate([
                'grades' => 'required|array',
                'grades.*.student_id' => 'required|integer|exists:students,id',
                'grades.*.subject_id' => 'required|integer|exists:subjects,id',
                'grades.*.score' => 'required|numeric|min:0|max:100',
                'grades.*.remarks' => 'nullable|string',
                'grades.*.quarter' => 'required|in:Q1,Q2,Q3,Q4',
                'grades.*.component' => 'nullable|string|in:music,arts,pe,health',
            ]);

            $saved = 0;
            foreach ($validated['grades'] as $gradeData) {
                Grade::updateOrCreate(
                    [
                        'student_id' => $gradeData['student_id'],
                        'subject_id' => $gradeData['subject_id'],
                        'quarter' => $gradeData['quarter'],
                        'component' => $gradeData['component'] ?? null,
                        'teacher_id' => $teacher->id,
                    ],
                    [
                        'score' => $gradeData['score'],
                        'remarks' => $gradeData['remarks'] ?? null,
                    ]
                );
                $saved++;
            }

            return response()->json([
                'message' => "{$saved} grades saved successfully!",
                'count' => $saved,
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Teacher not found',
                'error' => $e->getMessage()
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to save grades',
                'error' => $e->getMessage()
            ], 422);
        }
    }
}