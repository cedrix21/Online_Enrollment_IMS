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
use App\Models\Enrollment;
use App\Models\Section;
use Barryvdh\DomPDF\Facade\Pdf;
use Sabberworm\CSS\Property\Import;






Route::get('/test-pdf', function () {
    // 1. Grab a dummy enrollment and section from your DB
    $enrollment = Enrollment::first(); 
    $section = Section::with(['schedules.subject', 'schedules.time_slot', 'schedules.room', 'advisor'])->first();

    if (!$enrollment || !$section) {
        return "Please ensure you have at least one enrollment and one section in the database to test.";
    }
    // --- ADD THIS LOGO LOGIC HERE ---
    $logoPath = public_path('assets/sics-logo.png');
    $logoBase64 = '';
    if (file_exists($logoPath)) {
        $logoData = base64_encode(file_get_contents($logoPath));
        $logoBase64 = 'data:image/png;base64,' . $logoData;
    }

    // 2. Render the view
    $pdf = Pdf::loadView('pdf.loadslip', [
        'enrollment' => $enrollment,
        'section'    => $section,
        'studentId'  => 'SICS-2026-0013',
        'logo'       => $logoBase64
    ]);

    // 3. Stream it to the browser (instead of downloading)
    return $pdf->stream('test-loadslip.pdf');
});



/*
|--------------------------------------------------------------------------
| Public Routes
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
    Route::get('/user-test', function (Request $request) {
        return response()->json($request->user());
    });

    // Core Data Fetching
    Route::get('/students', [StudentController::class, 'index']);
    Route::get('/teachers', [TeacherController::class, 'index']);
    Route::post('/teachers', [TeacherController::class, 'store']);
    Route::get('/subjects', function() { return Subject::all(); }); 
    
    // Scheduling & Sections 
    // These routes will serve the Load Slip data
    Route::get('/sections', [SectionController::class, 'index']);
    Route::post('/sections', [SectionController::class, 'store']);
    Route::get('/sections/{id}', [SectionController::class, 'show']);
    
    // Resource Selectors for Modals and Slips
    Route::get('/rooms', [SectionController::class, 'getRooms']); 
    Route::get('/time-slots', [SectionController::class, 'getTimeSlots']);
    
    // Schedule Operations
    Route::get('/schedules', [ScheduleController::class, 'index']);
    Route::post('/schedules', [ScheduleController::class, 'store']);
    Route::delete('/schedules/{id}', [ScheduleController::class, 'destroy']);

    /*
    |--------------------------------------------------------------------------
    | Admin/Registrar Only
    |--------------------------------------------------------------------------
    */
    Route::middleware(\App\Http\Middleware\RoleMiddleware::class . ':admin,registrar')->group(function () {
        Route::get('/enrollments/summary', [EnrollmentController::class, 'summary']);
        Route::get('/enrollments', [EnrollmentController::class, 'index']);
        Route::put('/enrollment/{id}/status', [EnrollmentController::class, 'updateStatus']);
        Route::post('/admin/enroll-student', [EnrollmentController::class, 'storeAndApprove']);
    });
});