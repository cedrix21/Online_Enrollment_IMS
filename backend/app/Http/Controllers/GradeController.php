<?php

namespace App\Http\Controllers;

use App\Models\Grade;
use App\Models\Student;
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

    $gradeLevels = SubjectAssignment::where('teacher_id', $teacher->id)
        ->pluck('gradeLevel')
        ->unique();

    $currentSchoolYear = $this->getCurrentSchoolYear();

    $students = Student::whereIn('gradeLevel', $gradeLevels)
        ->where('status', 'active')
        ->whereHas('enrollments', function ($q) use ($currentSchoolYear) {
            $q->where('school_year', $currentSchoolYear);
        })
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

    $subjectIds = SubjectAssignment::where('teacher_id', $teacher->id)
        ->pluck('subject_id')
        ->unique();

    $gradeLevels = SubjectAssignment::where('teacher_id', $teacher->id)
        ->pluck('gradeLevel')
        ->unique();

    $currentSchoolYear = $this->getCurrentSchoolYear();

    $grades = Grade::with(['student', 'subject'])
        ->whereIn('subject_id', $subjectIds)
        ->whereHas('student', function ($query) use ($gradeLevels, $currentSchoolYear) {
            $query->whereIn('gradeLevel', $gradeLevels)
                  ->whereHas('enrollments', function ($q) use ($currentSchoolYear) {
                      $q->where('school_year', $currentSchoolYear);
                  });
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
        'component' => 'nullable|string|in:music,arts,pe,health',
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

    // Use updateOrCreate to handle both creation and update,
    // including the component field for MAPEH components.
    $grade = Grade::updateOrCreate(
        [
            'student_id' => $request->student_id,
            'subject_id' => $request->subject_id,
            'quarter' => $request->quarter,
            'component' => $request->component, // Important for MAPEH
        ],
        [
            'teacher_id' => $teacher->id,
            'score' => $request->score,
            'remarks' => $request->remarks,
        ]
    );

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

    $hasAssignment = SubjectAssignment::where([
        'teacher_id' => $teacher->id,
        'subject_id' => $subjectId
    ])->exists();

    if (!$hasAssignment) {
        return response()->json(['message' => 'Subject not assigned to you'], 404);
    }

    $teacherGradeLevels = SubjectAssignment::where('teacher_id', $teacher->id)
        ->pluck('gradeLevel');

    $currentSchoolYear = $this->getCurrentSchoolYear();

    $grades = Grade::where('subject_id', $subjectId)
        ->whereHas('student', function ($query) use ($teacherGradeLevels, $currentSchoolYear) {
            $query->whereIn('gradeLevel', $teacherGradeLevels)
                  ->whereHas('enrollments', function ($q) use ($currentSchoolYear) {
                      $q->where('school_year', $currentSchoolYear);
                  });
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
    /**
 * Admin/Registrar - Get all grades with filters
 */
public function getAllGrades(Request $request)
{
    $query = Grade::query();

    if ($request->has('teacher_id')) {
        $query->where('teacher_id', $request->teacher_id);
    }

    if ($request->has('student_id')) {
        $query->where('student_id', $request->student_id);
    }

    if ($request->has('subject_id')) {
        $query->where('subject_id', $request->subject_id);
    }

    if ($request->has('quarter')) {
        $query->where('quarter', $request->quarter);
    }

    if ($request->has('gradeLevel')) {
        $query->whereHas('student', function ($q) {
            $q->where('gradeLevel', request('gradeLevel'))->where('status', 'active');
        });
    }

    // 🆕 Filter by school year (via enrollment relationship)
    if ($request->has('school_year')) {
        $query->whereHas('student.enrollments', function ($q) use ($request) {
            $q->where('school_year', $request->school_year);
        });
    }

    $grades = $query->whereHas('student', function ($q) {
        $q->where('status', 'active');
    })
    ->with(['student', 'subject', 'student.section.advisor', 'teacher'])
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
            'grade' => $grade->load(['student', 'subject','teacher'])
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


    private function getCurrentSchoolYear(): string
{
    $month = (int) date('n');
    $year  = (int) date('Y');
    return ($month >= 6) ? "{$year}-" . ($year + 1) : ($year - 1) . "-{$year}";
}
}