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
    Schema::table('enrollments', function (Blueprint $table) {
        // Only add them if they don't exist here yet
        if (!Schema::hasColumn('enrollments', 'payment_status')) {
            $table->string('payment_status')->default('unpaid');
            $table->string('payment_receipt_path')->nullable();
            $table->string('reference_number')->nullable();
            $table->decimal('amount_paid', 10, 2)->default(0);
        }
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
