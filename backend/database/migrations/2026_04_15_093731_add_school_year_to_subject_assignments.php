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
    Schema::table('subject_assignments', function (Blueprint $table) {
        if (!Schema::hasColumn('subject_assignments', 'school_year')) {
            $table->string('school_year')->nullable()->after('schedule');
        }
    });
}

public function down()
{
    Schema::table('subject_assignments', function (Blueprint $table) {
        $table->dropColumn('school_year');
    });
}
};
