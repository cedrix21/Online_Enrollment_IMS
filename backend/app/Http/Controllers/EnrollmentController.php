<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Enrollment;
use App\Models\Student;
use App\Models\EnrollmentSibling; 
use Illuminate\Support\Facades\DB;

class EnrollmentController extends Controller
{
    public function index()
{
    try {
        // Fetch all enrollments, ordered by newest first, including siblings
        $enrollments = Enrollment::with('siblings')->orderBy('created_at', 'desc')->get();
        
        return response()->json($enrollments, 200);
    } catch (\Exception $e) {
        return response()->json([
            'message' => 'Error fetching enrollments',
            'error' => $e->getMessage()
        ], 500);
    }
}

    public function submit(Request $request)
    {
        // 1. Validation for all SICS Form fields
        $validated = $request->validate([
            'firstName' => 'required|string',
            'lastName' => 'required|string',
            'middleName' => 'nullable|string',
            'nickname' => 'nullable|string',
            'email' => 'required|email|unique:enrollments,email',
            'gradeLevel' => 'required|string',
            'gender' => 'required|string',
            'dateOfBirth' => 'required|date',
            'registrationType' => 'required|string',
            'handedness' => 'nullable|string',
            
            // Parents
            'fatherName' => 'nullable|string',
            'fatherContact' => 'nullable|string',
            'fatherOccupation' => 'nullable|string',
            'fatherEmail' => 'nullable|string',
            'fatherAddress' => 'nullable|string',
            'motherName' => 'nullable|string',
            'motherContact' => 'nullable|string',
            'motherOccupation' => 'nullable|string',
            'motherEmail' => 'nullable|string',
            'motherAddress' => 'nullable|string',
            'emergencyContact' => 'required|string',
            'medicalConditions' => 'nullable|string',

            // Siblings Array from React
            'siblings' => 'nullable|array',
            'siblings.*.name' => 'nullable|string',
            'siblings.*.birthDate' => 'nullable|date',
        ]);

        return DB::transaction(function () use ($request, $validated) {
            // 2. Save Main Enrollment Data
            $enrollment = Enrollment::create(array_merge($validated, ['status' => 'pending']));

            // 3. Save Siblings if they exist
            if ($request->has('siblings')) {
                foreach ($request->siblings as $sib) {
                    if (!empty($sib['name'])) {
                        $enrollment->siblings()->create([
                            'full_name' => $sib['name'],
                            'birth_date' => $sib['birthDate'],
                        ]);
                    }
                }
            }

            return response()->json([
                'message' => 'Enrollment submitted successfully',
                'enrollment' => $enrollment->load('siblings'),
            ], 201);
        });
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate(['status' => 'required|in:approved,rejected']);
        $enrollment = Enrollment::findOrFail($id);

        if ($enrollment->status !== 'pending') {
            return response()->json(['message' => 'Enrollment already processed'], 400);
        }

        return DB::transaction(function () use ($enrollment, $request) {
            $enrollment->status = $request->status;
            $enrollment->save();

            if ($request->status === 'approved') {
                $section = \App\Models\Section::where('gradeLevel', $enrollment->gradeLevel)
                    ->whereColumn('students_count', '<', 'capacity')
                    ->first();

                if (!$section) {
                    throw new \Exception("No vacancy for {$enrollment->gradeLevel}.");
                }

                $year = date('Y');
                $count = Student::where('studentId', 'like', "SICS-$year-%")->count() + 1;
                $formattedId = 'SICS-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

                // Copy ALL detailed fields to the Students table
                Student::create([
                    'studentId'     => $formattedId,
                    'firstName'     => $enrollment->firstName,
                    'lastName'      => $enrollment->lastName,
                    'middleName'    => $enrollment->middleName,
                    'nickname'      => $enrollment->nickname,
                    'email'         => $enrollment->email,
                    'gradeLevel'    => $enrollment->gradeLevel,
                    'gender'        => $enrollment->gender,
                    'dateOfBirth'   => $enrollment->dateOfBirth,
                    'enrollment_id' => $enrollment->id,
                    'section_id'    => $section->id,
                    'status'        => 'active',
                ]);

                $section->increment('students_count');
                
                return response()->json([
                    'message' => "Approved and assigned to {$section->name}",
                    'generatedId' => $formattedId
                ]);
            }

            return response()->json(['message' => 'Enrollment rejected']);
        });
    }

    public function summary()
{
    return response()->json([
        'total' => Enrollment::count(),
        'pending' => Enrollment::where('status', 'pending')->count(),
        'approved' => Enrollment::where('status', 'approved')->count(),
        'rejected' => Enrollment::where('status', 'rejected')->count(),
    ]);
}

// EnrollmentController.php

public function storeAndApprove(Request $request)
{
    // 1. Validate all incoming fields (similar to submit, but adding status check)
    $validated = $request->validate([
        'firstName' => 'required|string',
        'lastName' => 'required|string',
        'email' => 'required|email|unique:students,email',
        'gradeLevel' => 'required|string',
        'gender' => 'required|string',
        'dateOfBirth' => 'required|date',
        'registrationType' => 'required|string',
        'emergencyContact' => 'required|string',
        // Optional fields
        'middleName' => 'nullable|string',
        'nickname' => 'nullable|string',
        'handedness' => 'nullable|string',
        'fatherName' => 'nullable|string',
        'fatherContact' => 'nullable|string',
        'fatherOccupation' => 'nullable|string',
        'fatherEmail' => 'nullable|string',
        'fatherAddress' => 'nullable|string',
        'motherName' => 'nullable|string',
        'motherContact' => 'nullable|string',
        'motherOccupation' => 'nullable|string',
        'motherEmail' => 'nullable|string',
        'motherAddress' => 'nullable|string',
        'medicalConditions' => 'nullable|string',
        'siblings' => 'nullable|array',
    ]);

    return DB::transaction(function () use ($request, $validated) {
        // 2. Create the Enrollment record as "approved"
        $enrollment = Enrollment::create(array_merge($validated, ['status' => 'approved']));

        // 3. Handle Siblings if provided
        if ($request->has('siblings')) {
            foreach ($request->siblings as $sib) {
                if (!empty($sib['name'])) {
                    $enrollment->siblings()->create([
                        'full_name' => $sib['name'],
                        'birth_date' => $sib['birthDate'],
                    ]);
                }
            }
        }

        // 4. Find an available section for the grade level
        $section = \App\Models\Section::where('gradeLevel', $validated['gradeLevel'])
            ->whereColumn('students_count', '<', 'capacity')
            ->first();

        if (!$section) {
            throw new \Exception("No vacancy for {$validated['gradeLevel']}. Please create a section first.");
        }

        // 5. Generate Student ID (SICS-2026-0001 format)
        $year = date('Y');
        $count = Student::where('studentId', 'like', "SICS-$year-%")->count() + 1;
        $formattedId = 'SICS-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

        // 6. Create the Student record
        $student = Student::create([
            'studentId'     => $formattedId,
            'firstName'     => $validated['firstName'],
            'lastName'      => $validated['lastName'],
            'middleName'    => $validated['middleName'] ?? null,
            'email'         => $validated['email'],
            'gradeLevel'    => $validated['gradeLevel'],
            'gender'        => $validated['gender'],
            'dateOfBirth'   => $validated['dateOfBirth'],
            'enrollment_id' => $enrollment->id,
            'section_id'    => $section->id,
            'status'        => 'active',
        ]);

        // 7. Increment section count
        $section->increment('students_count');

        return response()->json([
            'message' => 'Student registered and approved successfully',
            'studentId' => $formattedId,
            'section' => $section->name
        ], 201);
    });
}

}