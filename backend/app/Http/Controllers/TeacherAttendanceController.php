<?php
namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Student;
use Illuminate\Http\Request;
use App\Traits\SchoolYearTrait;

class TeacherAttendanceController extends Controller
{
    use SchoolYearTrait;

    public function show($studentId)
    {
        $schoolYear = $this->getCurrentSchoolYear();
        $student = Student::findOrFail($studentId);
        $grade = $student->gradeLevel;  // e.g. "Grade 1"

        // Convert "Grade 1" to Roman "I"
        $gradeRoman = match ($grade) {
            'Grade 1' => 'I', 'Grade 2' => 'II', 'Grade 3' => 'III',
            'Grade 4' => 'IV', 'Grade 5' => 'V', 'Grade 6' => 'VI',
            default => 'I'
        };

        $attendance = Attendance::firstOrNew([
            'student_id' => $studentId,
            'school_year' => $schoolYear,
            'grade' => $gradeRoman,
        ]);

        return response()->json($attendance);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'student_id'   => 'required|exists:students,id',
            'school_days'  => 'nullable|integer',
            'absent'       => 'nullable|integer',
            'cause1'       => 'nullable|string',
            'tardy'        => 'nullable|integer',
            'cause2'       => 'nullable|string',
            'present'      => 'nullable|integer',
        ]);

        $schoolYear = $this->getCurrentSchoolYear();
        $student = Student::findOrFail($validated['student_id']);
        $gradeRoman = match ($student->gradeLevel) {
            'Grade 1' => 'I', 'Grade 2' => 'II', 'Grade 3' => 'III',
            'Grade 4' => 'IV', 'Grade 5' => 'V', 'Grade 6' => 'VI',
            default => 'I'
        };

        $attendance = Attendance::updateOrCreate(
            [
                'student_id'  => $validated['student_id'],
                'school_year' => $schoolYear,
                'grade'       => $gradeRoman,
            ],
            collect($validated)->except('student_id')->toArray()
        );

        return response()->json(['message' => 'Attendance saved', 'data' => $attendance]);
    }
}
