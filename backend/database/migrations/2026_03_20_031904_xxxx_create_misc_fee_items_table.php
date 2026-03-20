<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('misc_fee_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tuition_fee_id')
                  ->constrained('tuition_fees')
                  ->onDelete('cascade');
            $table->string('label');             // e.g. "Registration Fee"
            $table->decimal('amount', 10, 2)->default(0);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('misc_fee_items');
    }
};