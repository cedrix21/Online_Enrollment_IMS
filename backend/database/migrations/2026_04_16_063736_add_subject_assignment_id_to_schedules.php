<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('schedules', function (Blueprint $table) {
            if (!Schema::hasColumn('schedules', 'subject_assignment_id')) {
                $table->foreignId('subject_assignment_id')
                      ->nullable()
                      ->constrained('subject_assignments')
                      ->onDelete('cascade');
            }
        });
    }

    public function down()
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropForeign(['subject_assignment_id']);
            $table->dropColumn('subject_assignment_id');
        });
    }
};