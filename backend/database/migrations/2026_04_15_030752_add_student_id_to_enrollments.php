<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
       Schema::table('enrollments', function (Blueprint $table) {
    if (!Schema::hasColumn('enrollments', 'student_id')) {
        $table->foreignId('student_id')->nullable()->constrained('students')->onDelete('cascade');
    }
    if (!Schema::hasColumn('enrollments', 'school_year')) {
        $table->string('school_year')->nullable();
    }
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            //
        });
    }
};
