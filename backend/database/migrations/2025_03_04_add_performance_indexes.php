<?php


use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Students table indexes
        if (Schema::hasTable('students')) {
            Schema::table('students', function (Blueprint $table) {
                // Check if indexes don't already exist
                $indexes = DB::select("SHOW INDEXES FROM students WHERE Key_name != 'PRIMARY'");
                $indexNames = collect($indexes)->pluck('Key_name')->unique()->toArray();

                if (!in_array('idx_grade_level', $indexNames)) {
                    $table->index('gradeLevel', 'idx_grade_level');
                }
                if (!in_array('idx_section_id', $indexNames)) {
                    $table->index('section_id', 'idx_section_id');
                }
            });
        }

        // Grades table indexes
        if (Schema::hasTable('grades')) {
            Schema::table('grades', function (Blueprint $table) {
                $indexes = DB::select("SHOW INDEXES FROM grades WHERE Key_name != 'PRIMARY'");
                $indexNames = collect($indexes)->pluck('Key_name')->unique()->toArray();

                if (!in_array('idx_student_id', $indexNames)) {
                    $table->index('student_id', 'idx_student_id');
                }
                if (!in_array('idx_teacher_id', $indexNames)) {
                    $table->index('teacher_id', 'idx_teacher_id');
                }
                if (!in_array('idx_quarter', $indexNames)) {
                    $table->index('quarter', 'idx_quarter');
                }
                if (!in_array('idx_student_quarter', $indexNames)) {
                    $table->index(['student_id', 'quarter'], 'idx_student_quarter');
                }
            });
        }

        // Subject_assignments table indexes
        if (Schema::hasTable('subject_assignments')) {
            Schema::table('subject_assignments', function (Blueprint $table) {
                $indexes = DB::select("SHOW INDEXES FROM subject_assignments WHERE Key_name != 'PRIMARY'");
                $indexNames = collect($indexes)->pluck('Key_name')->unique()->toArray();

                if (!in_array('idx_teacher_id', $indexNames)) {
                    $table->index('teacher_id', 'idx_teacher_id');
                }
                if (!in_array('idx_grade_level', $indexNames)) {
                    $table->index('gradeLevel', 'idx_grade_level');
                }
            });
        }

        // Subjects table indexes
        if (Schema::hasTable('subjects')) {
            Schema::table('subjects', function (Blueprint $table) {
                $indexes = DB::select("SHOW INDEXES FROM subjects WHERE Key_name != 'PRIMARY'");
                $indexNames = collect($indexes)->pluck('Key_name')->unique()->toArray();

                if (!in_array('idx_grade_level', $indexNames)) {
                    $table->index('gradeLevel', 'idx_grade_level');
                }
            });
        }
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropIndex('idx_grade_level');
            $table->dropIndex('idx_section_id');
        });

        Schema::table('grades', function (Blueprint $table) {
            $table->dropIndex('idx_student_id');
            $table->dropIndex('idx_teacher_id');
            $table->dropIndex('idx_quarter');
            $table->dropIndex('idx_student_quarter');
        });

        Schema::table('subject_assignments', function (Blueprint $table) {
            $table->dropIndex('idx_teacher_id');
            $table->dropIndex('idx_grade_level');
        });

        Schema::table('subjects', function (Blueprint $table) {
            $table->dropIndex('idx_grade_level');
        });
    }
};