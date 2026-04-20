<?php

namespace App\Http\Controllers;

use App\Models\Student;
use Illuminate\Http\Request;
use App\Models\StudentRecord;
use App\Models\Enrollment;
use App\Models\Section;

class StudentController extends Controller
{
    public function index(Request $request)
{
    $query = Student::with(['payments', 'section', 'currentEnrollment']);

    // Filter by school year if provided
    if ($request->has('school_year')) {
        $query->whereHas('enrollments', function ($q) use ($request) {
            $q->where('school_year', $request->school_year);
        });
    }

    $students = $query->orderBy('created_at', 'desc')->get();

    return response()->json($students);
}

   public function store(Request $request)
{
    $validated = $request->validate([
        'firstName' => 'required|string',
        'lastName' => 'required|string',
        'gradeLevel' => 'required|string',
        'lrn' => 'nullable|string',
        'contactNumber' => 'required|string',
        'schoolYear' => 'required|string',
    ]);

    // Generate student ID (same logic as enrollment approval)
    $year = date('Y');
    $count = Student::where('studentId', 'like', "SICS-$year-%")->count() + 1;
    $studentId = 'SICS-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

    $student = Student::create([
        'studentId' => $studentId,
        'firstName' => $validated['firstName'],
        'lastName' => $validated['lastName'],
        'gradeLevel' => $validated['gradeLevel'],
        'lrn' => $validated['lrn'],
        'contact_number' => $validated['contactNumber'], // note column name
        'school_year' => $validated['schoolYear'],
        'status' => 'active',
      
    ]);

    return response()->json($student, 201);
}

