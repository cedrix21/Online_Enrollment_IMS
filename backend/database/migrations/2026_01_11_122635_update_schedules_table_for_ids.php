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
    Schema::table('schedules', function (Blueprint $table) {
        // Remove old string-based columns if they exist
        if (Schema::hasColumn('schedules', 'start_time')) {
            $table->dropColumn(['start_time', 'end_time', 'room']);
        }

        // Add the new Foreign Key columns
        $table->foreignId('time_slot_id')->after('subject_id')->constrained()->onDelete('cascade');
        $table->foreignId('room_id')->after('time_slot_id')->constrained()->onDelete('cascade');
    });
}

public function down()
{
    Schema::table('schedules', function (Blueprint $table) {
        $table->dropForeign(['time_slot_id']);
        $table->dropForeign(['room_id']);
        $table->dropColumn(['time_slot_id', 'room_id']);
        
        $table->time('start_time');
        $table->time('end_time');
        $table->string('room');
    });
}
};
