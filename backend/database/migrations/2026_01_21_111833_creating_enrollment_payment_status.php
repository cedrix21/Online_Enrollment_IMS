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
        Schema::table('students', function (Blueprint $table) {
    $table->string('payment_status')->default('unpaid'); // unpaid, pending_verification, paid
    $table->string('payment_receipt_path')->nullable(); // Path to the uploaded screenshot
    $table->string('reference_number')->nullable();
    $table->decimal('amount_paid', 10, 2)->default(0.00);
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
