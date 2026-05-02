<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Remove duplicate time slots, keeping the first occurrence
        DB::statement('
            DELETE t1 FROM time_slots t1
            INNER JOIN time_slots t2
            WHERE t1.id > t2.id
              AND t1.start_time = t2.start_time
              AND t1.end_time = t2.end_time
        ');

        // 2. Add unique constraint on (start_time, end_time)
        Schema::table('time_slots', function (Blueprint $table) {
            $table->unique(['start_time', 'end_time']);
        });

        // 3. Remove duplicate rooms, keeping the first occurrence
        DB::statement('
            DELETE r1 FROM rooms r1
            INNER JOIN rooms r2
            WHERE r1.id > r2.id
              AND r1.room_name = r2.room_name
        ');

        // 4. Add unique constraint on room_name
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