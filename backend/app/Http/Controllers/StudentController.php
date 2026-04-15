<?php

namespace App\Http\Controllers;

use App\Models\Student;
use Illuminate\Http\Request;
use App\Models\StudentRecord;

class StudentController extends Controller
{
    public function index()
    {
        // ✅ FIXED: Eagerly load payments, section, and enrollment relationships
        $students = Student::with([
            'payments',
            'section', 
            'enrollment'
            
            ])

            ->orderBy('created_at', 'desc')
            ->get();
        
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

    // If "all" is requested, fetch all records regardless of school year
    if ($schoolYear === 'all') {
        $enrolled = Student::where('status', 'active')
            ->get()
            ->map(function($student) {
                return [
                    'id' => $student->id,
                    'firstName' => $student->firstName,
                    'lastName' => $student->lastName,
                    'studentId' => $student->studentId,
                    'gradeLevel' => $student->gradeLevel,
                    'schoolYear' => $student->school_year,
                    'lrn' => $student->lrn ?? null,
                    'contactNumber' => $student->fatherContact ?? $student->motherContact ?? $student->emergencyContact ?? $student->contact_number ??'—',
                    'source' => 'enrolled',
                ];
            });

        $manual = StudentRecord::all()
            ->map(function($record) {
                return [
                    'id' => $record->id,
                    'firstName' => $record->first_name,
                    'lastName' => $record->last_name,
                    'studentId' => $record->student_id,
                    'gradeLevel' => $record->grade_level,
                    'schoolYear' => $record->school_year,
                    'lrn' => $record->lrn,
                    'contactNumber' => $record->contact_number,
                    'source' => 'manual',
                ];
            });
    } else {
        // Otherwise, filter by the specified year (or default to current)
        if (!$schoolYear) {
            $month = (int) date('n');
            $year = (int) date('Y');
            $schoolYear = ($month >= 6) ? "{$year}-" . ($year + 1) : ($year - 1) . "-{$year}";
        }

        $enrolled = Student::where('school_year', $schoolYear)
            ->where('status', 'active')
            ->get()
            ->map(function($student) {
                return [
                    'id' => $student->id,
                    'firstName' => $student->firstName,
                    'lastName' => $student->lastName,
                    'studentId' => $student->studentId,
                    'gradeLevel' => $student->gradeLevel,
                    'schoolYear' => $student->school_year,
                    'lrn' => $student->lrn ?? null,
                    'contactNumber' => $student->contact_number ?? '—',
                    'source' => 'enrolled',
                    
                ];
            });

        $manual = StudentRecord::where('school_year', $schoolYear)
            ->get()
            ->map(function($record) {
                return [
                    'id' => $record->id,
                    'firstName' => $record->first_name,
                    'lastName' => $record->last_name,
                    'studentId' => $record->student_id,
                    'gradeLevel' => $record->grade_level,
                    'schoolYear' => $record->school_year,
                    'lrn' => $record->lrn,
                    'contactNumber' => $record->contact_number,
                    'source' => 'manual',
                ];
            });
    }

    // Merge and sort by grade level then last name
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

    $student = Student::with('section', 'enrollment')
        ->whereHas('enrollment', function($q) use ($email) {
            $q->where('email', $email);
        })
        ->first();

    if (!$student) {
        return response()->json(['message' => 'Student not found'], 404);
    }

    return response()->json($student);
}

/**
 * Find a student by their human-readable studentId (e.g., SICS-2025-0001)
 */
public function findByStudentId($studentId)
{
    $student = Student::where('studentId', $studentId)->first();
    
    if (!$student) {
        return response()->json(['message' => 'Student not found'], 404);
    }
    
    // Return only necessary public info (do NOT expose sensitive data)
    return response()->json([
        'id' => $student->id,
        'studentId' => $student->studentId,
        'firstName' => $student->firstName,
        'lastName' => $student->lastName,
        'gradeLevel' => $student->gradeLevel,
        'section' => $student->section ? $student->section->name : null,
    ]);
}
}