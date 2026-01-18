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

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// ✅ Forces JSON headers AND injects CORS permissions manually
Route::group(['middleware' => function (Request $request, $next) {
    $response = $next($request);
    
    // Set headers on the response object
    $response->headers->set('Access-Control-Allow-Origin', 'https://online-enrollment-system.up.railway.app');
    $response->headers->set('Access-Control-Allow-Credentials', 'true');
    $response->headers->set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, DELETE');
    $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With');
    $response->headers->set('Accept', 'application/json');
    
    return $response;
}], function () {

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
        
        // Resource Selectors
        Route::get('/rooms', [SectionController::class, 'getRooms']); 
        // Note: Using a closure for testing, ensure this method exists in SectionController
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
});