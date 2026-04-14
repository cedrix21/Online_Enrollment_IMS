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
                
                // 2. Create enrollment record (without files first)
                $enrollment = Enrollment::create($request->except([
                    'requirement_psa',
                    'requirement_good_moral',
                    'requirement_report_card',
                    'requirement_picture_2x2',
                    'requirement_picture_1x1'
                ]));

                if ($request->hasFile('requirement_psa')) {
                    $path = $request->file('requirement_psa')->store('requirements/psa', 'public');
                    $enrollment->psa_path = $path;
                    
                    EnrollmentRequirement::create([
                        'enrollment_id' => $enrollment->id,
                        'type' => 'psa',
                        'type_label' => 'PSA Birth Certificate',
                        'original_name' => $request->file('requirement_psa')->getClientOriginalName(),
                        'file_path' => $enrollment->psa_path,
                        'status' => 'pending', // not verified yet
                    ]);
                    
                }
                if ($request->hasFile('requirement_good_moral')) {
                    $path = $request->file('requirement_good_moral')->store('requirements/good_moral', 'public');
                    $enrollment->good_moral_path = $path;      // ✅ added

                    EnrollmentRequirement::create([
                        'enrollment_id' => $enrollment->id,
                        'type' => 'good_moral',
                        'type_label' => 'Certificate of Good Moral',
                        'original_name' => $request->file('requirement_good_moral')->getClientOriginalName(),
                        'file_path' => $enrollment->good_moral_path,
                        'status' => 'pending',
                    ]);
                    
                }
                if ($request->hasFile('requirement_report_card')) {
                    $path = $request->file('requirement_report_card')->store('requirements/report_card', 'public');
                    $enrollment->report_card_path = $path;     // ✅ added

                    EnrollmentRequirement::create([
                        'enrollment_id' => $enrollment->id,
                        'type' => 'report_card',
                        'type_label' => 'Report Card',
                        'original_name' => $request->file('requirement_report_card')->getClientOriginalName(),
                        'file_path' => $enrollment->report_card_path,
                        'status' => 'pending',
                    ]);
                    
                }
                if ($request->hasFile('requirement_picture_2x2')) {
                    $path = $request->file('requirement_picture_2x2')->store('requirements/pictures', 'public');
                    $enrollment->picture_2x2_path = $path;     // ✅ added

                   EnrollmentRequirement::create([
                        'enrollment_id' => $enrollment->id,
                        'type' => 'picture_2x2',
                        'type_label' => '2x2 Picture',
                        'original_name' => $request->file('requirement_picture_2x2')->getClientOriginalName(),
                        'file_path' => $enrollment->picture_2x2_path,
                        'status' => 'pending',
                    ]);
                    
                }
                if ($request->hasFile('requirement_picture_1x1')) {
                    $path = $request->file('requirement_picture_1x1')->store('requirements/pictures', 'public');
                    $enrollment->picture_1x1_path = $path;     // ✅ added
                    
                    EnrollmentRequirement::create([
                        'enrollment_id' => $enrollment->id,
                        'type' => 'picture_1x1',
                        'type_label' => '1x1 Picture',
                        'original_name' => $request->file('requirement_picture_1x1')->getClientOriginalName(),
                        'file_path' => $enrollment->picture_1x1_path,
                        'status' => 'pending',
                    ]);
                   
                }
                $enrollment->save();

                $payment = Payment::create([
                    'enrollment_id'   => $enrollment->id,
                    'paymentMethod'  => 'GCash',
                    'amount_paid'     => $request->amount_paid,
                    'payment_type'    => 'GCash', 
                    'reference_number'=> null,
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

    public function handleWebhook(Request $request)
    {
        $event = $request->all();
        $eventType = $event['data']['attributes']['type'] ?? '';

        if ($eventType === 'payment.paid') {
            $enrollmentId = $event['data']['attributes']['data']['attributes']['metadata']['enrollment_id'] ?? null;

            if ($enrollmentId) {
                // Since you don't have a payment_status column, 
                // you might want to update the 'status' to 'paid' or 'approved'
                Enrollment::where('id', $enrollmentId)->update(['status' => 'paid']);
                Payment::where('enrollment_id', $enrollmentId)->update(['status' => 'paid']);
                Log::info("Enrollment $enrollmentId marked as paid.");
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
}
