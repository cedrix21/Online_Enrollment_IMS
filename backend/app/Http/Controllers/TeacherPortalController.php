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
        $teacher = Teacher::where('email', $user->email)->firstOrFail();

        // Determine current school year (e.g., 2025-2026)
        $currentSchoolYear = $this->getCurrentSchoolYear();

        // Get grade levels this teacher teaches
        $gradeLevels = [];
        if (method_exists($teacher, 'assignments')) {
            $gradeLevels = $teacher->assignments()
                ->pluck('gradeLevel')
                ->unique()
                ->values()
                ->toArray();
        }

        if (empty($gradeLevels) && !empty($teacher->advisory_grade)) {
            $gradeLevels = [$teacher->advisory_grade];
        }

        // Students – filter by grade levels AND current school year
        $students = !empty($gradeLevels)
            ? Student::select('id', 'studentId', 'firstName', 'lastName', 'gradeLevel', 'section_id')
                ->whereIn('gradeLevel', $gradeLevels)
                ->whereHas('enrollments', function ($q) use ($currentSchoolYear) {
                    $q->where('school_year', $currentSchoolYear);
                })
                ->where('status', 'active')
                ->with('section:id,name')
                ->orderBy('lastName')
                ->get()
            : [];

        // Subjects
        $subjects = !empty($gradeLevels)
            ? $teacher->subjects()
                ->select('subjects.id', 'subjects.subjectName', 'subjects.subjectCode', 'subjects.gradeLevel')
                ->orderBy('subjects.gradeLevel')
                ->orderBy('subjects.subjectName')
                ->get()
            : [];

        // Grades – also filter students by current school year
        $grades = !empty($gradeLevels)
            ? Grade::select('id', 'student_id', 'subject_id', 'score', 'remarks', 'quarter', 'teacher_id', 'component')
                ->whereHas('student', function ($q) use ($gradeLevels, $currentSchoolYear) {
                    $q->whereIn('gradeLevel', $gradeLevels)
                      ->whereHas('enrollments', function ($eq) use ($currentSchoolYear) {
                          $eq->where('school_year', $currentSchoolYear);
                      });
                })
                ->where('teacher_id', $teacher->id)
                ->get()
            : [];

        return response()->json([
            'teacher' => [
                'id' => $teacher->id,
                'firstName' => $teacher->firstName,
                'lastName' => $teacher->lastName,
                'advisory_grade' => $teacher->advisory_grade ?? 'N/A',
                'gradeLevels' => $gradeLevels,
            ],
            'students' => $students,
            'subjects' => $subjects,
            'grades' => $grades,
        ], 200);
    } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
        return response()->json(['message' => 'Teacher not found'], 404);
    } catch (\Exception $e) {
        return response()->json(['message' => 'Failed to load dashboard data', 'error' => $e->getMessage()], 500);
    }
}

/**
 * Helper to get current school year (e.g., 2025-2026)
 */
private function getCurrentSchoolYear(): string
{
     // return '2026-2027';
    $month = (int) date('n');
    $year  = (int) date('Y');
    return ($month >= 6) ? "{$year}-" . ($year + 1) : ($year - 1) . "-{$year}";
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