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
                 'students.section_id', 
                'sections.name as section'
            )
            ->get();

        return response()->json($children);
    }

    public function schedule(Request $request, $studentId)
{
    $user = $request->user();
    if ($user->role !== 'parent') {
        return response()->json(['message' => 'Unauthorized'], 403);
    }

    // Verify the student belongs to this parent
    $link = DB::table('parent_student')
        ->where('user_id', $user->id)
        ->where('student_id', $studentId)
        ->first();

    if (!$link) {
        return response()->json(['message' => 'Not found'], 404);
    }

    $student = \App\Models\Student::with('section.schedules.subject', 'section.schedules.room', 'section.schedules.teacher', 'section.schedules.time_slot')
        ->findOrFail($studentId);

    $section = $student->section;
    if (!$section) {
        return response()->json([]);
    }

    // Group schedules (same as LoadSlip but simplified)
    $grouped = [];
    foreach ($section->schedules as $sched) {
        $key = $sched->subject_id . '-' . $sched->time_slot_id . '-' . $sched->room_id;
        if (!isset($grouped[$key])) {
            $grouped[$key] = [
                'subject'    => $sched->subject->subjectName ?? 'N/A',
                'time'       => $sched->time_slot->display_label ?? 'TBA',
                'room'       => $sched->room->room_name ?? 'TBA',
                'teacher'    => $sched->teacher ? $sched->teacher->firstName . ' ' . $sched->teacher->lastName : 'TBA',
                'days'       => [$sched->day],
            ];
        } else {
            $grouped[$key]['days'][] = $sched->day;
        }
    }

    // Sort days
    $daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    foreach ($grouped as &$g) {
        usort($g['days'], fn($a, $b) => array_search($a, $daysOrder) - array_search($b, $daysOrder));
    }

    return response()->json(array_values($grouped));
}
}