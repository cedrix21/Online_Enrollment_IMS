<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Enrollment;
use App\Models\Student;
use App\Models\Section;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use App\Mail\EnrollmentApproved;
use Barryvdh\DomPDF\Facade\Pdf;

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
                $section = Section::where('gradeLevel', $enrollment->gradeLevel)
                    ->whereColumn('students_count', '<', 'capacity')
                    ->first();

                if (!$section) {
                    throw new \Exception("No vacancy for {$enrollment->gradeLevel}.");
                }

                $year = date('Y');
                $count = Student::where('studentId', 'like', "SICS-$year-%")->count() + 1;
                $formattedId = 'SICS-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

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

                // --- EMAIL LOGIC ---
                $emailStatus = $this->sendEnrollmentEmail($enrollment, $section, $formattedId);
                
                return response()->json([
                    'message' => "Approved, assigned to {$section->name} {$emailStatus}",
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
    $validated = $request->validate([
        'firstName' => 'required|string',
        'lastName' => 'required|string',
        'email' => 'required|email|unique:students,email',
        'gradeLevel' => 'required|string',
        'gender' => 'required|string',
        'dateOfBirth' => 'required|date',
        'registrationType' => 'required|string',
        'emergencyContact' => 'required|string',
        'psaReceived' => 'nullable|boolean',
        'idPictureReceived' => 'nullable|boolean',
        'goodMoralReceived' => 'nullable|boolean',
        'reportCardReceived' => 'nullable|boolean',
        'kidsNoteInstalled' => 'nullable|boolean',
        'middleName' => 'nullable|string',
        'siblings' => 'nullable|array',
    ]);

    // We use a variable to track email success outside the transaction
    $emailMessage = "";

    try {
        $result = DB::transaction(function () use ($request, $validated) {
            // Create Enrollment
            $enrollment = Enrollment::create(array_merge($validated, [
                'status' => 'approved',
                'psa_received' => $request->psaReceived ?? false,
                'id_picture_received' => $request->idPictureReceived ?? false,
                'good_moral_received' => $request->goodMoralReceived ?? false,
                'report_card_received' => $request->reportCardReceived ?? false,
                'kids_note_installed' => $request->kidsNoteInstalled ?? false,
            ]));

            // Find Section
            $section = Section::where('gradeLevel', $validated['gradeLevel'])
                ->whereColumn('students_count', '<', 'capacity')
                ->first();

            if (!$section) {
                throw new \Exception("No vacancy for {$validated['gradeLevel']}.");
            }

            // Generate Student ID
            $year = date('Y');
            $count = Student::where('studentId', 'like', "SICS-$year-%")->count() + 1;
            $formattedId = 'SICS-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

            // Create Student
            $student = Student::create([
                'studentId'     => $formattedId,
                'firstName'     => $validated['firstName'],
                'lastName'      => $validated['lastName'],
                'email'         => $validated['email'],
                'gradeLevel'    => $validated['gradeLevel'],
                'section_id'    => $section->id,
                'enrollment_id' => $enrollment->id,
                'status'        => 'active',
            ]);

            $section->increment('students_count');

            return ['enrollment' => $enrollment, 'section' => $section, 'id' => $formattedId];
        });

        // TRIGGER EMAIL AFTER TRANSACTION IS FINISHED
        // This ensures the student exists in the DB before the PDF is generated
        $emailMessage = $this->sendEnrollmentEmail($result['enrollment'], $result['section'], $result['id']);

        return response()->json([
            'message' => 'Student approved ' . $emailMessage,
            'studentId' => $result['id']
        ], 201);

    } catch (\Exception $e) {
        return response()->json(['message' => $e->getMessage()], 500);
    }
}

private function sendEnrollmentEmail($enrollment, $section, $formattedId)
{
    try {
        // 1. Safety Check: Verify logo exists to prevent crash
        $logoPath = realpath('assets/sics-logo.png');
        $logoBase64 = ''; 

        if (file_exists($logoPath)) {
            $logoData = base64_encode(file_get_contents($logoPath));
            $logoBase64 = 'data:image/png;base64,' . $logoData;
        }

        // 2. Load relationships for the schedule table
        $section->load(['schedules.subject', 'schedules.timeSlot', 'schedules.room', 'advisor']);

        // 3. Generate PDF - Wrap in try-catch specifically for DomPDF
        try {
            $pdf = Pdf::loadView('pdf.loadslip', [
                'enrollment' => $enrollment,
                'section'    => $section,
                'studentId'  => $formattedId,
                'logo'       => $logoBase64
            ])->setPaper('a4', 'portrait'); // Force paper size to reduce memory usage
            
            $pdfOutput = $pdf->output();
        } catch (\Exception $pdfError) {
            Log::error("PDF Generation failed: " . $pdfError->getMessage());
            return "but PDF generation failed.";
        }

        // 4. Send the Mail
       // Send to the student/parent and CC the registrar
            Mail::to($enrollment->email)
            ->cc('ravelocedrix@gmail.com') 
            ->send(new EnrollmentApproved($enrollment, $pdfOutput));

        return "and Loadslip sent to parent email.";

    } catch (\Exception $e) {
        // Log the exact error for debugging (Check storage/logs/laravel.log)
        Log::error("Email failed for Student {$formattedId}: " . $e->getMessage());
        return "but email failed to send (Check SMTP settings).";
    }
}
}