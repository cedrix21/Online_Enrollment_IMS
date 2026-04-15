<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\Payment;
use App\Models\EnrollmentRequirement;


class PaymentController extends Controller
{
    private $paymongo_secret_key;
    private $paymongo_public_key;
    private $base_url = 'https://api.paymongo.com/v1';

    public function __construct()
    {
        $this->paymongo_secret_key = env('PAYMONGO_SECRET_KEY');
        $this->paymongo_public_key = env('PAYMONGO_PUBLIC_KEY');
    }

    /**
     * Combined: Save Enrollment Data and Initialize GCash Payment
     */
    public function initializeGcashEnrollment(Request $request)
    {

        // 1. Validate including minimum amount
        $request->validate([
            'firstName'        => 'required|string',
            'lastName'         => 'required|string',
            'email'            => 'required|email',
            'gradeLevel'       => 'required|string',
            'registrationType' => 'required|string',
            'emergencyContact' => 'required|string',
            'amount_paid'      => 'required|numeric|min:5000',

        ]);
        // Validate files only if they exist
        if ($request->hasFile('requirement_psa')) {
            $request->validate([
                'requirement_psa' => 'file|mimes:jpg,png,pdf|max:2048',
            ]);
        }
        if ($request->hasFile('requirement_good_moral')) {
            $request->validate([
                'requirement_good_moral' => 'file|mimes:jpg,png,pdf|max:2048',
            ]);
        }
        if ($request->hasFile('requirement_report_card')) {
            $request->validate([
                'requirement_report_card' => 'file|mimes:jpg,png,pdf|max:2048',
            ]);
        }
        if ($request->hasFile('requirement_picture_2x2')) {
            $request->validate([
                'requirement_picture_2x2' => 'image|mimes:jpg,png|max:2048',
            ]);
        }
        if ($request->hasFile('requirement_picture_1x1')) {
            $request->validate([
                'requirement_picture_1x1' => 'image|mimes:jpg,png|max:2048',
            ]);
        }


        return DB::transaction(function () use ($request) {
            try {
                // Validate all fields (including optional ones)
                $validated = $request->validate([
                    'firstName'        => 'required|string',
                    'lastName'         => 'required|string',
                    'email'            => 'required|email',
                    'gradeLevel'       => 'required|string',
                    'registrationType' => 'required|string',
                    'emergencyContact' => 'required|string',
                    'amount_paid'      => 'required|numeric|min:5000',
                    'middleName'       => 'nullable|string',
                    'nickname'         => 'nullable|string',
                    'gender'           => 'nullable|string',
                    'dateOfBirth'      => 'nullable|date',
                    'handedness'       => 'nullable|string',
                    'fatherName'       => 'nullable|string',
                    'fatherContact'    => 'nullable|string',
                    'fatherOccupation' => 'nullable|string',
                    'fatherEmail'      => 'nullable|email',
                    'fatherAddress'    => 'nullable|string',
                    'motherName'       => 'nullable|string',
                    'motherContact'    => 'nullable|string',
                    'motherOccupation' => 'nullable|string',
                    'motherEmail'      => 'nullable|email',
                    'motherAddress'    => 'nullable|string',
                    'medicalConditions' => 'nullable|string',
                ]);

                // Build enrollment data (exclude payment-specific fields)
                $enrollmentData = $validated;
                unset($enrollmentData['amount_paid']);

                // Add school year
                $enrollmentData['school_year'] = $request->school_year ?? $this->getSchoolYear();

                // Create enrollment
                $enrollment = Enrollment::create($enrollmentData);

                // Handle file uploads (same as before)
                $this->storeRequirement($request, 'requirement_psa', $enrollment, 'psa', 'PSA Birth Certificate');
                $this->storeRequirement($request, 'requirement_good_moral', $enrollment, 'good_moral', 'Certificate of Good Moral');
                $this->storeRequirement($request, 'requirement_report_card', $enrollment, 'report_card', 'Report Card');
                $this->storeRequirement($request, 'requirement_picture_2x2', $enrollment, 'picture_2x2', '2x2 Picture');
                $this->storeRequirement($request, 'requirement_picture_1x1', $enrollment, 'picture_1x1', '1x1 Picture');

                // Create payment record
                $payment = Payment::create([
                    'enrollment_id'   => $enrollment->id,
                    'paymentMethod'   => 'GCash',
                    'amount_paid'     => $request->amount_paid,
                    'payment_type'    => 'GCash',
                    'reference_number' => null,
                    'status'          => 'pending',
                    'payment_date'    => now(),
                ]);

                // 3. Create PayMongo Payment Method (GCash)
                $pmResponse = $this->paymongoHttp($this->paymongo_public_key)
                    ->post($this->base_url . '/payment_methods', [
                        'data' => [
                            'attributes' => [
                                'type' => 'gcash',
                                'billing' => [
                                    'name'  => $request->firstName . ' ' . $request->lastName,
                                    'email' => $request->email,
                                    'phone' => $request->fatherContact ?? $request->motherContact ?? '09123456789',
                                ]
                            ]
                        ]
                    ]);

                if ($pmResponse->failed()) {
                    throw new \Exception('Payment Method Error: ' . $pmResponse->body());
                }
                $pmId = $pmResponse->json()['data']['id'];

                // 4. Create Payment Intent
                $piResponse = $this->paymongoHttp($this->paymongo_secret_key)
                    ->post($this->base_url . '/payment_intents', [
                        'data' => [
                            'attributes' => [
                                'amount'                  => (int) ($request->amount_paid * 100), // centavos
                                'currency'                => 'PHP',
                                'payment_method_allowed'  => ['gcash'],
                                'metadata' => [
                                    'enrollment_id' => (string) $enrollment->id,
                                    'student_name'  => (string) ($request->firstName . ' ' . $request->lastName),
                                ]
                            ]
                        ]
                    ]);


                if ($piResponse->failed()) {
                    throw new \Exception('Payment Intent Error: ' . $piResponse->body());
                }
                $piData = $piResponse->json()['data'];
                $piId   = $piData['id'];
                $payment->reference_number = $piId;
                $payment->save();

                // 5. Attach Payment Method to Intent (generates GCash checkout URL)
                $attachResponse = $this->paymongoHttp($this->paymongo_secret_key)
                    ->post($this->base_url . "/payment_intents/{$piId}/attach", [
                        'data' => [
                            'attributes' => [
                                'payment_method' => $pmId,
                                'client_key'     => $piData['attributes']['client_key'],
                                'return_url'     => env('APP_URL_FRONTEND') . '/enrollment/payment-success',
                            ]
                        ]
                    ]);

                if ($attachResponse->failed()) {
                    throw new \Exception('Attach Error: ' . $attachResponse->body());
                }

                $checkoutUrl = $attachResponse->json()['data']['attributes']['next_action']['redirect']['url'];

                // Return both the redirect URL and the enrollment ID for the frontend
                return response()->json([
                    'success'       => true,
                    'checkout_url'  => $checkoutUrl,
                    'enrollment_id' => $enrollment->id,
                ]);
            } catch (\Exception $e) {
                Log::error('Payment Init Failed: ' . $e->getMessage());
                return response()->json(['message' => $e->getMessage()], 500);
            }
        });
    }



