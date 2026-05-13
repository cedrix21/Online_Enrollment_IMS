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
use App\Http\Controllers\StudentRecordController;
use App\Http\Controllers\TuitionFeeController;
use App\Http\Controllers\EnrollmentRequirementController;
use App\Http\Controllers\Admin\UserManagementController;   
use App\Models\Setting;
use App\Http\Controllers\TeacherAttendanceController;
use App\Http\Controllers\TeacherObservedValueController;
use App\Http\Middleware\RoleMiddleware;
use App\Http\Controllers\ParentController;

// // Temporary route for cleaning activity logs via cron job
// Route::get('/cron/clean-logs', function (Request $request) {
//     $secret = config('app.cron_secret');
//     if ($request->query('token') !== $secret) {
//         return response('Unauthorized', 401);
//     }
//     Artisan::call('activity-log:clean');
//     return response(Artisan::output());
// });




/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/
Route::post('/enrollment/submit', [EnrollmentController::class, 'submit']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/tuition-fees/public', [TuitionFeeController::class, 'public']);
Route::get('/students/by-id/{studentId}', [StudentController::class, 'findByStudentId']);
Route::get('/current-school-year', [App\Http\Controllers\SchoolYearController::class, 'getCurrentYear']);

// PayMongo public routes
Route::post('/payment/initialize-gcash-enrollment', [PaymentController::class, 'initializeGcashEnrollment']);
Route::post('/payment/initialize-bank-transfer', [PaymentController::class, 'initializeBankTransfer']);
Route::post('/webhooks/paymongo', [PaymentController::class, 'handleWebhook']);


// Verify signed token – returns email if valid
Route::get('/parent/verify-set-password', function (Request $request) {
    if (!$request->hasValidSignature()) {
        return response()->json(['message' => 'Invalid or expired link.'], 403);
    }
    return response()->json(['email' => $request->email]);
})->name('parent.verify-set-password');



// Set the actual password
Route::post('/parent/set-password', function (Request $request) {
    if (!$request->hasValidSignature()) {
        return response()->json(['message' => 'Invalid or expired link.'], 403);
    }
     // ✅ Prevent reuse: check if the link was already used
    $createdAt = $request->input('created_at');
    if (empty($createdAt)) {
        return response()->json(['message' => 'Invalid link.'], 403);
    }

    $user = \App\Models\User::where('email', $request->email)
                ->where('role', 'parent')
                ->first();

    if ($user && $user->password_set_at && $user->password_set_at->timestamp > (int) $createdAt) {
        return response()->json(['message' => 'This link has already been used. Please request a new one.'], 403);
    }
    $request->validate([
        'email'    => 'required|email',
        'password' => 'required|string|min:6|confirmed',
    ]);
    $user = \App\Models\User::where('email', $request->email)
                ->where('role', 'parent')
                ->first();
    if (!$user) {
        return response()->json(['message' => 'Parent account not found.'], 404);
    }
    // ✅ After saving the new password, set password_set_at
    $user->password = \Illuminate\Support\Facades\Hash::make($request->password);
    $user->password_set_at = now();
    $user->save();


    return response()->json(['message' => 'Password set successfully. You can now log in.']);
})->name('parent.set-password');



// Request OTP
Route::post('/forgot-password', function (Request $request) {
    $request->validate(['email' => 'required|email']);

    $user = \App\Models\User::where('email', $request->email)->first();

    if ($user) {
        // Generate 6‑digit OTP valid for 10 minutes
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $user->otp = $otp;
        $user->otp_expires_at = now()->addMinutes(10);
        $user->save();

        // Send OTP email (reuse the same mailable but with a custom view? Or create a new simple mailable)
        // We'll use a basic mail for OTP – you can create a new mailable or just inline it.
        \Illuminate\Support\Facades\Mail::raw(
            "Your OTP for password reset is: $otp\n\nThis code expires in 10 minutes.",
            function ($message) use ($user) {
                $message->to($user->email)
                    ->subject('Your OTP for Password Reset');
            }
        );

        \Illuminate\Support\Facades\Log::info("OTP sent to {$request->email}: $otp");
    } else {
        \Illuminate\Support\Facades\Log::info("OTP requested for unknown email: {$request->email}");
    }

    return response()->json(['message' => 'If the email is associated with an account, an OTP has been sent.']);
});

// Verify OTP and send reset link
Route::post('/verify-otp', function (Request $request) {
    $request->validate([
        'email' => 'required|email',
        'otp'   => 'required|string|size:6',
    ]);

    $user = \App\Models\User::where('email', $request->email)->first();

    if (!$user || !$user->otp || $user->otp_expires_at < now() || $user->otp !== $request->otp) {
        return response()->json(['message' => 'Invalid or expired OTP.'], 422);
    }

    // Clear OTP
    $user->otp = null;
    $user->otp_expires_at = null;
    $user->save();

    // Generate signed reset link (reuse same logic)
    $signedUrl = \Illuminate\Support\Facades\URL::temporarySignedRoute(
    'parent.set-password',
    now()->addHours(24),
        ['email' => $user->email, 'created_at' => now()->timestamp]
    );
    $frontendUrl = env('APP_URL_FRONTEND') . '/parent/set-password?token=' . urlencode($signedUrl);

    // Send the actual reset link email
    \Illuminate\Support\Facades\Mail::to($user->email)
        ->send(new \App\Mail\ParentSetPassword($frontendUrl, $user->name, true));

    \Illuminate\Support\Facades\Log::info("Password reset link sent to {$request->email} after OTP verification");

    return response()->json(['message' => 'OTP verified. A reset link has been sent to your email.']);
});
/*
|--------------------------------------------------------------------------
| Protected Routes — All authenticated users
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/user/update-credentials', [AuthController::class, 'updateCredentials']);
    Route::get('/user', fn (Request $request) => response()->json($request->user()));

    Route::get('/payment/verify', [PaymentController::class, 'verifyPayment']);
    Route::get('/teachers/{id}/schedule',          [ScheduleController::class, 'getTeacherSchedule']);

    /*
    |--------------------------------------------------------------------------
    | Teacher Portal — role: teacher
    |--------------------------------------------------------------------------
    */
    Route::middleware(\App\Http\Middleware\RoleMiddleware::class . ':teacher')->group(function () {
        Route::get('/teacher/info',                           [GradeController::class, 'getTeacherInfo']);
        Route::get('/teacher/students',                       [GradeController::class, 'getTeacherStudents']);
        Route::get('/teacher/subjects',                       [GradeController::class, 'getTeacherSubjects']);
        Route::get('/teacher/grades',                         [GradeController::class, 'getGrades']);
        Route::get('/teacher/grades/subject/{subjectId}',     [GradeController::class, 'getSubjectGrades']);
        Route::post('/teacher/grades',                        [GradeController::class, 'submitGrade']);
        Route::get('/teacher/dashboard',                      [TeacherPortalController::class, 'getDashboardData']);
        Route::post('/teacher/grades/bulk',                   [TeacherPortalController::class, 'bulkSaveGrades']);
        Route::get('/teacher/attendance/{studentId}',         [TeacherAttendanceController::class, 'show']);
        Route::post('/teacher/attendance',                    [TeacherAttendanceController::class, 'store']);

        Route::get('/teacher/observed-values/{studentId}',    [TeacherObservedValueController::class, 'show']);
        Route::post('/teacher/observed-values',               [TeacherObservedValueController::class, 'store']);
    });

    /*
    |--------------------------------------------------------------------------
    | Admin + Registrar — shared features
    |--------------------------------------------------------------------------
    */
    Route::middleware(\App\Http\Middleware\RoleMiddleware::class . ':admin,registrar')->group(function () {

        // Student Records
        Route::apiResource('student-records', StudentRecordController::class)
            ->only(['index', 'store', 'update', 'destroy']);

        // Students
        Route::post('/students/{id}/update-info',    [StudentController::class, 'updateStudentInfo']);
        Route::get('/students/current-year',         [StudentController::class, 'getCurrentYearList']);
        Route::get('/students',                      [StudentController::class, 'index']);
        Route::post('/students',                     [StudentController::class, 'store']);
        Route::put('/students/{id}',                 [StudentController::class, 'update']);
        Route::delete('/students/{id}',              [StudentController::class, 'destroy']);
        Route::get('/students/search',               [StudentController::class, 'searchByEmail']);
        Route::get('/students/{id}/enrollments',     [StudentController::class, 'getEnrollments']);
        Route::put('/students/{studentId}/transfer', [StudentController::class, 'transferToSection']);
        Route::post('/student-records/{id}/update-info', [StudentRecordController::class, 'updateInfo']);
        Route::put('/students/{id}/discount', [StudentController::class, 'updateDiscount']);

        // Enrollment Management
        Route::get('/enrollments/summary',             [EnrollmentController::class, 'summary']);
        Route::get('/enrollments',                     [EnrollmentController::class, 'index']);
        Route::put('/enrollment/{id}/status',          [EnrollmentController::class, 'updateStatus']);
        Route::put('/enrollment/{id}/requirement',     [EnrollmentController::class, 'updateRequirement']);
        Route::post('/admin/enroll-student',           [EnrollmentController::class, 'storeAndApprove']);

        // Enrollment Requirements
        Route::get('/enrollments/{id}/requirements',   [EnrollmentRequirementController::class, 'index']);
        Route::put('/requirements/{id}/status',        [EnrollmentRequirementController::class, 'updateStatus']);

        // Load Slips / Form 137 — sections & schedules (read-only for registrar)
        Route::get('/sections',                        [SectionController::class, 'index']);
        Route::get('/sections/{id}',                   [SectionController::class, 'show']);
        Route::get('/sections/{id}/subjects',          [SectionController::class, 'getSectionSubjects']);
        Route::get('/schedules',                       [ScheduleController::class, 'index']);
        Route::get('/rooms',                           [SectionController::class, 'getRooms']);
        Route::get('/time-slots',                      [SectionController::class, 'getTimeSlots']);

        // Subjects (read-only for registrar — for dropdowns)
        Route::get('/subjects',                        [SubjectController::class, 'index']);
        Route::get('/subjects/grade/{gradeLevel}',     [SubjectController::class, 'getByGrade']);
        Route::get('/admin/subjects',                  [SubjectController::class, 'index']);

        // Teachers — read access for both admin and registrar
        // (registrar needs teacher list for load slips and dashboard)
        Route::get('/teachers',                        [TeacherController::class, 'index']);
        Route::get('/teacher-load',                    [TeacherController::class, 'getAllAssignments']);
        Route::get('/teachers/{teacherId}/assignments',[TeacherController::class, 'getAssignments']);
        Route::get('/teachers/subjects/available',     [TeacherController::class, 'getAvailableSubjects']);
        // Billing & Payments
        Route::get('/admin/billing/student/{studentId}',    [BillingController::class, 'getStudentLedger']);
        Route::post('/admin/billing/student/{studentId}/pay', [BillingController::class, 'addPayment']);
        Route::put('/admin/billing/payment/{id}',           [BillingController::class, 'updatePayment']);
        Route::get('/admin/payments',                       [BillingController::class, 'index']);
        

        // Grades (read-only for registrar)
        Route::get('/admin/grades',                          [GradeController::class, 'getAllGrades']);
        Route::get('/admin/grades/statistics',               [GradeController::class, 'getGradeStatistics']);

        Route::get('/students/{id}/attendance',              [StudentController::class, 'attendance']);
        Route::get('/students/{id}/observed-values',         [StudentController::class, 'observedValues']);
        Route::get('/students/{id}/attendance-months', [StudentController::class, 'attendanceMonths']);
    });

    /*
    |--------------------------------------------------------------------------
    | Admin only — full management access
    |--------------------------------------------------------------------------
    */
    Route::middleware(\App\Http\Middleware\RoleMiddleware::class . ':admin')->group(function () {

        // Section Management (create, delete)
        Route::post('/sections',                       [SectionController::class, 'store']);
        Route::delete('/sections/{id}',                [SectionController::class, 'destroy']);

        // Schedule Management
        Route::post('/schedules',                      [ScheduleController::class, 'store']);
        Route::delete('/schedules/{id}',               [ScheduleController::class, 'destroy']);
        Route::post('/time-slots', [App\Http\Controllers\TimeSlotController::class, 'store']);

        // Subject Management (create, update, delete)
        Route::post('/subjects',                       [SubjectController::class, 'store']);
        Route::put('/subjects/{id}',                   [SubjectController::class, 'update']);
        Route::delete('/subjects/{id}',                [SubjectController::class, 'destroy']);

        // Teacher Management — write operations (admin only)
        Route::post('/teachers',                               [TeacherController::class, 'store']);
        Route::put('/teachers/{id}',                           [TeacherController::class, 'update']);
        Route::post('/teachers/{teacherId}/assign-subject',    [TeacherController::class, 'assignSubject']);
        Route::delete('/teachers/subject-assignments/{id}',    [TeacherController::class, 'removeAssignment']);
        Route::post('/teachers/{teacher}/reset-password',      [TeacherController::class, 'resetPassword']);

        // Grade Management (update)
        Route::put('/admin/grades/{gradeId}',          [GradeController::class, 'updateGrade']);

        // Tuition Fee Management
        Route::get('/tuition-fees',                    [TuitionFeeController::class, 'index']);
        Route::get('/tuition-fees/{id}',               [TuitionFeeController::class, 'show']);
        Route::post('/tuition-fees',                   [TuitionFeeController::class, 'store']);
        Route::put('/tuition-fees/{id}',               [TuitionFeeController::class, 'update']);
        Route::delete('/tuition-fees/{id}',            [TuitionFeeController::class, 'destroy']);

        Route::get('/admin/locked-users',              [UserManagementController::class, 'lockedUsers']);
        Route::post('/admin/unlock-user/{id}',         [UserManagementController::class, 'unlockUser']);

        Route::post('/admin/school-year', function (Request $request) {
        $request->validate([
            'school_year' => 'required|string|regex:/^\d{4}-\d{4}$/',
        ]);

        Setting::updateOrCreate(
            ['key' => 'current_school_year'],
            ['value' => $request->school_year]
        );

        return response()->json(['message' => 'School year updated.']);
    });
    });

    Route::middleware(RoleMiddleware::class . ':parent')->group(function () {
        Route::get('/parent/children', [ParentController::class, 'children']);
        Route::get('/parent/children/{id}/profile', [StudentController::class, 'findByStudentId']);
        Route::get('/parent/children/{id}/ledger', [BillingController::class, 'getStudentLedger']);
    });


    // Activity Logs – Admin 
    Route::middleware(RoleMiddleware::class . ':admin')->get('/admin/activity-logs', function (Request $request) {
        $logs = Spatie\Activitylog\Models\Activity::with('causer')
            ->when($request->user_id, fn($q) => $q->where('causer_id', $request->user_id))
            ->when($request->action, fn($q) => $q->where('description', 'like', "%{$request->action}%"))
            ->when($request->log_name, fn($q) => $q->where('log_name', $request->log_name))
            ->when($request->from_date, fn($q) => $q->whereDate('created_at', '>=', $request->from_date))
            ->when($request->to_date, fn($q) => $q->whereDate('created_at', '<=', $request->to_date))
            ->orderBy('created_at', 'desc')
            ->paginate(50);
        return response()->json($logs);
    });
  



    Route::middleware('auth:sanctum')->post('/activity-logs', [App\Http\Controllers\Api\ActivityLogController::class, 'store']);
});
