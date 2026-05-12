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
        Schema::create('attendance_months', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id');
            $table->string('school_year');
            $table->string('grade');               // 'I', 'II', …
            $table->string('month');               // 'July', 'August', …, 'April'
            $table->integer('school_days')->nullable();
            $table->integer('present')->nullable();
            $table->integer('absent')->nullable();
            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('students');
            $table->unique(['student_id', 'school_year', 'grade', 'month'], 'att_month_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_months');
    }
};
