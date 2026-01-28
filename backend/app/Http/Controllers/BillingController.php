<?php
namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BillingController extends Controller
{
    public function addPayment(Request $request, $studentId)
    {
        $validated = $request->validate([
            'amount_paid'      => 'required|numeric|min:1',
            'paymentMethod'    => 'required|string|in:Cash,GCash,Bank Transfer',
            'payment_type'     => 'required|string',
            'reference_number' => 'nullable|string',
        ]);

        try {
            $student = Student::with('payments')->findOrFail($studentId);

            // Calculate tuition and check if fully paid
            $rates = [
                'Kindergarten 1' => 20000,
                'Kindergarten 2' => 20000,
                'Grade 1' => 25000,
                'Grade 2' => 27500,
                'Grade 3' => 30000,
                'Grade 4' => 32000,
                'Grade 5' => 34000,
                'Grade 6' => 36000,
            ];
            
            $totalTuition = $rates[$student->gradeLevel] ?? 25000;
            $totalPaid = $student->payments->sum('amount_paid') + $validated['amount_paid'];
            
            // Determine payment status
            $paymentStatus = $totalPaid >= $totalTuition ? 'fully_paid' : 'partial';

            $payment = $student->payments()->create([
                'enrollment_id'    => $student->enrollment_id,
                'amount_paid'      => $validated['amount_paid'],
                'paymentMethod'    => $validated['paymentMethod'],
                'payment_type'     => $validated['payment_type'],
                'reference_number' => $validated['reference_number'] ?? 'CASH-' . time(),
                'payment_date'     => now(),
                'payment_status'   => $paymentStatus,
            ]);

            return response()->json([
                'message' => 'Payment recorded successfully',
                'payment' => $payment,
                'account_status' => $paymentStatus
            ], 201);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error recording payment: ' . $e->getMessage()], 500);
        }
    }

    public function getStudentLedger($studentId)
    {
        $student = Student::with(['payments'])->findOrFail($studentId);
        
        $rates = [
            'Kindergarten 1' => 20000,
            'Kindergarten 2' => 20000,
            'Grade 1' => 25000,
            'Grade 2' => 27500,
            'Grade 3' => 30000,
            'Grade 4' => 32000,
            'Grade 5' => 34000,
            'Grade 6' => 36000,
        ];
        
        $totalTuition = $rates[$student->gradeLevel] ?? 25000;
        $totalPaid = $student->payments->sum('amount_paid');
        $balance = $totalTuition - $totalPaid;
        
        // Determine account status
        $accountStatus = $balance <= 0 ? 'fully_paid' : ($totalPaid > 0 ? 'partial' : 'unpaid');
        
        return response()->json([
            'student' => $student->firstName . ' ' . $student->lastName,
            'grade_level' => $student->gradeLevel,
            'ledger' => $student->payments,
            'summary' => [
                'total_tuition' => $totalTuition,
                'total_paid' => $totalPaid,
                'balance' => $balance,
                'status' => $accountStatus
            ]
        ]);
    }
}