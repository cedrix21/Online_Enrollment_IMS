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
    Schema::table('students', function (Blueprint $table) {
        if (!Schema::hasColumn('students', 'gender')) {
            $table->string('gender')->nullable();
        }
        if (!Schema::hasColumn('students', 'dateOfBirth')) {
            $table->date('dateOfBirth')->nullable();
        }
        if (!Schema::hasColumn('students', 'middleName')) {
            $table->string('middleName')->nullable();
        }
        if (!Schema::hasColumn('students', 'nickname')) {
            $table->string('nickname')->nullable();
        }
    });
}

public function down()
{
    Schema::table('students', function (Blueprint $table) {
        $table->dropColumn(['gender', 'dateOfBirth', 'middleName', 'nickname']);
    });
}

    
};
