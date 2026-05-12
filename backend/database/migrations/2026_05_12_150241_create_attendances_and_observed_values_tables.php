<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id');
            $table->string('school_year');
            $table->string('grade');            // 'I', 'II', …, 'VI'
            $table->integer('school_days')->nullable();
            $table->integer('absent')->nullable();
            $table->string('cause1')->nullable();
            $table->integer('tardy')->nullable();
            $table->string('cause2')->nullable();
            $table->integer('present')->nullable();
            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('students');
            // Custom short name for unique index
            $table->unique(['student_id', 'school_year', 'grade'], 'attendance_unique');
        });

        Schema::create('observed_values', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id');
            $table->string('school_year');
            $table->string('grade');
            $table->string('core_value_key');
            $table->string('q1')->nullable();
            $table->string('q2')->nullable();
            $table->string('q3')->nullable();
            $table->string('q4')->nullable();
            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('students');
            // Custom short name for unique index
            $table->unique(
                ['student_id', 'school_year', 'grade', 'core_value_key'],
                'observed_values_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('observed_values');
        Schema::dropIfExists('attendances');
    }
};