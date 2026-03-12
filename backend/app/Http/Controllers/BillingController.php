<?php
namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BillingController extends Controller
{
    public function index()
    {
        $payments = Payment::with('student') // eager load student relationship
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($payments);
    }
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

            // Define tuition rates
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
            
            $totalTuition = $rates[$student->gradeLevel] ?? 31540;
            $totalPaid = $student->payments->sum('amount_paid') + $validated['amount_paid'];
            $balance = $totalTuition - $totalPaid;

            // Create the new payment record
            $payment = $student->payments()->create([
                'enrollment_id'    => $student->enrollment_id,
                'amount_paid'      => $validated['amount_paid'],
                'paymentMethod'    => $validated['paymentMethod'],
                'payment_type'     => $validated['payment_type'],
                'reference_number' => $validated['reference_number'] ?? 'CASH-' . time(),
                'payment_date'     => now(),
                'payment_status'   => 'completed', // This individual payment is completed
            ]);

            // 🔥 KEY PART: Update ALL payment statuses to "paid" if balance is zero or less
            if ($balance <= 0) {
                $student->payments()->update(['payment_status' => 'paid']);
            }

            return response()->json([
                'message' => 'Payment recorded successfully',
                'payment' => $payment,
                'balance' => $balance,
                'fully_paid' => $balance <= 0
            ], 201);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error recording payment: ' . $e->getMessage()], 500);
        }
    }

    public function getStudentLedger($studentId)
    {
        $student = Student::with(['payments'])->findOrFail($studentId);
        
        // Define tuition rates
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
        
        $totalTuition = $rates[$student->gradeLevel] ?? 31540;
        $totalPaid = $student->payments->sum('amount_paid');
        $balance = $totalTuition - $totalPaid;
        
        // Define book fees per grade
            $bookFees = [
                'Nursery'        => 1579,
                'Kindergarten 1' => 2241,
                'Kindergarten 2' => 1642,
                'Grade 1'        => 4629,
                'Grade 2'        => 4879,
                'Grade 3'        => 4859,
                'Grade 4'        => 5488,
                'Grade 5'        => 5488,
                'Grade 6'        => 5488,
            ];

            $bookFee = $bookFees[$student->gradeLevel] ?? 0;
            $booksPaid = $student->payments()->where('payment_type', 'Books')->sum('amount_paid');
            $bookBalance = $bookFee - $booksPaid;
            $bookStatus = $bookBalance <= 0 ? 'paid' : ($booksPaid > 0 ? 'partial' : 'unpaid');

        // Determine overall account status
        $accountStatus = $balance <= 0 ? 'paid' : ($totalPaid > 0 ? 'partial' : 'unpaid');
        
        return response()->json([
            'student' => $student->firstName . ' ' . $student->lastName,
            'grade_level' => $student->gradeLevel,
            'ledger' => $student->payments,
            'summary' => [
                'total_tuition' => $totalTuition,
                'total_paid' => $totalPaid,
                'balance' => $balance,
                'status' => $accountStatus,    
                'books' => [
                    'total'   => $bookFee,
                    'paid'    => $booksPaid,
                    'balance' => $bookBalance,
                    'status'  => $bookStatus,
            ],          
            ]
            
        ]);
    }

    public function updatePayment(Request $request, $id)
    {
        $validated = $request->validate([
            'amount_paid' => 'required|numeric|min:1',
        ]);

        try {
            $payment = Payment::findOrFail($id);
            $payment->update(['amount_paid' => $validated['amount_paid']]);

            return response()->json([
                'message' => 'Payment updated successfully',
                'payment' => $payment
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error updating payment: ' . $e->getMessage()], 500);
        }
    }
}