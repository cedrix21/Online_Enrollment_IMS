<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\TimeSlot;
class TimeSlotSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
         $slots = [
            ['08:00:00', '09:00:00', '08:00 AM - 09:00 AM'],
            ['09:00:00', '10:00:00', '09:00 AM - 10:00 AM'],
            ['10:00:00', '11:00:00', '10:00 AM - 11:00 AM'],
            ['11:00:00', '12:00:00', '11:00 AM - 12:00 PM'],
            ['13:00:00', '14:00:00', '01:00 PM - 02:00 PM'],
            ['14:00:00', '15:00:00', '02:00 PM - 03:00 PM'],
            ['15:00:00', '16:00:00', '03:00 PM - 04:00 PM'],
            ['16:00:00', '17:00:00', '04:00 PM - 05:00 PM'],
        ];

        foreach ($slots as $slot) {
            TimeSlot::create([
                'start_time'    => $slot[0],
                'end_time'      => $slot[1],
                'display_label' => $slot[2],
            ]);
        }

    }
}
