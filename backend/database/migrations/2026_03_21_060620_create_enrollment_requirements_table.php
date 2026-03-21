<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('enrollment_requirements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollment_id')
                  ->constrained('enrollments')
                  ->onDelete('cascade');
            $table->string('type');           // psa, good_moral, report_card, picture_2x2, picture_1x1
            $table->string('file_path');      // storage path
            $table->string('original_name'); // original filename from user
            $table->enum('status', ['pending', 'verified', 'rejected'])->default('pending');
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('enrollment_requirements');
    }
};