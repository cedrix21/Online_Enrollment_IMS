<?php

namespace App\Http\Controllers;

use App\Models\Grade;
use App\Models\Student;
use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GradeController extends Controller
{
    // Get teacher information and advisory section
    public function getTeacherInfo(Request $request)
    {
        $teacher = Auth::user()->teacher;
        
        if (!$teacher) {
            return response()->json(['message' => 'Teacher record not found'], 404);
        }

        // Get the section for this teacher's advisory grade
        $section = \App\Models\Section::where('gradeLevel', $teacher->advisory_grade)->first();

        return response()->json([
            'firstName' => $teacher->firstName,
            'lastName' => $teacher->lastName,
            'advisory_grade' => $teacher->advisory_grade,
            'section' => $section ? $section->name : 'Not Assigned',
            'specialization' => $teacher->specialization,
        ]);
    }

    // Get all students assigned to the logged-in teacher
    public function getTeacherStudents(Request $request)
    {
        $teacher = Auth::user()->teacher; // Assuming User model has relationship to Teacher
        
        if (!$teacher) {
            return response()->json(['message' => 'Teacher record not found'], 404);
        }

        // Get all students in the teacher's advisory grade level (only active approved students)
        $students = Student::where('gradeLevel', $teacher->advisory_grade)
            ->where('status', 'active')
            ->with(['section'])
            ->orderBy('firstName', 'asc')
            ->get();

        return response()->json($students);
    }

    // Get subjects assigned to the logged-in teacher
    public function getTeacherSubjects(Request $request)
    {
        $teacher = Auth::user()->teacher;
        
        if (!$teacher) {
            return response()->json(['message' => 'Teacher record not found'], 404);
        }

        $subjects = Subject::where('teacher_id', $teacher->id)->get();

        return response()->json($subjects);
    }

    // Get grades for a specific teacher's students
    public function getGrades(Request $request)
    {
        $teacher = Auth::user()->teacher;
        
        if (!$teacher) {
            return response()->json(['message' => 'Teacher record not found'], 404);
        }

        $grades = Grade::where('teacher_id', $teacher->id)
            ->with(['student', 'subject'])
            ->get();

        return response()->json($grades);
    }

    // Store or update a grade
    public function submitGrade(Request $request)
    {
        $request->validate([
            'student_id' => 'required|exists:students,id',
            'subject_id' => 'required|exists:subjects,id',
            'score' => 'required|numeric|min:0|max:100',
            'remarks' => 'nullable|string',
            'quarter' => 'nullable|string|in:Q1,Q2,Q3,Q4',
        ]);

        $teacher = Auth::user()->teacher;
        
        if (!$teacher) {
            return response()->json(['message' => 'Teacher record not found'], 404);
        }

        // Check if grade already exists
        $grade = Grade::where('teacher_id', $teacher->id)
            ->where('student_id', $request->student_id)
            ->where('subject_id', $request->subject_id)
            ->where('quarter', $request->quarter ?? 'Q1')
            ->first();

        if ($grade) {
            // Update existing grade
            $grade->update([
                'score' => $request->score,
                'remarks' => $request->remarks,
            ]);
        } else {
            // Create new grade
            $grade = Grade::create([
                'teacher_id' => $teacher->id,
                'student_id' => $request->student_id,
                'subject_id' => $request->subject_id,
                'score' => $request->score,
                'remarks' => $request->remarks,
                'quarter' => $request->quarter ?? 'Q1',
            ]);
        }

        return response()->json([
            'message' => 'Grade saved successfully',
            'grade' => $grade->load(['student', 'subject'])
        ]);
    }

    // Get grades for all students in a specific subject
    public function getSubjectGrades(Request $request, $subjectId)
    {
        $teacher = Auth::user()->teacher;
        
        if (!$teacher) {
            return response()->json(['message' => 'Teacher record not found'], 404);
        }

        // Verify the subject belongs to this teacher
        $subject = Subject::where('id', $subjectId)
            ->where('teacher_id', $teacher->id)
            ->first();

        if (!$subject) {
            return response()->json(['message' => 'Subject not found or not assigned to you'], 404);
        }

        $grades = Grade::where('teacher_id', $teacher->id)
            ->where('subject_id', $subjectId)
            ->with(['student', 'subject'])
            ->get();

        return response()->json($grades);
    }

    // Admin/Registrar - Get all grades with filters
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
        })->with(['student', 'subject', 'student.section', 'subject.teacher'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($grades);
    }

    // Admin/Registrar - Update a grade
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
            'grade' => $grade->load(['student', 'subject', 'subject.teacher'])
        ]);
    }

    // Admin/Registrar - Get statistics
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
            ->with('subject.teacher')
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
