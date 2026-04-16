<?php

namespace App\Http\Controllers;

use App\Models\Teacher;
use App\Models\Student;
use App\Models\Grade;
use App\Models\Schedule;   // 🆕
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TeacherPortalController extends Controller
{
    public function getDashboardData(Request $request)
    {
        try {
            $user = Auth::user();
            $teacher = Teacher::where('email', $user->email)->firstOrFail();

            $currentSchoolYear = $this->getCurrentSchoolYear();

            // Grade levels this teacher teaches (subject assignments)
            $assignments = $teacher->assignments()
                ->where('school_year', $currentSchoolYear)
                ->get();

            $gradeLevels = $assignments->pluck('gradeLevel')->unique()->values();
            $subjectIds  = $assignments->pluck('subject_id')->unique();

            if ($gradeLevels->isEmpty() && !empty($teacher->advisory_grade)) {
                $gradeLevels = collect([$teacher->advisory_grade]);
            }

            // Get sections where the teacher has schedules for these subjects
            $scheduledSectionIds = Schedule::whereIn('subject_id', $subjectIds)
                ->where('teacher_id', $teacher->id)
                ->where('school_year', $currentSchoolYear)
                ->pluck('section_id')
                ->unique();

            // Students – filter by grade levels AND scheduled sections
            $students = $gradeLevels->isNotEmpty()
                ? Student::select('id', 'studentId', 'firstName', 'lastName', 'gradeLevel', 'section_id')
                    ->whereIn('gradeLevel', $gradeLevels)
                    ->whereIn('section_id', $scheduledSectionIds)
                    ->whereHas('enrollments', fn($q) => $q->where('school_year', $currentSchoolYear))
                    ->where('status', 'active')
                    ->with('section:id,name')
                    ->orderBy('lastName')
                    ->get()
                : collect();

            // Subjects – only those assigned for the CURRENT school year
            $subjects = $assignments->map(fn($a) => [
                'id'            => $a->subject->id,
                'subjectName'   => $a->subject->subjectName,
                'subjectCode'   => $a->subject->subjectCode,
                'gradeLevel'    => $a->gradeLevel,
                'assignment_id' => $a->id,
            ]);

            // Grades – only for students in scheduled sections
            $grades = $gradeLevels->isNotEmpty()
                ? Grade::select('id', 'student_id', 'subject_id', 'score', 'remarks', 'quarter', 'teacher_id', 'component')
                    ->where('teacher_id', $teacher->id)
                    ->whereHas('student', fn($q) => $q->whereIn('gradeLevel', $gradeLevels)
                        ->whereIn('section_id', $scheduledSectionIds)
                        ->whereHas('enrollments', fn($e) => $e->where('school_year', $currentSchoolYear)))
                    ->get()
                : collect();

            return response()->json([
                'teacher' => [
                    'id'             => $teacher->id,
                    'firstName'      => $teacher->firstName,
                    'lastName'       => $teacher->lastName,
                    'advisory_grade' => $teacher->advisory_grade ?? 'N/A',
                    'gradeLevels'    => $gradeLevels,
                    'section'        => $teacher->advisorySection ? $teacher->advisorySection->name : null,
                ],
                'students' => $students,
                'subjects' => $subjects,
                'grades'   => $grades,
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
    //  return '2026-2027';
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