<?php

namespace App\Http\Controllers;

use App\Models\ObservedValue;
use App\Models\Student;
use Illuminate\Http\Request;
use App\Traits\SchoolYearTrait;

class TeacherObservedValueController extends Controller
{
    use SchoolYearTrait;

    public function show($studentId)
    {
        $schoolYear = $this->getCurrentSchoolYear();
        $student = Student::findOrFail($studentId);
        $gradeRoman = match ($student->gradeLevel) {
            'Grade 1' => 'I', 'Grade 2' => 'II', 'Grade 3' => 'III',
            'Grade 4' => 'IV', 'Grade 5' => 'V', 'Grade 6' => 'VI',
            default => 'I'
        };

        $values = ObservedValue::where([
            'student_id' => $studentId,
            'school_year' => $schoolYear,
            'grade' => $gradeRoman,
        ])->get()->keyBy('core_value_key');

        return response()->json($values);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'values'     => 'required|array',
            'values.*.core_value_key' => 'required|string',
            'values.*.q1' => 'nullable|string',
            'values.*.q2' => 'nullable|string',
            'values.*.q3' => 'nullable|string',
            'values.*.q4' => 'nullable|string',
        ]);

        $schoolYear = $this->getCurrentSchoolYear();
        $student = Student::findOrFail($validated['student_id']);
        $gradeRoman = match ($student->gradeLevel) {
            'Grade 1' => 'I', 'Grade 2' => 'II', 'Grade 3' => 'III',
            'Grade 4' => 'IV', 'Grade 5' => 'V', 'Grade 6' => 'VI',
            default => 'I'
        };

        foreach ($validated['values'] as $item) {
            ObservedValue::updateOrCreate(
                [
                    'student_id'  => $student->id,
                    'school_year' => $schoolYear,
                    'grade'       => $gradeRoman,
                    'core_value_key' => $item['core_value_key'],
                ],
                collect($item)->except('core_value_key')->toArray()
            );
        }

        return response()->json(['message' => 'Observed values saved']);
    }
}