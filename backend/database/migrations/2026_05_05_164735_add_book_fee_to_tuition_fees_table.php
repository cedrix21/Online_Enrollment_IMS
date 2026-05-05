<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    // migration file
public function up()
{
    Schema::table('tuition_fees', function (Blueprint $table) {
        $table->decimal('book_fee', 10, 2)->default(0)->after('korean_fee');
    });
}

public function down()
{
    Schema::table('tuition_fees', function (Blueprint $table) {
        $table->dropColumn('book_fee');
    });
}
};
