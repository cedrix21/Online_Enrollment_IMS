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

class EnrollmentController extends Controller
{
    // NEW METHOD: Upload to Supabase
    private function uploadToSupabase($file)
{
    try {
        $client = new Client([
            'verify' => env('APP_ENV') === 'production'
        ]);
        
        $supabaseUrl = env('SUPABASE_URL');
        $supabaseKey = env('SUPABASE_KEY');
        
        // Generate unique filename
        $fileName = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
        
        // Upload to Supabase Storage
        $response = $client->post(
            "{$supabaseUrl}/storage/v1/object/receipts/{$fileName}",
            [
                'headers' => [
                    'Authorization' => "Bearer {$supabaseKey}",
                    'Content-Type' => $file->getMimeType(),
                ],
                'body' => file_get_contents($file->getRealPath())
            ]
        );

        // Check if upload was successful (accept both 200 and 201)
        $statusCode = $response->getStatusCode();
        if ($statusCode !== 200 && $statusCode !== 201) {
            throw new \Exception("Upload failed with status code: {$statusCode}");
        }

        // Log success for debugging
        Log::info("File uploaded successfully: {$fileName}", [
            'status' => $statusCode,
            'file' => $fileName
        ]);

        // Return public URL
        return "{$supabaseUrl}/storage/v1/object/public/receipts/{$fileName}";
        
    } catch (\Exception $e) {
        Log::error("Supabase upload failed: " . $e->getMessage());
        throw new \Exception("File upload failed: " . $e->getMessage());
    }
}




    public function index()
    {
        try {
            $enrollments = Enrollment::with('siblings','payments')->orderBy('created_at', 'desc')->get();
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
        ]);

        return DB::transaction(function () use ($request, $validated) {
            // UPDATED: Handle file upload with Supabase
            $receiptPath = null;
            if ($request->hasFile('receipt_image')) {
                $receiptPath = $this->uploadToSupabase($request->file('receipt_image'));
            }

            $enrollment = Enrollment::create([
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
            ]);

            $enrollment->payments()->create([
                'amount_paid'      => $validated['amount_paid'] ?? 0,
                'paymentMethod'    => $validated['paymentMethod'], 
                'reference_number' => $validated['reference_number'] ?? 'WALK-IN',
                'payment_type'     => 'Downpayment',
                'payment_date'     => now(),
                'receipt_path'     => $receiptPath, 
            ]);

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
                'message' => 'Enrollment submitted successfully!',
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

                $student = Student::create([
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

                $enrollment->payments()->update([
                    'student_id' => $student->id
                ]);

                $section->increment('students_count');

                $emailStatus = $this->sendEnrollmentEmail($enrollment, $section, $formattedId);
                
                return response()->json([
                    'message' => "Approved, assigned to {$section->name}. {$emailStatus}",
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
            
            'unpaid_enrollments' => Enrollment::whereHas('payments', function($query) {
                $query->where('payment_status', 'unpaid');
            })->count(),
            
            'pending_payments' => Enrollment::whereHas('payments', function($query) {
                $query->where('payment_status', 'pending_verification');
            })->count(),
        ]);
    }

    public function storeAndApprove(Request $request)
    {
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
        ]);

        try {
            $result = DB::transaction(function () use ($request, $validated) {
                // UPDATED: Handle file upload with Supabase
                $receiptPath = null;
                if ($request->hasFile('receipt_image')) {
                    $receiptPath = $this->uploadToSupabase($request->file('receipt_image'));
                }
                
                $enrollmentData = collect($validated)->except([
                    'siblings', 'amount_paid', 'paymentMethod', 'reference_number', 'payment_type',
                    'payment_status'
                ])->toArray();

                $enrollment = Enrollment::create($enrollmentData + [
                    'status' => 'approved',
                    'psa_received' => $request->psaReceived ?? false,
                    'id_picture_received' => $request->idPictureReceived ?? false,
                    'good_moral_received' => $request->goodMoralReceived ?? false,
                    'report_card_received' => $request->reportCardReceived ?? false,
                    'kids_note_installed' => $request->kidsNoteInstalled ?? false,
                ]);

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

                $section = Section::where('gradeLevel', $validated['gradeLevel'])
                    ->whereColumn('students_count', '<', 'capacity')
                    ->first();

                if (!$section) {
                    throw new \Exception("No vacancy for {$validated['gradeLevel']}.");
                }

                $year = date('Y');
                $count = Student::where('studentId', 'like', "SICS-$year-%")->count() + 1;
                $formattedId = 'SICS-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

                $student = Student::create([
                    'studentId'     => $formattedId,
                    'firstName'     => $validated['firstName'],
                    'lastName'      => $validated['lastName'],
                    'middleName'    => $validated['middleName'] ?? null,
                    'email'         => $validated['email'],
                    'gradeLevel'    => $validated['gradeLevel'],
                    'section_id'    => $section->id,
                    'enrollment_id' => $enrollment->id,
                    'status'        => 'active',
                ]);

                $enrollment->payments()->create([
                    'student_id'       => $student->id, 
                    'amount_paid'      => $validated['amount_paid'],
                    'paymentMethod'    => $validated['paymentMethod'],
                    'reference_number' => $validated['reference_number'] ?? 'WALK-IN-' . time(),
                    'payment_type'     => 'Downpayment',
                    'payment_date'     => now(),
                    'receipt_path'     => $receiptPath,
                ]);
                
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

            $section->load(['schedules.subject', 'schedules.timeSlot', 'schedules.room', 'advisor']);

            try {
                $pdf = Pdf::loadView('pdf.loadslip', [
                    'enrollment' => $enrollment,
                    'section'    => $section,
                    'studentId'  => $formattedId,
                    'logo'       => $logoBase64
                ])->setPaper('a4', 'portrait');
                
                $pdfOutput = $pdf->output();
            } catch (\Exception $pdfError) {
                Log::error("PDF Generation failed: " . $pdfError->getMessage());
                return "but PDF generation failed.";
            }

            Mail::to($enrollment->email)
                ->cc('ravelocedrix@gmail.com') 
                ->send(new EnrollmentApproved($enrollment, $pdfOutput));

            return "and Loadslip sent to parent email.";

        } catch (\Exception $e) {
            Log::error("Email failed for Student {$formattedId}: " . $e->getMessage());
            return "but email failed to send (Check SMTP settings).";
        }
    }
}