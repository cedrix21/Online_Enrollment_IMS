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
            DELETE t1 FROM time_slots t1
            INNER JOIN time_slots t2
                ON t1.start_time = t2.start_time
                AND t1.end_time = t2.end_time
                AND t1.id > t2.id
        ');

        // 2. Add unique constraint
        Schema::table('time_slots', function (Blueprint $table) {
            $table->unique(['start_time', 'end_time']);
        });

        // 3. Remove duplicate rooms (keep the one with the smallest id)
        DB::statement('
            DELETE r1 FROM rooms r1
            INNER JOIN rooms r2
                ON r1.room_name = r2.room_name
                AND r1.id > r2.id
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