    // app/Http/Controllers/StudentController.php

public function destroy($id)
{
    try {
        $student = Student::findOrFail($id);

        // Define tuition rates (same as BillingController)
        $rates = [
            'Nursery'        => 31540,
            'Kindergarten 1' => 32090,
            'Kindergarten 2' => 32490,
            'Grade 1'        => 37234,
            'Grade 2'        => 37234,
            'Grade 3'        => 37234,
            'Grade 4'        => 37772,
            'Grade 5'        => 37772,
            'Grade 6'        => 38272,
        ];

        $totalTuition = $rates[$student->gradeLevel] ?? 31540;
        $totalPaid = $student->payments()->sum('amount_paid');
        $balance = $totalTuition - $totalPaid;

        if ($balance > 0) {
            return response()->json([
                'message' => 'Cannot delete student with unpaid balance. Current balance: ₱' . number_format($balance, 2)
            ], 400);
        }

        $student->delete();

        return response()->json(['message' => 'Student deleted successfully']);
    } catch (\Exception $e) {
        return response()->json(['message' => 'Error deleting student: ' . $e->getMessage()], 500);
    }
}

public function getCurrentYearList(Request $request)
{
    $schoolYear = $request->input('school_year');

    // Helper to format enrollment rows
    $mapEnrollment = function ($enrollment) {
        $student = $enrollment->student;
        return [
            'id'            => $enrollment->id,               // use enrollment id for uniqueness
            'firstName'     => $student->firstName ?? '',
            'lastName'      => $student->lastName ?? '',
            'studentId'     => $student->studentId ?? '',
            'gradeLevel'    => $enrollment->gradeLevel,        // from enrollment (historical)
            'schoolYear'    => $enrollment->school_year,
            'lrn'           => $student->lrn ?? null,
            'contactNumber' => $student->contact_number ?? '—',
            'source'        => 'enrolled',
        ];
    };

    if ($schoolYear === 'all') {
        // All approved enrollments across all years
        $enrolled = Enrollment::with('student')
            ->where('status', 'approved')
            ->get()
            ->map($mapEnrollment);

        $manual = StudentRecord::all()->map(function ($record) {
            return [
                'id'            => $record->id,
                'firstName'     => $record->first_name,
                'lastName'      => $record->last_name,
                'studentId'     => $record->student_id,
                'gradeLevel'    => $record->grade_level,
                'schoolYear'    => $record->school_year,
                'lrn'           => $record->lrn,
                'contactNumber' => $record->contact_number,
                'source'        => 'manual',
            ];
        });
    } else {
        if (!$schoolYear) {
            $schoolYear = $this->getSchoolYear();
        }

        // Enrollments for the selected school year
        $enrolled = Enrollment::with('student')
            ->where('school_year', $schoolYear)
            ->where('status', 'approved')
            ->get()
            ->map($mapEnrollment);

        // Manual records for the same year
        $manual = StudentRecord::where('school_year', $schoolYear)
            ->get()
            ->map(function ($record) {
                return [
                    'id'            => $record->id,
                    'firstName'     => $record->first_name,
                    'lastName'      => $record->last_name,
                    'studentId'     => $record->student_id,
                    'gradeLevel'    => $record->grade_level,
                    'schoolYear'    => $record->school_year,
                    'lrn'           => $record->lrn,
                    'contactNumber' => $record->contact_number,
                    'source'        => 'manual',
                ];
            });
    }

    $combined = $enrolled->concat($manual)->sortBy([
        ['gradeLevel', 'asc'],
        ['lastName', 'asc'],
    ])->values();

    return response()->json($combined);
}


public function updateStudentInfo(Request $request, $id)
{
     $student = Student::findOrFail($id);
    $validated = $request->validate([
        'lrn' => 'nullable|string|max:50',
        'contactNumber' => 'nullable|string|max:20',
    ]);
    $student->lrn = $validated['lrn'];
    $student->contact_number = $validated['contactNumber'];
    $student->save();
    return response()->json([
        'message' => 'Student information updated successfully',
        'lrn' => $student->lrn,
        'contactNumber' => $student->contact_number,
    ]);
}
public function searchByEmail(Request $request)
{
    $email = $request->query('email');
    // Email is now directly on Student (from enrollment approval)
    $student = Student::with(['section', 'currentEnrollment'])
        ->where('email', $email)
        ->first();

    if (!$student) {
        return response()->json(['message' => 'Student not found'], 404);
    }
    return response()->json($student);
}

private function getSchoolYear(): string
{
    // return '2026-2027';   // ← uncomment for testing
    $month = (int) date('n');
    $year  = (int) date('Y');
    return ($month >= 6) ? "{$year}-" . ($year + 1) : ($year - 1) . "-{$year}";
}
/**
 * Find a student by their human-readable studentId (e.g., SICS-2025-0001)
 */
public function findByStudentId($studentId)
{
    $student = Student::with('currentEnrollment')
        ->where('studentId', $studentId)
        ->first();

    if (!$student) {
        return response()->json(['message' => 'Student not found'], 404);
    }

    $enrollment = $student->currentEnrollment;

    return response()->json([
        'id'                => $student->id,
        'studentId'         => $student->studentId,
        'firstName'         => $student->firstName,
        'lastName'          => $student->lastName,
        'middleName'        => $student->middleName,
        'nickname'          => $student->nickname,
        'gender'            => $student->gender,
        'dateOfBirth'       => $student->dateOfBirth,
        'gradeLevel'        => $student->gradeLevel,
        'email'             => $student->email,
        'handedness'        => $enrollment->handedness ?? null,
        'fatherName'        => $enrollment->fatherName ?? null,
        'fatherContact'     => $enrollment->fatherContact ?? null,
        'fatherOccupation'  => $enrollment->fatherOccupation ?? null,
        'fatherEmail'       => $enrollment->fatherEmail ?? null,
        'fatherAddress'     => $enrollment->fatherAddress ?? null,
        'motherName'        => $enrollment->motherName ?? null,
        'motherContact'     => $enrollment->motherContact ?? null,
        'motherOccupation'  => $enrollment->motherOccupation ?? null,
        'motherEmail'       => $enrollment->motherEmail ?? null,
        'motherAddress'     => $enrollment->motherAddress ?? null,
        'emergencyContact'  => $enrollment->emergencyContact ?? null,
        'medicalConditions' => $enrollment->medicalConditions ?? null,
        'section'           => $student->section ? $student->section->name : null,
    ]);
}

public function getEnrollments($studentId)
{
    $student = Student::findOrFail($studentId);
    $enrollments = $student->enrollments()->orderBy('school_year')->get(['id', 'school_year', 'gradeLevel']);
    return response()->json($enrollments);
}


// app/Http/Controllers/StudentController.php

public function transferToSection(Request $request, $studentId)
{
    $validated = $request->validate([
        'target_section_id' => 'required|exists:sections,id',
        'school_year'       => 'required|string',
    ]);

    $student = Student::findOrFail($studentId);

    // Optional: check that the target section has the same grade level
    $targetSection = Section::findOrFail($validated['target_section_id']);
    if ($targetSection->gradeLevel !== $student->gradeLevel) {
        return response()->json([
            'message' => 'Cannot transfer student to a section with a different grade level.'
        ], 422);
    }

    // Check capacity
    $currentCount = $targetSection->students()
        ->where('school_year', $validated['school_year'])
        ->count();
    if ($currentCount >= $targetSection->capacity) {
        return response()->json([
            'message' => 'Target section is already full.'
        ], 422);
    }

    // Update student's section
    $student->section_id = $validated['target_section_id'];
    $student->save();

    
   
    return response()->json([
        'message' => 'Student transferred successfully.',
        'student' => $student->load('section'),
    ]);
}


}