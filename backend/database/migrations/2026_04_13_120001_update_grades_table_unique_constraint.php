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
        // Unique constraint already updated in main grades table migration
        // This is a no-op to maintain migration history
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            $table->dropUnique(['student_id', 'subject_id', 'quarter', 'component']);
            $table->unique(['teacher_id', 'student_id', 'subject_id', 'quarter']);
        });
    }
};
