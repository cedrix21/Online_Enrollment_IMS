<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\TeacherController;
use App\Http\Controllers\SectionController;
use App\Http\Controllers\ScheduleController;
use App\Models\Subject;
use App\Http\Controllers\BillingController;

Route::get('/debug-enrollment/{id}', function($id) {
    $enrollment = \App\Models\Enrollment::with('payments')->find($id);
    return response()->json([
        'enrollment_id' => $enrollment->id,
        'student_name' => $enrollment->firstName . ' ' . $enrollment->lastName,
        'payment_data' => $enrollment->payments->first(),
        'receipt_path' => $enrollment->payments->first()?->receipt_path,
        'receipt_path_type' => gettype($enrollment->payments->first()?->receipt_path)
    ]);
});

Route::get('/test-supabase-connection', function() {
    try {
        $client = new \GuzzleHttp\Client(['verify' => false]);
        $url = env('SUPABASE_URL');
        $key = env('SUPABASE_KEY');
        
        $response = $client->get("{$url}/storage/v1/bucket/receipts", [
            'headers' => [
                'Authorization' => "Bearer {$key}",
                'apikey' => $key
            ]
        ]);
        
        return response()->json([
            'status' => 'Connected to Supabase!',
            'bucket_exists' => true,
            'response_code' => $response->getStatusCode()
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'Connection failed',
            'error' => $e->getMessage()
        ], 500);
    }
});
    /*
    |--------------------------------------------------------------------------
    | Public Routes (Now correctly wrapped for CORS)
    |--------------------------------------------------------------------------
    */
    Route::post('/enrollment/submit', [EnrollmentController::class, 'submit']); 
    Route::post('/login', [AuthController::class, 'login']);

    /*
    |--------------------------------------------------------------------------
    | Protected Routes
    |--------------------------------------------------------------------------
    */
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user', function (Request $request) {
            return response()->json($request->user());
        });

        // Core Data Fetching
        Route::get('/students', [StudentController::class, 'index']);
        Route::get('/teachers', [TeacherController::class, 'index']);
        Route::post('/teachers', [TeacherController::class, 'store']);
        Route::get('/subjects', function() { return Subject::all(); }); 
        
        // Scheduling & Sections 
        Route::get('/sections', [SectionController::class, 'index']);
        Route::post('/sections', [SectionController::class, 'store']);
        Route::get('/sections/{id}', [SectionController::class, 'show']);
        
        Route::get('/rooms', [SectionController::class, 'getRooms']); 
        Route::get('/time-slots', [SectionController::class, 'getTimeSlots']);
        
        Route::get('/schedules', [ScheduleController::class, 'index']);
        Route::post('/schedules', [ScheduleController::class, 'store']);
        Route::delete('/schedules/{id}', [ScheduleController::class, 'destroy']);

        Route::prefix('admin/billing')->group(function () {
        Route::get('/student/{studentId}', [BillingController::class, 'getStudentLedger']);
        Route::post('/student/{studentId}/pay', [BillingController::class, 'addPayment']);
});

        // Admin/Registrar Only
        Route::middleware(\App\Http\Middleware\RoleMiddleware::class . ':admin,registrar')->group(function () {
            Route::get('/enrollments/summary', [EnrollmentController::class, 'summary']);
            Route::get('/enrollments', [EnrollmentController::class, 'index']);
            Route::put('/enrollment/{id}/status', [EnrollmentController::class, 'updateStatus']);
            // Fixed the route name to be consistent
            Route::post('/admin/enroll-student', [EnrollmentController::class, 'storeAndApprove']);
        });
    });
