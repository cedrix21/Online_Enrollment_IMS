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
            // Registration Type
        $table->string('registrationType')->nullable(); // New, Returning, Continuing
        
        // Child's Detailed Info
        $table->string('middleName')->nullable();
        $table->string('nickname')->nullable();
        $table->date('dateOfBirth')->nullable();
        $table->string('gender')->nullable();
        $table->string('handedness')->nullable(); // Right-handed or Left-handed

        // Father's Details
        $table->string('fatherName')->nullable();
        $table->string('fatherOccupation')->nullable();
        $table->string('fatherContact')->nullable();
        $table->string('fatherEmail')->nullable();
        $table->text('fatherAddress')->nullable();

        // Mother's Details
        $table->string('motherName')->nullable();
        $table->string('motherOccupation')->nullable();
        $table->string('motherContact')->nullable();
        $table->string('motherEmail')->nullable();
        $table->text('motherAddress')->nullable();

        // Household & Emergency
        $table->string('householdType')->nullable(); // Two-parent or One-parent
        $table->string('livesWith')->nullable(); // Father, Mother, Others
        $table->text('emergencyContact')->nullable();
        $table->text('medicalConditions')->nullable();
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
