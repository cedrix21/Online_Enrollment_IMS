<?php

namespace App\Http\Controllers;

use App\Models\Grade;
use App\Models\Student;
use App\Models\Subject;
use App\Models\SubjectAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GradeController extends Controller
{
    // ═══════════════════════════════════════════════════════════════════
    // TEACHER PORTAL METHODS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get teacher information and advisory section
     */
    public function getTeacherInfo(Request $request)
    {
        $teacher = Auth::user()->teacher;
        
        if (!$teacher) {
            return response()->json(['message' => 'Teacher record not found'], 404);
        }

        // Get the section for this teacher's advisory grade
        $section = \App\Models\Section::where('gradeLevel', $teacher->advisory_grade)->first();

        // Get unique grade levels this teacher handles (from subject assignments)
        $gradeLevels = SubjectAssignment::where('teacher_id', $teacher->id)
            ->pluck('gradeLevel')
            ->unique()
            ->values();

        return response()->json([
            'id' => $teacher->id,
            'firstName' => $teacher->firstName,
            'lastName' => $teacher->lastName,
            'advisory_grade' => $teacher->advisory_grade,
            'section' => $section ? $section->name : 'Not Assigned',
            'specialization' => $teacher->specialization,
            'teacherId' => $teacher->teacherId,
            'gradeLevels' => $gradeLevels, // All grade levels teacher teaches
        ]);
    }

    /**
     * Get ALL students this teacher handles (across ALL assigned grade levels)
     * NOT just advisory students
     */
    public function getTeacherStudents(Request $request)
    {
        $teacher = Auth::user()->teacher;
        
        if (!$teacher) {
            return response()->json(['message' => 'Teacher record not found'], 404);
        }

        // Get unique grade levels from teacher's subject assignments
        $gradeLevels = SubjectAssignment::where('teacher_id', $teacher->id)
            ->pluck('gradeLevel')
            ->unique();

        // Get all students from those grade levels
        $students = Student::whereIn('gradeLevel', $gradeLevels)
            ->where('status', 'active')
            ->with(['section'])
            ->orderBy('gradeLevel')
            ->orderBy('lastName')
            ->orderBy('firstName')
            ->get();

        return response()->json($students);
    }

    /**
     * Get ALL subjects assigned to the logged-in teacher (with grade level context)
     */
    public function getTeacherSubjects(Request $request)
    {
        $teacher = Auth::user()->teacher;
        
        if (!$teacher) {
            return response()->json(['message' => 'Teacher record not found'], 404);
        }

        // Get subject assignments with subject details
        $assignments = SubjectAssignment::with('subject')
            ->where('teacher_id', $teacher->id)
            ->orderBy('gradeLevel')
            ->get();

        // Map to include grade level context
        $subjects = $assignments->map(function($assignment) {
            return [
                'id' => $assignment->subject->id,
                'subjectName' => $assignment->subject->subjectName,
                'subjectCode' => $assignment->subject->subjectCode,
                'description' => $assignment->subject->description ?? '',
                'gradeLevel' => $assignment->gradeLevel,
                'assignment_id' => $assignment->id,
                'schedule' => $assignment->schedule
            ];
        });

        return response()->json($subjects);
    }

    /**
     * Get grades for this teacher's subjects
     */
    public function getGrades(Request $request)
    {
        $teacher = Auth::user()->teacher;
        
        if (!$teacher) {
            return response()->json(['message' => 'Teacher record not found'], 404);
        }

        // Get subject IDs this teacher handles
        $subjectIds = SubjectAssignment::where('teacher_id', $teacher->id)
            ->pluck('subject_id')
            ->unique();

        // Get grade levels this teacher handles
        $gradeLevels = SubjectAssignment::where('teacher_id', $teacher->id)
            ->pluck('gradeLevel')
            ->unique();

        // Get grades for these subjects and grade levels
        $grades = Grade::with(['student', 'subject'])
            ->whereIn('subject_id', $subjectIds)
            ->whereHas('student', function($query) use ($gradeLevels) {
                $query->whereIn('gradeLevel', $gradeLevels);
            })
            ->get();

        return response()->json($grades);
    }

    /**
     * Store or update a grade
     */
    public function submitGrade(Request $request)
    {
        $request->validate([
            'student_id' => 'required|exists:students,id',
            'subject_id' => 'required|exists:subjects,id',
            'score' => 'required|numeric|min:0|max:100',
            'remarks' => 'nullable|string',
            'quarter' => 'required|string|in:Q1,Q2,Q3,Q4',
        ]);

        $teacher = Auth::user()->teacher;
        
        if (!$teacher) {
            return response()->json(['message' => 'Teacher record not found'], 404);
        }

        // Verify teacher is assigned to teach this subject
        $hasAssignment = SubjectAssignment::where([
            'teacher_id' => $teacher->id,
            'subject_id' => $request->subject_id
        ])->exists();

        if (!$hasAssignment) {
            return response()->json([
                'message' => 'You are not assigned to teach this subject'
            ], 403);
        }

        // Verify student is in a grade level this teacher handles
        $student = Student::findOrFail($request->student_id);
        $teacherGradeLevels = SubjectAssignment::where('teacher_id', $teacher->id)
            ->pluck('gradeLevel');

        if (!$teacherGradeLevels->contains($student->gradeLevel)) {
            return response()->json([
                'message' => 'This student is not in any grade level you teach'
            ], 403);
        }

        // Check if grade already exists (using teacher_id is optional here)
        $grade = Grade::where('student_id', $request->student_id)
            ->where('subject_id', $request->subject_id)
            ->where('quarter', $request->quarter)
            ->first();

        if ($grade) {
            // Update existing grade
            $grade->update([
                'score' => $request->score,
                'remarks' => $request->remarks,
                'teacher_id' => $teacher->id // Update teacher_id if needed
            ]);
        } else {
            // Create new grade
            $grade = Grade::create([
                'teacher_id' => $teacher->id,
                'student_id' => $request->student_id,
                'subject_id' => $request->subject_id,
                'score' => $request->score,
                'remarks' => $request->remarks,
                'quarter' => $request->quarter,
            ]);
        }

        return response()->json([
            'message' => 'Grade saved successfully',
            'grade' => $grade->load(['student', 'subject'])
        ]);
    }

    /**
     * Get grades for all students in a specific subject
     */
    public function getSubjectGrades(Request $request, $subjectId)
    {
        $teacher = Auth::user()->teacher;
        
        if (!$teacher) {
            return response()->json(['message' => 'Teacher record not found'], 404);
        }

        // Verify the teacher is assigned to teach this subject
        $hasAssignment = SubjectAssignment::where([
            'teacher_id' => $teacher->id,
            'subject_id' => $subjectId
        ])->exists();

        if (!$hasAssignment) {
            return response()->json(['message' => 'Subject not assigned to you'], 404);
        }

        $grades = Grade::where('subject_id', $subjectId)
            ->whereHas('student', function($query) use ($teacher) {
                $teacherGradeLevels = SubjectAssignment::where('teacher_id', $teacher->id)
                    ->pluck('gradeLevel');
                $query->whereIn('gradeLevel', $teacherGradeLevels);
            })
            ->with(['student', 'subject'])
            ->get();

        return response()->json($grades);
    }

    // ═══════════════════════════════════════════════════════════════════
    // ADMIN/REGISTRAR METHODS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Admin/Registrar - Get all grades with filters
     */
    public function getAllGrades(Request $request)
    {
        $query = Grade::query();

        // Filter by teacher
        if ($request->has('teacher_id')) {
            $query->where('teacher_id', $request->teacher_id);
        }

        // Filter by student
        if ($request->has('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        // Filter by subject
        if ($request->has('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }

        // Filter by quarter
        if ($request->has('quarter')) {
            $query->where('quarter', $request->quarter);
        }

        // Filter by grade level
        if ($request->has('gradeLevel')) {
            $query->whereHas('student', function ($q) {
                $q->where('gradeLevel', request('gradeLevel'))->where('status', 'active');
            });
        }

        // Only show grades for active (approved) students
        $grades = $query->whereHas('student', function ($q) {
            $q->where('status', 'active');
        })->with(['student', 'subject', 'student.section','teacher'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($grades);
    }

    /**
     * Admin/Registrar - Update a grade
     */
    public function updateGrade(Request $request, $gradeId)
    {
        $request->validate([
            'score' => 'required|numeric|min:0|max:100',
            'remarks' => 'nullable|string',
        ]);

        $grade = Grade::find($gradeId);

        if (!$grade) {
            return response()->json(['message' => 'Grade not found'], 404);
        }

        $grade->update([
            'score' => $request->score,
            'remarks' => $request->remarks,
        ]);

        return response()->json([
            'message' => 'Grade updated successfully',
            'grade' => $grade->load(['student', 'subject'])
        ]);
    }

    /**
     * Admin/Registrar - Get statistics
     */
    public function getGradeStatistics(Request $request)
    {
        $stats = [];

        // Overall statistics
        $stats['total_grades'] = Grade::count();
        $stats['average_score'] = Grade::avg('score');
        
        // By quarter
        $stats['by_quarter'] = Grade::selectRaw('quarter, COUNT(*) as count, AVG(score) as average')
            ->groupBy('quarter')
            ->get();

        // By teacher
        $stats['by_teacher'] = Grade::selectRaw('teacher_id, COUNT(*) as count, AVG(score) as average')
            ->groupBy('teacher_id')
            ->get();

        // By subject
        $stats['by_subject'] = Grade::selectRaw('subject_id, COUNT(*) as count, AVG(score) as average')
            ->with('subject')
            ->groupBy('subject_id')
            ->get();

        return response()->json($stats);
    }
}