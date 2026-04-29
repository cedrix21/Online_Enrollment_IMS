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
use GuzzleHttp\Client;
use App\Models\EnrollmentRequirement;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Auth;
use App\Traits\SchoolYearTrait;

class EnrollmentController extends Controller
{
    use SchoolYearTrait;

    // NEW METHOD: Upload to Supabase
   private function uploadToSupabase($file, $bucket = 'receipts')
{
    try {
        $client = new Client([
            'verify' => env('APP_ENV') === 'production'
        ]);

        $supabaseUrl = env('SUPABASE_URL');
        $supabaseKey = env('SUPABASE_KEY');

        Log::info("Starting Supabase upload to bucket: {$bucket}", [
            'file_name' => $file->getClientOriginalName(),
            'file_size' => $file->getSize()
        ]);

        // Generate unique filename
        $fileName = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
        $uploadUrl = "{$supabaseUrl}/storage/v1/object/{$bucket}/{$fileName}";

        Log::info("Upload URL: {$uploadUrl}");

        $response = $client->post($uploadUrl, [
            'headers' => [
                'Authorization' => "Bearer {$supabaseKey}",
                'Content-Type'  => $file->getMimeType(),
            ],
            'body' => file_get_contents($file->getRealPath())
        ]);

        $statusCode   = $response->getStatusCode();
        $responseBody = $response->getBody()->getContents();

        Log::info("Supabase response", [
            'status' => $statusCode,
            'body'   => $responseBody
        ]);

        if ($statusCode !== 200 && $statusCode !== 201) {
            throw new \Exception("Upload failed with status code: {$statusCode}. Response: {$responseBody}");
        }

        // Return public URL
        $publicUrl = "{$supabaseUrl}/storage/v1/object/public/{$bucket}/{$fileName}";
        Log::info("Generated public URL: {$publicUrl}");

        return $publicUrl;
    } catch (\Exception $e) {
        Log::error("Supabase upload failed: " . $e->getMessage(), [
            'trace' => $e->getTraceAsString()
        ]);
        throw new \Exception("File upload failed: " . $e->getMessage());
    }
}




