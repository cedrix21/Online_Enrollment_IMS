<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Room;

class RoomSeeder extends Seeder
{
    public function run(): void
    {
        for ($i = 1; $i <= 10; $i++) {
            Room::updateOrCreate(
                ['room_name' => 'Room ' . (100 + $i)],
                ['building'  => 'Main Building']
            );
        }
    }
}