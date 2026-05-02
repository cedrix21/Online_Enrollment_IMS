<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Remove duplicate time slots (keep the one with the smallest id)
        DB::statement('
            DELETE FROM time_slots
            USING time_slots AS t2
            WHERE time_slots.id > t2.id
              AND time_slots.start_time = t2.start_time
              AND time_slots.end_time = t2.end_time
        ');

        // 2. Add unique constraint
        Schema::table('time_slots', function (Blueprint $table) {
            $table->unique(['start_time', 'end_time']);
        });

        // 3. Remove duplicate rooms (keep the one with the smallest id)
        DB::statement('
            DELETE FROM rooms
            USING rooms AS r2
            WHERE rooms.id > r2.id
              AND rooms.room_name = r2.room_name
        ');

        // 4. Add unique constraint
        Schema::table('rooms', function (Blueprint $table) {
            $table->unique('room_name');
        });
    }

    public function down(): void
    {
        Schema::table('time_slots', function (Blueprint $table) {
            $table->dropUnique(['start_time', 'end_time']);
        });

        Schema::table('rooms', function (Blueprint $table) {
            $table->dropUnique(['room_name']);
        });
    }
};