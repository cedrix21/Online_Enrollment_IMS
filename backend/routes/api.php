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
use App\Http\Controllers\GradeController;


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

        // Teacher Only - Grade Advisory
        Route::middleware(\App\Http\Middleware\RoleMiddleware::class . ':teacher')->group(function () {
            Route::get('/teacher/info', [GradeController::class, 'getTeacherInfo']);
            Route::get('/teacher/students', [GradeController::class, 'getTeacherStudents']);
            Route::get('/teacher/subjects', [GradeController::class, 'getTeacherSubjects']);
            Route::get('/teacher/grades', [GradeController::class, 'getGrades']);
            Route::get('/teacher/grades/subject/{subjectId}', [GradeController::class, 'getSubjectGrades']);
            Route::post('/teacher/grades', [GradeController::class, 'submitGrade']);
        });

        // Admin/Registrar Only
        Route::middleware(\App\Http\Middleware\RoleMiddleware::class . ':admin,registrar')->group(function () {
            Route::get('/enrollments/summary', [EnrollmentController::class, 'summary']);
            Route::get('/enrollments', [EnrollmentController::class, 'index']);
            Route::put('/enrollment/{id}/status', [EnrollmentController::class, 'updateStatus']);
            // Fixed the route name to be consistent
            Route::post('/admin/enroll-student', [EnrollmentController::class, 'storeAndApprove']);

            // Admin/Registrar - Grade Management
            Route::get('/admin/grades', [GradeController::class, 'getAllGrades']);
            Route::put('/admin/grades/{gradeId}', [GradeController::class, 'updateGrade']);
            Route::get('/admin/grades/statistics', [GradeController::class, 'getGradeStatistics']);        });
    });