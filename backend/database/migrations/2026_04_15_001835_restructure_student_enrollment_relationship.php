<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Models\Enrollment;
use App\Models\Student;

return new class extends Migration
{
    public function up()
    {
        // 1. Add columns to enrollments
        Schema::table('enrollments', function (Blueprint $table) {
            if (!Schema::hasColumn('enrollments', 'student_id')) {
                $table->foreignId('student_id')->nullable()->after('id');
            }
            if (!Schema::hasColumn('enrollments', 'school_year')) {
                $table->string('school_year')->nullable()->after('gradeLevel');
            }
        });

        // 2. Consolidate students and update enrollments
        // Fetch all enrollments with their current student (via enrollment_id)
        $enrollments = Enrollment::with('student')->get();

        foreach ($enrollments as $enrollment) {
            $currentStudent = $enrollment->student;
            if (!$currentStudent) continue;

            // Find or create a master student record by LRN
            $lrn = $currentStudent->lrn;
            $masterStudent = null;

            if ($lrn) {
                // LRN exists – use it as unique identifier
                $masterStudent = Student::where('lrn', $lrn)->first();
            }

            if (!$masterStudent) {
                // No LRN or not found – use the current student record as master
                $masterStudent = $currentStudent;
                // Remove enrollment_id from this student (will be dropped later)
            } else {
                // Master student already exists – we can delete the duplicate student later
                // For now, just link enrollment to master
            }

            // Update enrollment
            $enrollment->student_id = $masterStudent->id;
            $enrollment->school_year = $currentStudent->school_year ?? '2025-2026';
            $enrollment->save();

            // If the current student is a duplicate, we could soft-delete it,
            // but we'll handle cleanup after FK removal.
        }

        // 3. Update grades to reference the consolidated student_id
        // For each grade, if its student_id points to a duplicate student,
        // update it to the master student's id.
        $students = Student::all()->keyBy('id');
        $lrnMap = [];
        foreach ($students as $student) {
            if ($student->lrn) {
                if (!isset($lrnMap[$student->lrn])) {
                    $lrnMap[$student->lrn] = $student->id;
                } else {
                    // Duplicate LRN found – reassign grades to master
                    $masterId = $lrnMap[$student->lrn];
                    DB::table('grades')->where('student_id', $student->id)->update(['student_id' => $masterId]);
                }
            }
        }

        // 4. Drop the old foreign key and column from students
        Schema::table('students', function (Blueprint $table) {
            // Drop foreign key constraint if it exists (Laravel naming convention)
            if (Schema::hasColumn('students', 'enrollment_id')) {
                $table->dropForeign(['enrollment_id']);
                $table->dropColumn('enrollment_id');
            }
        });

        // 5. Add foreign key constraint on enrollments.student_id
        Schema::table('enrollments', function (Blueprint $table) {
            $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
        });

        // Optional: Remove duplicate student records (keep only master per LRN)
        // Be careful: if there are students without LRN, keep them as is.
        $duplicates = DB::table('students')
            ->select('lrn', DB::raw('MIN(id) as keep_id'))
            ->whereNotNull('lrn')
            ->groupBy('lrn')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($duplicates as $dup) {
            DB::table('students')
                ->where('lrn', $dup->lrn)
                ->where('id', '!=', $dup->keep_id)
                ->delete();
        }
    }

    public function down()
    {
        // Reverse operations (not fully reversible without data loss)
        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropForeign(['student_id']);
            $table->dropColumn('student_id');
            $table->dropColumn('school_year');
        });

        Schema::table('students', function (Blueprint $table) {
            $table->foreignId('enrollment_id')->nullable()->constrained('enrollments');
        });
    }
};