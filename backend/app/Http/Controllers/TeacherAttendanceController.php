<?php
namespace App\Http\Controllers;

use App\Models\Student;
use Illuminate\Http\Request;
use App\Traits\SchoolYearTrait;
use App\Models\AttendanceMonth;

class TeacherAttendanceController extends Controller
{
    use SchoolYearTrait;

        public function show($studentId)
        {
            $schoolYear = $this->getCurrentSchoolYear();
            $student = Student::findOrFail($studentId);
            $gradeRoman = $this->gradeToRoman($student->gradeLevel);

            $months = AttendanceMonth::where([
                'student_id' => $studentId,
                'school_year' => $schoolYear,
                'grade' => $gradeRoman,
            ])->orderBy('month')->get();

            return response()->json($months);
        }

        public function store(Request $request)
        {
            $validated = $request->validate([
                'student_id' => 'required|exists:students,id',
                'months'     => 'required|array',
                'months.*.month'        => 'required|string',
                'months.*.school_days'  => 'nullable|integer',
                'months.*.present'      => 'nullable|integer',
                'months.*.absent'       => 'nullable|integer',
            ]);

            $schoolYear = $this->getCurrentSchoolYear();
            $student = Student::findOrFail($validated['student_id']);
            $gradeRoman = $this->gradeToRoman($student->gradeLevel);

            foreach ($validated['months'] as $monthData) {
                AttendanceMonth::updateOrCreate(
                    [
                        'student_id'  => $student->id,
                        'school_year' => $schoolYear,
                        'grade'       => $gradeRoman,
                        'month'       => $monthData['month'],
                    ],
                    collect($monthData)->except('month')->toArray()
                );
            }

            return response()->json(['message' => 'Monthly attendance saved']);
        }

        private function gradeToRoman($gradeLevel)
        {
            return match ($gradeLevel) {
                'Grade 1' => 'I', 'Grade 2' => 'II', 'Grade 3' => 'III',
                'Grade 4' => 'IV', 'Grade 5' => 'V', 'Grade 6' => 'VI',
                default => 'I'
            };
        }
}
