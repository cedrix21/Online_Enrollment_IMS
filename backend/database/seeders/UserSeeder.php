<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Admin user
        User::updateOrCreate(
            ['email' => 'admin@gmail.com'],
            [
                'name' => 'Mark Cedrix',
                'password' => Hash::make('mark123'),
                'role' => 'admin',
            ]
        );

        // Registrar user
        User::updateOrCreate(
            ['email' => 'registrar@gmail.com'],
            [
                'name' => 'Registrar User',
                'password' => Hash::make('registrar123'),
                'role' => 'registrar',
            ]
        );

        // // All 8 Teacher credentials
        // $teacherData = [
        //     ['name' => 'Maria Santos', 'email' => 'maria.santos@sics.com'],
        //     ['name' => 'Juan Dela Cruz', 'email' => 'juan.delacruz@sics.com'],
        //     ['name' => 'Elena Gomez', 'email' => 'elena.gomez@sics.com'],
        //     ['name' => 'Ricardo Reyes', 'email' => 'ricardo.reyes@sics.com'],
        //     ['name' => 'Sonia Bautista', 'email' => 'sonia.bautista@sics.com'],
        //     ['name' => 'Pedro Penduko', 'email' => 'pedro.penduko@sics.com'],
        //     ['name' => 'Liza Soerano', 'email' => 'liza.soerano@sics.com'],
        //     ['name' => 'Raynalyn Ocaris', 'email' => 'raynalyn.ocaris@sics.com'],
        // ];

        // foreach ($teacherData as $teacher) {
        //     User::updateOrCreate(
        //         ['email' => $teacher['email']],
        //         [
        //             'name' => $teacher['name'],
        //             'password' => Hash::make('teacher123'),
        //             'role' => 'teacher',
        //         ]
        //     );
        // }
    }
}