   public function initializeBankTransfer(Request $request)
{
    $request->validate([
        'firstName'        => 'required|string',
        'lastName'         => 'required|string',
        'email'            => 'required|email',
        'gradeLevel'       => 'required|string',
        'registrationType' => 'required|string',
        'emergencyContact' => 'required|string',
        'amount_paid'      => 'required|numeric|min:5000',
    ]);

    // Validate files if present
    if ($request->hasFile('requirement_psa')) {
        $request->validate(['requirement_psa' => 'file|mimes:jpg,png,pdf|max:2048']);
    }
    if ($request->hasFile('requirement_good_moral')) {
        $request->validate(['requirement_good_moral' => 'file|mimes:jpg,png,pdf|max:2048']);
    }
    if ($request->hasFile('requirement_report_card')) {
        $request->validate(['requirement_report_card' => 'file|mimes:jpg,png,pdf|max:2048']);
    }
    if ($request->hasFile('requirement_picture_2x2')) {
        $request->validate(['requirement_picture_2x2' => 'image|mimes:jpg,png|max:2048']);
    }
    if ($request->hasFile('requirement_picture_1x1')) {
        $request->validate(['requirement_picture_1x1' => 'image|mimes:jpg,png|max:2048']);
    }

    return DB::transaction(function () use ($request) {
        // Validate all enrollment fields (including optional)
        $validated = $request->validate([
            'firstName'        => 'required|string',
            'lastName'         => 'required|string',
            'email'            => 'required|email',
            'gradeLevel'       => 'required|string',
            'registrationType' => 'required|string',
            'emergencyContact' => 'required|string',
            'amount_paid'      => 'required|numeric|min:5000',
            'middleName'       => 'nullable|string',
            'nickname'         => 'nullable|string',
            'gender'           => 'nullable|string',
            'dateOfBirth'      => 'nullable|date',
            'handedness'       => 'nullable|string',
            'fatherName'       => 'nullable|string',
            'fatherContact'    => 'nullable|string',
            'fatherOccupation' => 'nullable|string',
            'fatherEmail'      => 'nullable|email',
            'fatherAddress'    => 'nullable|string',
            'motherName'       => 'nullable|string',
            'motherContact'    => 'nullable|string',
            'motherOccupation' => 'nullable|string',
            'motherEmail'      => 'nullable|email',
            'motherAddress'    => 'nullable|string',
            'medicalConditions' => 'nullable|string',
        ]);

        // Build enrollment data (exclude payment fields)
        $enrollmentData = $validated;
        unset($enrollmentData['amount_paid']);

        // Add school year
        $enrollmentData['school_year'] = $request->school_year ?? $this->getSchoolYear();

        // Create enrollment (once)
        $enrollment = Enrollment::create($enrollmentData);

        // Handle file uploads using helper
        $this->storeRequirement($request, 'requirement_psa', $enrollment, 'psa', 'PSA Birth Certificate');
        $this->storeRequirement($request, 'requirement_good_moral', $enrollment, 'good_moral', 'Certificate of Good Moral');
        $this->storeRequirement($request, 'requirement_report_card', $enrollment, 'report_card', 'Report Card');
        $this->storeRequirement($request, 'requirement_picture_2x2', $enrollment, 'picture_2x2', '2x2 Picture');
        $this->storeRequirement($request, 'requirement_picture_1x1', $enrollment, 'picture_1x1', '1x1 Picture');

        // Create Checkout Session for bank transfer
        $response = $this->paymongoHttp($this->paymongo_secret_key)
            ->post($this->base_url . '/checkout_sessions', [
                'data' => [
                    'attributes' => [
                        'send_email_receipt' => false,
                        'show_description' => true,
                        'show_line_items' => true,
                        'billing' => [
                            'name' => $request->firstName . ' ' . $request->lastName,
                            'email' => $request->email,
                        ],
                        'line_items' => [
                            [
                                'name' => 'Enrollment Downpayment',
                                'quantity' => 1,
                                'amount' => (int) ($request->amount_paid * 100),
                                'currency' => 'PHP',
                            ]
                        ],
                        'payment_method_types' => [
                            'bdo_online',
                            'landbank_online',
                            'metrobank_online'
                        ],
                        'success_url' => env('APP_URL_FRONTEND') . '/enrollment/payment-success?session_id={CHECKOUT_SESSION_ID}',
                        'failed_url' => env('APP_URL_FRONTEND') . '/enrollment/payment-failed',
                        'metadata' => [
                            'enrollment_id' => (string) $enrollment->id,
                        ]
                    ]
                ]
            ]);

        if ($response->failed()) {
            throw new \Exception('Checkout Session Error: ' . $response->body());
        }

        $checkoutUrl = $response->json()['data']['attributes']['checkout_url'];
        $sessionId = $response->json()['data']['id'];

        // Create payment record
        Payment::create([
            'enrollment_id'   => $enrollment->id,
            'paymentMethod'   => 'Bank Transfer',
            'amount_paid'     => $request->amount_paid,
            'reference_number'=> $sessionId,
            'payment_type'    => 'Downpayment',
            'payment_date'    => now(),
            'status'          => 'pending',
        ]);

        return response()->json([
            'success'       => true,
            'checkout_url'  => $checkoutUrl,
            'enrollment_id' => $enrollment->id,
        ]);
    });
}

