<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Room;
class RoomSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create 10 Rooms
        for ($i = 1; $i <= 10; $i++) {
            Room::create([
                'room_name' => "Room " . (100 + $i),
                'building'  => "Main Building"
            ]);
        }
    }
}
