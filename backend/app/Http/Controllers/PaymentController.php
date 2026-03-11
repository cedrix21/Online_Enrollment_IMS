<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

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
        // 1. Validate based on your migration + frontend
        $request->validate([
            'firstName' => 'required|string',
            'lastName' => 'required|string',
            'email' => 'required|email',
            'gradeLevel' => 'required|string',
            'registrationType' => 'required|string',
            'emergencyContact' => 'required|string',
            'amount_paid' => 'required|numeric',
        ]);

        return DB::transaction(function () use ($request) {
            try {
                // 2. Create the Enrollment record 
                // Note: Only saves fields that exist in your migrations (firstName, lastName, etc.)
                $enrollment = Enrollment::create($request->all());

                // 3. PayMongo Step 1: Create Payment Method (Added SSL Fix)
                $pmResponse = Http::withoutVerifying() 
                    ->withBasicAuth($this->paymongo_public_key, '')
                    ->post($this->base_url . '/payment_methods', [
                        'data' => [
                            'attributes' => [
                                'type' => 'gcash',
                                'billing' => [
                                    'name' => $request->firstName . ' ' . $request->lastName,
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

                // 4. PayMongo Step 2: Create Payment Intent (Added SSL Fix)
                $piResponse = Http::withoutVerifying()
                    ->withBasicAuth($this->paymongo_secret_key, '')
                    ->post($this->base_url . '/payment_intents', [
                        'data' => [
                            'attributes' => [
                                'amount' => (int)($request->amount_paid * 100), // To Centavos
                                'currency' => 'PHP',
                                'payment_method_allowed' => ['gcash'],
                                'metadata' => [
                                    'enrollment_id' => $enrollment->id,
                                    'student_name' => $request->firstName . ' ' . $request->lastName
                                ]
                            ]
                        ]
                    ]);

                if ($piResponse->failed()) {
                    throw new \Exception('Payment Intent Error: ' . $piResponse->body());
                }

                $piData = $piResponse->json()['data'];
                $piId = $piData['id'];

                // 5. PayMongo Step 3: Attach (Added SSL Fix)
                $attach = Http::withoutVerifying()
                    ->withBasicAuth($this->paymongo_secret_key, '')
                    ->post($this->base_url . "/payment_intents/{$piId}/attach", [
                        'data' => [
                            'attributes' => [
                                'payment_method' => $pmId,
                                'client_key' => $piData['attributes']['client_key'],
                                'return_url' => env('APP_URL') . '/enrollment/payment-success'
                            ]
                        ]
                    ]);

                if ($attach->failed()) {
                    throw new \Exception('Attach Error: ' . $attach->body());
                }

                $checkoutUrl = $attach->json()['data']['attributes']['next_action']['redirect']['url'];

                // Note: I removed the $enrollment->update(['reference_number' => $piId]) 
                // because your migration doesn't have a reference_number column yet.

                return response()->json([
                    'success' => true, 
                    'checkout_url' => $checkoutUrl
                ]);

            } catch (\Exception $e) {
                Log::error('Payment Init Failed: ' . $e->getMessage());
                // Returning the actual message helps you debug in the React console
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
                Enrollment::where('id', $enrollmentId)->update([
                    'status' => 'paid',
                ]);
                Log::info("Enrollment $enrollmentId marked as paid.");
            }
        }
        return response()->json(['success' => true]);
    }
}