    public function handleWebhook(Request $request)
    {
        $event = $request->all();
        $eventType = $event['data']['attributes']['type'] ?? '';

        // GCash payment via Payment Intent
        if ($eventType === 'payment.paid') {
            $enrollmentId = $event['data']['attributes']['data']['attributes']['metadata']['enrollment_id'] ?? null;

            if ($enrollmentId) {
                Enrollment::where('id', $enrollmentId)->update(['status' => 'paid']);
                Payment::where('enrollment_id', $enrollmentId)->update(['status' => 'paid']);
                Log::info("Enrollment $enrollmentId marked as paid via GCash.");
            }
        }

        // Bank Transfer payment via Checkout Session
        if ($eventType === 'checkout_session.payment.paid') {
            $checkoutSessionId = $event['data']['attributes']['data']['id'] ?? null;
            $enrollmentId = $event['data']['attributes']['data']['attributes']['metadata']['enrollment_id'] ?? null;

            if ($enrollmentId && $checkoutSessionId) {
                Enrollment::where('id', $enrollmentId)->update(['status' => 'paid']);
                // Update payment using the checkout session ID as reference_number
                Payment::where('reference_number', $checkoutSessionId)->update(['status' => 'paid']);
                Log::info("Enrollment $enrollmentId marked as paid via Bank Transfer (session: $checkoutSessionId).");
            }
        }

        return response()->json(['success' => true]);
    }



    /**
     * Get PayMongo HTTP client with conditional SSL verification
     * 
     * @param string|null $secretKey Use specific key (defaults to public key)
     * @return \Illuminate\Http\Client\PendingRequest
     */
    private function paymongoHttp($secretKey = null)
    {
        $key = $secretKey ?: $this->paymongo_public_key;
        $http = Http::withBasicAuth($key, '');

        // Disable SSL verification only in local environment
        if (app()->environment('local')) {
            $http = $http->withoutVerifying();
        }

        return $http;
    }

    private function getSchoolYear(): string
    {
        return '2026-2027';
        // $month = (int) date('n');
        // $year  = (int) date('Y');
        // return ($month >= 6) ? "{$year}-" . ($year + 1) : ($year - 1) . "-{$year}";
    }

    private function storeRequirement(Request $request, $field, Enrollment $enrollment, $type, $label)
{
    if ($request->hasFile($field)) {
        $path = $request->file($field)->store("requirements/{$type}", 'public');
        $enrollment->update(["{$type}_path" => $path]);

        EnrollmentRequirement::create([
            'enrollment_id' => $enrollment->id,
            'type'          => $type,
            'type_label'    => $label,
            'original_name' => $request->file($field)->getClientOriginalName(),
            'file_path'     => $path,
            'status'        => 'pending',
        ]);
    }
}
}
