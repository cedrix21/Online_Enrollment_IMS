<?php
namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BillingController extends Controller
{
    /**
     * Record a new payment for a student
     */
    public function addPayment(Request $request, $studentId)
    {
        $validated = $request->validate([
            'amount_paid'      => 'required|numeric|min:1',
            'payment_method'   => 'required|string|in:Cash,GCash,Bank Transfer',
            'payment_type'     => 'required|string', // e.g., "Monthly Installment", "Prelim Exam"
            'reference_number' => 'nullable|string',
        ]);

        try {
            $student = Student::findOrFail($studentId);

            $payment = $student->payments()->create([
                'enrollment_id'    => $student->enrollment_id,
                'amount_paid'      => $validated['amount_paid'],
                'payment_method'   => $validated['payment_method'],
                'payment_type'     => $validated['payment_type'],
                'reference_number' => $validated['reference_number'] ?? 'CASH-' . time(),
                'payment_date'     => now(),
            ]);

            return response()->json([
                'message' => 'Payment recorded successfully',
                'payment' => $payment
            ], 201);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error recording payment: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get all payments and calculate balance for a student
     */
    public function getStudentLedger($studentId)
    {
        $student = Student::with(['payments'])->findOrFail($studentId);
        
       // Define your tuition rates here
            $rates = [
                'Grade 1' => 25000,
                'Grade 2' => 27500,
                'Grade 3' => 30000,
                // Add more as needed...
            ];
             // Get the rate based on student's grade_level, default to 25000 if not found
         $totalTuition = $rates[$student->grade_level] ?? 25000;

        $totalPaid = $student->payments->sum('amount_paid');
        
        return response()->json([
        'student' => $student->firstName . ' ' . $student->lastName,
        'grade_level' => $student->grade_level, // Send this to frontend
        'ledger' => $student->payments,
        'summary' => [
            'total_tuition' => $totalTuition,
            'total_paid' => $totalPaid,
            'balance' => $totalTuition - $totalPaid
        ]
    ]);
    }
}