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
    Schema::create('students', function (Blueprint $table) {
        $table->id();
        $table->string('studentId')->unique();
        $table->string('firstName');
        $table->string('lastName');
        $table->string('email')->unique();
        $table->string('gradeLevel');
        $table->foreignId('enrollment_id')->nullable()->constrained('enrollments'); 
        $table->string('status')->default('active'); 
        $table->timestamps();
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
