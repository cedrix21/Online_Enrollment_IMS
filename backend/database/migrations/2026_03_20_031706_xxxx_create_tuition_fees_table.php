
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('tuition_fees', function (Blueprint $table) {
            $table->id();
            $table->string('grade_level');       // e.g. "Grade 1", "Nursery"
            $table->string('school_year');        // e.g. "2026-2027"
            $table->decimal('tuition_fee', 10, 2)->default(0);
            $table->decimal('korean_fee', 10, 2)->default(0);
            $table->decimal('down_payment', 10, 2)->default(5000);
            $table->integer('monthly_terms')->default(10);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // One record per grade per school year
            $table->unique(['grade_level', 'school_year']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('tuition_fees');
    }
};