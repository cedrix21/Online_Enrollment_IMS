<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request; 
use Illuminate\Support\Facades\DB;
class ParentController extends Controller
{
    public function children(Request $request)
    {
        $user = $request->user();

        // Ensure the user is a parent
        if ($user->role !== 'parent') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Get linked students via parent_student pivot
        $children = DB::table('parent_student')
            ->join('students', 'parent_student.student_id', '=', 'students.id')
            ->leftJoin('sections', 'students.section_id', '=', 'sections.id')
            ->where('parent_student.user_id', $user->id)
            ->select(
                'students.id',
                'students.studentId as student_id',
                'students.firstName as first_name',
                'students.lastName as last_name',
                'students.middleName as middle_name',
                'students.gradeLevel as grade_level',
                'students.gender',
                'students.dateOfBirth as date_of_birth',
                'students.lrn',
                'students.school_year',
                'sections.name as section'
            )
            ->get();

        return response()->json($children);
    }
}