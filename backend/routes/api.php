<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\TeacherController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\SectionController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\GradeController;
use App\Http\Controllers\TeacherPortalController;
use App\Http\Controllers\PaymentController;


/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/
Route::post('/enrollment/submit', [EnrollmentController::class, 'submit']);
Route::post('/login', [AuthController::class, 'login']);

// PAYMONGO PUBLIC ROUTES
Route::post('/payment/initialize-gcash-enrollment', [PaymentController::class, 'initializeGcashEnrollment']);
Route::post('/webhooks/paymongo', [PaymentController::class, 'handleWebhook']);

/*
|--------------------------------------------------------------------------
| Protected Routes
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/user/update-credentials', [AuthController::class, 'updateCredentials']);
    Route::get('/user', function (Request $request) {
        return response()->json($request->user());
    });

    // Core Data Fetching
    Route::get('/students', [StudentController::class, 'index']);

    // SUBJECT MANAGEMENT
    Route::get('/subjects', [SubjectController::class, 'index']);
    Route::post('/subjects', [SubjectController::class, 'store']);
    Route::put('/subjects/{id}', [SubjectController::class, 'update']);
    Route::delete('/subjects/{id}', [SubjectController::class, 'destroy']);
    Route::get('/subjects/grade/{gradeLevel}', [SubjectController::class, 'getByGrade']);
    Route::get('/teacher-load', [TeacherController::class, 'getAllAssignments']);

    // TEACHER MANAGEMENT & SUBJECT ASSIGNMENTS
    Route::prefix('teachers')->group(function () {
        Route::get('/', [TeacherController::class, 'index']);
        Route::post('/', [TeacherController::class, 'store']);
        Route::put('/{id}', [TeacherController::class, 'update']);

        Route::post('/{teacherId}/assign-subject', [TeacherController::class, 'assignSubject']);
        Route::get('/{teacherId}/assignments', [TeacherController::class, 'getAssignments']);
        Route::get('/subjects/available', [TeacherController::class, 'getAvailableSubjects']);
        Route::delete('/subject-assignments/{id}', [TeacherController::class, 'removeAssignment']);
    });

    // SECTIONS & SCHEDULING
    Route::get('/sections', [SectionController::class, 'index']);
    Route::post('/sections', [SectionController::class, 'store']);
    Route::get('/sections/{id}', [SectionController::class, 'show']);
    Route::delete('/sections/{id}', [SectionController::class, 'destroy']);
    Route::get('/rooms', [SectionController::class, 'getRooms']);
    Route::get('/time-slots', [SectionController::class, 'getTimeSlots']);
    Route::get('/schedules', [ScheduleController::class, 'index']);
    Route::post('/schedules', [ScheduleController::class, 'store']);
    Route::delete('/schedules/{id}', [ScheduleController::class, 'destroy']);

    // BILLING MANAGEMENT
    Route::prefix('admin/billing')->group(function () {
        Route::get('/student/{studentId}', [BillingController::class, 'getStudentLedger']);
        Route::post('/student/{studentId}/pay', [BillingController::class, 'addPayment']);
        Route::put('/payment/{id}', [BillingController::class, 'updatePayment']);
    });

    // PAYMENT VERIFICATION
    Route::get('/payment/verify', [PaymentController::class, 'verifyPayment']);

    // TEACHER PORTAL
    Route::middleware(\App\Http\Middleware\RoleMiddleware::class . ':teacher')->group(function () {
        Route::get('/teacher/info', [GradeController::class, 'getTeacherInfo']);
        Route::get('/teacher/students', [GradeController::class, 'getTeacherStudents']);
        Route::get('/teacher/subjects', [GradeController::class, 'getTeacherSubjects']);
        Route::get('/teacher/grades', [GradeController::class, 'getGrades']);
        Route::get('/teacher/grades/subject/{subjectId}', [GradeController::class, 'getSubjectGrades']);
        Route::post('/teacher/grades', [GradeController::class, 'submitGrade']);
    });

    // ADMIN/REGISTRAR ROUTES
    Route::middleware(\App\Http\Middleware\RoleMiddleware::class . ':admin,registrar')->group(function () {
        // Enrollment Management
        Route::get('/enrollments/summary', [EnrollmentController::class, 'summary']);
        Route::get('/enrollments', [EnrollmentController::class, 'index']);
        Route::put('/enrollment/{id}/status', [EnrollmentController::class, 'updateStatus']);
        Route::put('/enrollment/{id}/requirement', [EnrollmentController::class, 'updateRequirement']);
        Route::post('/admin/enroll-student', [EnrollmentController::class, 'storeAndApprove']);

        // Grade Management
        Route::get('/admin/grades', [GradeController::class, 'getAllGrades']);
        Route::put('/admin/grades/{gradeId}', [GradeController::class, 'updateGrade']);
        Route::get('/admin/grades/statistics', [GradeController::class, 'getGradeStatistics']);

        // Payment Reports
        Route::get('/admin/payments', [BillingController::class, 'index']);
    });

    // TEACHER DASHBOARD & BULK GRADE SAVE
    Route::get('/teacher/dashboard', [TeacherPortalController::class, 'getDashboardData']);
    Route::post('/teacher/grades/bulk', [TeacherPortalController::class, 'bulkSaveGrades']); // fixed typo
});