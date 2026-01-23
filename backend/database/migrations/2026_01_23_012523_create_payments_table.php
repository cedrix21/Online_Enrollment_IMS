<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    Schema::create('payments', function (Blueprint $table) {
        $table->id();
        $table->foreignId('enrollment_id')->constrained()->onDelete('cascade');
        $table->foreignId('student_id')->nullable()->constrained()->onDelete('cascade');
        $table->decimal('amount_paid', 10, 2);
        $table->string('paymentMethod'); // Cash, GCash, Bank Transfer
        $table->string('reference_number')->nullable();
        $table->string('payment_type'); // Downpayment, Tuition, Exam Fee, etc.
        $table->string('receipt_path')->nullable();
        $table->date('payment_date');
        $table->string('payment_status')->default('pending'); // completed, pending, failed
        $table->timestamps();
    });
}



    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }


};