    public function index(Request $request)
{
    try {
        $query = Enrollment::with([
            'siblings', 
            'payments',
            'student', 
            'student.section'
        ]);

        // 🆕 Filter by school year if provided
        if ($request->has('school_year') && $request->school_year !== 'all') {
            $query->where('school_year', $request->school_year);
        }

        $enrollments = $query->orderBy('created_at', 'desc')->get();

        // TRANSFORM the data to include full URLs for receipts
        $enrollments->transform(function ($enrollment) {
            $enrollment->payments->transform(function ($payment) {
                if ($payment->receipt_path) {
                    if (!filter_var($payment->receipt_path, FILTER_VALIDATE_URL)) {
                        $cleanPath = ltrim(str_replace('public/', '', $payment->receipt_path), '/');
                        $payment->receipt_path = asset('storage/' . $cleanPath);
                    }
                }
                return $payment;
            });
            return $enrollment;
        });

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
    $rules = [
        'firstName' => 'required|string',
        'lastName' => 'required|string',
        'middleName' => 'nullable|string',
        'nickname' => 'nullable|string',
        'email' => 'required|email',
        'gradeLevel' => 'required|string',
        'gender' => 'required|string',
        'dateOfBirth' => 'required|date',
        'registrationType' => 'required|in:New Student,Transferee,Continuing',
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
        'emergencyContact' => 'required|string',
        'medicalConditions' => 'nullable|string',

        'siblings' => 'nullable|array',
        'siblings.*.name' => 'nullable|string',
        'siblings.*.birthDate' => 'nullable|date',

        'paymentMethod' => 'required|in:Cash,GCash,Bank Transfer',
        'reference_number' => 'nullable|string',
        'amount_paid' => 'nullable|numeric',
        'receipt_image' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
        'payment_status' => 'nullable|string',
    ];

    // Add conditional validation for continuing students
    if ($request->registrationType === 'Continuing') {
        $rules['studentId'] = 'required|string|exists:students,studentId';
    }

    $validated = $request->validate($rules);

    try {
    return DB::transaction(function () use ($request, $validated) {
        // Handle receipt upload (existing logic)

        // $receiptPath = null;
        // if ($request->hasFile('receipt_image')) {
        //     $file = $request->file('receipt_image');
        //     $fileName = time() . '_' . $file->getClientOriginalName();
        //     $path = $file->storeAs('receipts', $fileName, 'public');
        //     $receiptPath = $path;
        // }

        // Upload to Supabase instead of local storage
        $receiptPath = null;
        if ($request->hasFile('receipt_image')) {
            $receiptPath = $this->uploadToSupabase($request->file('receipt_image'), 'receipts');
        }

        // Determine student_id for continuing students
        $studentId = null;
        if ($validated['registrationType'] === 'Continuing') {
            $student = $this->findStudentByStudentId($validated['studentId']);
            if (!$student) {
                throw new \Exception('Student not found with the provided ID.');
            }
            $studentId = $student->id;
            // Optionally update student's current grade level and school year
            $student->update([
                'gradeLevel' => $validated['gradeLevel'],
                'school_year' => $this->getCurrentSchoolYear(),
            ]);
        }

        // Determine school year (if column exists)
        $schoolYear = $this->getCurrentSchoolYear();

        // Create enrollment
        $enrollmentData = [
            'firstName'         => $validated['firstName'],
            'lastName'          => $validated['lastName'],
            'middleName'        => $validated['middleName'] ?? null,
            'nickname'          => $validated['nickname'] ?? null,
            'email'             => $validated['email'],
            'gradeLevel'        => $validated['gradeLevel'],
            'gender'            => $validated['gender'],
            'dateOfBirth'       => $validated['dateOfBirth'],
            'registrationType'  => $validated['registrationType'],
            'handedness'        => $validated['handedness'] ?? null,

            'fatherName'        => $validated['fatherName'] ?? null,
            'fatherContact'     => $validated['fatherContact'] ?? null,
            'fatherOccupation'  => $validated['fatherOccupation'] ?? null,
            'fatherEmail'       => $validated['fatherEmail'] ?? null,
            'fatherAddress'     => $validated['fatherAddress'] ?? null,
            'motherName'        => $validated['motherName'] ?? null,
            'motherContact'     => $validated['motherContact'] ?? null,
            'motherOccupation'  => $validated['motherOccupation'] ?? null,
            'motherEmail'       => $validated['motherEmail'] ?? null,
            'motherAddress'     => $validated['motherAddress'] ?? null,

            'emergencyContact'  => $validated['emergencyContact'],
            'medicalConditions' => $validated['medicalConditions'] ?? null,
            'status'            => 'pending',
        ];

        // Add student_id and school_year if columns exist (after migration)
        if (Schema::hasColumn('enrollments', 'student_id')) {
            $enrollmentData['student_id'] = $studentId;
        }
        if (Schema::hasColumn('enrollments', 'school_year')) {
            $enrollmentData['school_year'] = $schoolYear;
        }

        $enrollment = Enrollment::create($enrollmentData);

        // Handle requirements (unchanged)
        $requirementTypes = ['psa', 'good_moral', 'report_card', 'picture_2x2', 'picture_1x1'];
        foreach ($requirementTypes as $type) {
            $key = "requirement_{$type}";
            if ($request->hasFile($key)) {
                $file = $request->file($key);
                //$path = $file->store("requirements/{$enrollment->id}", 'public');
                // Instead of local storage, upload to Supabase
                $publicUrl = $this->uploadToSupabase($file, 'requirements');
                EnrollmentRequirement::create([
                    'enrollment_id' => $enrollment->id,
                    'type'          => $type,
                    'type_label'    => $this->getRequirementLabel($type),
                    'file_path'     => $publicUrl,
                    'original_name' => $file->getClientOriginalName(),
                    'status'        => 'pending',
                ]);
            }
        }

        // Create payment
        $paymentData = [
            'amount_paid'      => $validated['amount_paid'] ?? 0,
            'paymentMethod'    => $validated['paymentMethod'],
            'reference_number' => $validated['reference_number'] ?? 'WALK-IN',
            'payment_type'     => 'Downpayment',
            'payment_date'     => now(),
            'receipt_path'     => $receiptPath,
            'payment_status'   => 'pending',
        ];
        // If student_id exists and we have one, add it
        if (Schema::hasColumn('payments', 'student_id') && $studentId) {
            $paymentData['student_id'] = $studentId;
        }
        $enrollment->payments()->create($paymentData);

        // Handle siblings (unchanged)
        if (!empty($validated['siblings'])) {
            foreach ($validated['siblings'] as $sib) {
                if (!empty($sib['name'])) {
                    $enrollment->siblings()->create([
                        'full_name'  => $sib['name'],
                        'birth_date' => $sib['birthDate'],
                    ]);
                }
            }
        }

        return response()->json([
            'message'  => 'Enrollment submitted successfully!',
            'enrollment' => $enrollment->load('siblings'),
                ], 201);
            });
         } catch (\Exception $e) {
        // Log the failure with full context
        activity()
            ->withProperties([
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'input' => $request->except(['receipt_image', 'requirement_psa', 'requirement_good_moral', 'requirement_report_card', 'requirement_picture_2x2', 'requirement_picture_1x1']),
                'trace' => $e->getTraceAsString(),
            ])
            ->log('enrollment_submission_failed');

        Log::error('Submit Error: ' . $e->getMessage(), [
            'trace' => $e->getTraceAsString(),
        ]);
        
        return response()->json([
            'message' => 'Submission failed: ' . $e->getMessage(),
        ], 500);
    }
}


  public function updateStatus(Request $request, $id)
{
    $request->validate([
        'status'     => 'required|in:approved,rejected',
        'section_id' => 'nullable|exists:sections,id',
    ]);

    $enrollment = Enrollment::findOrFail($id);

    if ($enrollment->status !== 'pending') {
        return response()->json(['message' => 'Enrollment already processed'], 400);
    }

    return DB::transaction(function () use ($enrollment, $request) {
        $enrollment->status = $request->status;
        $enrollment->save();

        // --- REJECTION FLOW ---
        if ($request->status === 'rejected') {
            activity()
                ->performedOn($enrollment)
                ->causedBy(Auth::user())
                ->withProperties([
                    'student_name' => $enrollment->firstName . ' ' . $enrollment->lastName,
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent()
                ])
                ->log('Enrollment rejected');
            return response()->json(['message' => 'Enrollment rejected']);
        }

        // --- APPROVAL FLOW (only remaining option) ---
        $schoolYear = $enrollment->school_year;
        $section = null;

        if ($request->filled('section_id')) {
            $section = Section::where('id', $request->section_id)
                ->where('gradeLevel', $enrollment->gradeLevel)
                ->where('school_year', $schoolYear)
                ->whereColumn('students_count', '<', 'capacity')
                ->first();
            if (!$section) throw new \Exception("Selected section is full or invalid.");
        } else {
            $section = Section::where('gradeLevel', $enrollment->gradeLevel)
                ->where('school_year', $schoolYear)
                ->whereColumn('students_count', '<', 'capacity')
                ->first();
            if (!$section) throw new \Exception("No vacancy for {$enrollment->gradeLevel}.");
        }

        // Check if enrollment already linked to a student (continuing)
        $studentId = Schema::hasColumn('enrollments', 'student_id') ? $enrollment->student_id : null;

        if ($studentId) {
            $student = Student::findOrFail($studentId);
            $student->update([
                'section_id'  => $section->id,
                'gradeLevel'  => $enrollment->gradeLevel,
                'school_year' => Schema::hasColumn('enrollments', 'school_year') ? $enrollment->school_year : $this->getCurrentSchoolYear(),
                'status'      => 'active',
            ]);
            $formattedId = $student->studentId;
        } else {
            $year = date('Y');
            $count = Student::where('studentId', 'like', "SICS-$year-%")->count() + 1;
            $formattedId = 'SICS-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
            $studentData = [
                'studentId'   => $formattedId,
                'firstName'   => $enrollment->firstName,
                'lastName'    => $enrollment->lastName,
                'middleName'  => $enrollment->middleName,
                'nickname'    => $enrollment->nickname,
                'email'       => $enrollment->email,
                'gradeLevel'  => $enrollment->gradeLevel,
                'gender'      => $enrollment->gender,
                'dateOfBirth' => $enrollment->dateOfBirth,
                'section_id'  => $section->id,
                'school_year' => Schema::hasColumn('enrollments', 'school_year') ? $enrollment->school_year : $this->getCurrentSchoolYear(),
                'status'      => 'active',
            ];
            if (Schema::hasColumn('students', 'enrollment_id')) $studentData['enrollment_id'] = $enrollment->id;
            $student = Student::create($studentData);
            if (Schema::hasColumn('enrollments', 'student_id')) {
                $enrollment->student_id = $student->id;
                $enrollment->save();
            }
        }

        $enrollment->payments()->update([
            'student_id'      => $student->id,
            'payment_status'  => 'completed',
        ]);
        $section->increment('students_count');

        // ✅ Only now log the approval with safe student name
        activity()
            ->performedOn($enrollment)
            ->causedBy(Auth::user())
            ->withProperties([
                'student_name' => $enrollment->firstName . ' ' . $enrollment->lastName,
                'assigned_section' => $section->name,
                'student_id' => $student->studentId,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent()
            ])
            ->log('Enrollment approved');

        $emailStatus = $this->sendEnrollmentEmail($enrollment, $section, $student->studentId ?? $formattedId);
        return response()->json([
            'message'     => "Approved, assigned to {$section->name}. {$emailStatus}",
            'generatedId' => $student->studentId ?? $formattedId,
        ]);
    });
}
    public function updateRequirement(Request $request, $id)
    {
        $validFields = ['psa_received', 'id_picture_received', 'good_moral_received', 'report_card_received', 'kids_note_installed'];
        $field = $request->input('field');
        $value = $request->input('value');

        if (!in_array($field, $validFields)) {
            return response()->json(['message' => 'Invalid field'], 400);
        }

        $enrollment = Enrollment::findOrFail($id);
        $enrollment->update([$field => $value]);

        return response()->json([
            'message' => 'Requirement updated successfully',
            'enrollment' => $enrollment
        ]);
    }

    public function summary()
    {
        // Define tuition rates (same as BillingController)
        $rates = [
            'Nursery'        => 31540, // 26,288 + 5,252 misc
            'Kindergarten 1' => 32090, // 26,838 + 5,252 misc
            'Kindergarten 2' => 32490, // 26,988 + 5,502 misc
            'Grade 1'        => 37234, // 30,582 + 5,152 misc + 1,500 Korean
            'Grade 2'        => 37234, // same as Grade 1
            'Grade 3'        => 37234, // same
            'Grade 4'        => 37772, // 30,582 + 5,690 misc + 1,500 Korean
            'Grade 5'        => 37772, // same
            'Grade 6'        => 38272, // 30,582 + 6,190 misc + 1,500 Korean
        ];

        // Count enrollments where payment method is Cash (walk-in pending)
        $cashEnrollments = Enrollment::whereHas('payments', function ($query) {
            $query->where('paymentMethod', 'Cash');
        })->where('status', 'pending')->count();

          $currentSchoolYear = $this->getCurrentSchoolYear();
         

        $unpaidStudents = Student::where('status', 'active')
            ->whereHas('enrollments', function ($q) use ($currentSchoolYear) {
                $q->where('school_year', $currentSchoolYear)
                ->where('status', 'approved');
            })
            ->get()
            ->filter(function ($student) use ($rates, $currentSchoolYear) {
                // Get the enrollment for this school year
                $enrollment = $student->enrollments()
                    ->where('school_year', $currentSchoolYear)
                    ->first();

                $gradeLevel = $enrollment ? $enrollment->gradeLevel : $student->gradeLevel;
                $totalTuition = $rates[$gradeLevel] ?? 31540;

                // Sum only payments linked to the current year's enrollment
                $totalPaid = $student->payments()
                    ->whereHas('enrollment', function ($q) use ($currentSchoolYear) {
                        $q->where('school_year', $currentSchoolYear);
                    })
                    ->sum('amount_paid');

                return ($totalTuition - $totalPaid) > 0;
            })
            ->count();

        return response()->json([
            'total' => Enrollment::count(),
            'pending' => Enrollment::where('status', 'pending')->count(),
            'approved' => Enrollment::where('status', 'approved')->count(),
            'rejected' => Enrollment::where('status', 'rejected')->count(),
            'cash_enrollments' => $cashEnrollments,
            'unpaid_students' => $unpaidStudents,
        ]);
    }



    public function storeAndApprove(Request $request)
{
    $rules = [
        'firstName' => 'required|string',
        'lastName' => 'required|string',
        'middleName' => 'nullable|string',
        'nickname' => 'nullable|string',
        'email' => 'required|email',
        'gradeLevel' => 'required|string',
        'gender' => 'required|string',
        'dateOfBirth' => 'required|date',
        'registrationType' => 'required|in:New Student,Transferee,Continuing',
        'handedness' => 'nullable|string',
        'medicalConditions' => 'nullable|string',

        'fatherName' => 'nullable|string',
        'fatherContact' => 'nullable|string',
        'motherName' => 'nullable|string',
        'motherContact' => 'nullable|string',
        'emergencyContact' => 'required|string',

        'psaReceived' => 'nullable|boolean',
        'idPictureReceived' => 'nullable|boolean',
        'goodMoralReceived' => 'nullable|boolean',
        'reportCardReceived' => 'nullable|boolean',
        'kidsNoteInstalled' => 'nullable|boolean',

        'siblings' => 'nullable|array',
        'siblings.*.name' => 'nullable|string',
        'siblings.*.birthDate' => 'nullable|date',

        'paymentMethod' => 'required|in:Cash,GCash,Bank Transfer',
        'reference_number' => 'nullable|string',
        'amount_paid' => 'nullable|numeric',
        'receipt_image' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
        'payment_status' => 'nullable|string',
        'receipt_path' => 'nullable|string',
        'payment_date' => 'nullable|date',
        'payment_type' => 'nullable|string',
    ];

    // Add conditional validation for continuing students
    if ($request->registrationType === 'Continuing') {
        $rules['studentId'] = 'required|string|exists:students,studentId';
    }

    $validated = $request->validate($rules);

    try {
        $result = DB::transaction(function () use ($request, $validated) {
            // Handle receipt upload
          
            $receiptPath = null;
            if ($request->hasFile('receipt_image')) {
                $receiptPath = $this->uploadToSupabase($request->file('receipt_image'), 'receipts');
            }

            // Determine student for continuing
            $student = null;
            if ($validated['registrationType'] === 'Continuing') {
                $student = $this->findStudentByStudentId($validated['studentId']);
                if (!$student) {
                    throw new \Exception('Student not found with the provided ID.');
                }
                // Update student's current info
                $student->update([
                    'gradeLevel' => $validated['gradeLevel'],
                    'school_year' => $request->school_year ?? $this->getCurrentSchoolYear(),
                ]);
            }

            $schoolYear = $request->school_year ?? $this->getCurrentSchoolYear();

            // Create enrollment
            $enrollmentData = [
                'firstName'         => $validated['firstName'],
                'lastName'          => $validated['lastName'],
                'middleName'        => $validated['middleName'] ?? null,
                'nickname'          => $validated['nickname'] ?? null,
                'email'             => $validated['email'],
                'gradeLevel'        => $validated['gradeLevel'],
                'gender'            => $validated['gender'],
                'dateOfBirth'       => $validated['dateOfBirth'],
                'registrationType'  => $validated['registrationType'],
                'handedness'        => $validated['handedness'] ?? null,
                'medicalConditions' => $validated['medicalConditions'] ?? null,
                'psa_received'      => $request->psaReceived ?? false,
                'id_picture_received' => $request->idPictureReceived ?? false,
                'good_moral_received' => $request->goodMoralReceived ?? false,
                'report_card_received' => $request->reportCardReceived ?? false,
                'kids_note_installed' => $request->kidsNoteInstalled ?? false,
                'status'            => 'approved',
            ];

            if (Schema::hasColumn('enrollments', 'student_id') && $student) {
                $enrollmentData['student_id'] = $student->id;
            }
            if (Schema::hasColumn('enrollments', 'school_year')) {
                $enrollmentData['school_year'] = $schoolYear;
            }

            $enrollment = Enrollment::create($enrollmentData);

            // Siblings (unchanged)
            if (!empty($validated['siblings'])) {
                foreach ($validated['siblings'] as $sib) {
                    if (!empty($sib['name'])) {
                        $enrollment->siblings()->create([
                            'full_name' => $sib['name'],
                            'birth_date' => $sib['birthDate'],
                        ]);
                    }
                }
            }

            // Find section
            $section = Section::where('gradeLevel', $validated['gradeLevel'])
                ->whereColumn('students_count', '<', 'capacity')
                ->first();

            if (!$section) {
                throw new \Exception("No vacancy for {$validated['gradeLevel']}.");
            }

            if ($student) {
                // Continuing student: update existing
                $student->update([
                    'section_id' => $section->id,
                    'status' => 'active',
                ]);
                $formattedId = $student->studentId;
            } else {
                // New student
                $year = date('Y');
                $count = Student::where('studentId', 'like', "SICS-$year-%")->count() + 1;
                $formattedId = 'SICS-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

                $studentData = [
                    'studentId'     => $formattedId,
                    'firstName'     => $validated['firstName'],
                    'lastName'      => $validated['lastName'],
                    'middleName'    => $validated['middleName'] ?? null,
                    'email'         => $validated['email'],
                    'gradeLevel'    => $validated['gradeLevel'],
                    'section_id'    => $section->id,
                    'school_year'   => $schoolYear,
                    'status'        => 'active',
                ];
                if (Schema::hasColumn('students', 'enrollment_id')) {
                    $studentData['enrollment_id'] = $enrollment->id;
                }
                $student = Student::create($studentData);

                if (Schema::hasColumn('enrollments', 'student_id')) {
                    $enrollment->student_id = $student->id;
                    $enrollment->save();
                }
            }

            // Payment
            $paymentData = [
                'student_id'       => $student->id,
                'amount_paid'      => $validated['amount_paid'] ?? 0,
                'paymentMethod'    => $validated['paymentMethod'],
                'reference_number' => $validated['reference_number'] ?? 'WALK-IN-' . time(),
                'payment_type'     => 'Downpayment',
                'payment_date'     => now(),
                'receipt_path'     => $receiptPath,
                'payment_status'   => 'completed',
            ];
            $enrollment->payments()->create($paymentData);

            $section->increment('students_count');

            return ['enrollment' => $enrollment, 'section' => $section, 'id' => $formattedId];
        });

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
            $logoBase64 = '';

            Log::info('=== EMAIL START === Student: ' . $formattedId);
            Log::info('Sending to email: ' . $enrollment->email);

            $section->load(['schedules.subject', 'schedules.time_slot', 'schedules.room', 'advisor']);

            try {
                Log::info('Generating PDF...');
                $pdf = Pdf::loadView('pdf.loadslip', [
                    'enrollment' => $enrollment,
                    'section'    => $section,
                    'studentId'  => $formattedId,
                    'logo'       => $logoBase64
                ])->setPaper('a4', 'portrait');

                $pdfOutput = $pdf->output();
                Log::info('PDF generated OK, size: ' . strlen($pdfOutput) . ' bytes');
            } catch (\Exception $pdfError) {
                Log::error('PDF FAILED: ' . $pdfError->getMessage());
                Log::error($pdfError->getTraceAsString());
                return "but PDF generation failed.";
            }

            Log::info('Sending mail...');
            Mail::to($enrollment->email)
                ->cc('ravelocedrix@gmail.com')
                ->send(new EnrollmentApproved($enrollment, $pdfOutput));

            Log::info('=== EMAIL SENT SUCCESSFULLY ===');
            return "and Loadslip sent to parent email.";
        } catch (\Exception $e) {
            Log::error('=== EMAIL FAILED === ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return "but email failed to send (Check SMTP settings).";
        }
    }


    private function getRequirementLabel($type)
{
    $labels = [
        'psa'          => 'PSA Birth Certificate',
        'good_moral'   => 'Certificate of Good Moral',
        'report_card'  => 'Report Card',
        'picture_2x2'  => '2x2 ID Picture',
        'picture_1x1'  => '1x1 ID Picture',
    ];
    return $labels[$type] ?? ucfirst(str_replace('_', ' ', $type));
}


/**
 * Find a student by their human-readable studentId (e.g., SICS-2025-0001)
 */
private function findStudentByStudentId($studentId)
{
    return Student::where('studentId', $studentId)->first();
}
};
