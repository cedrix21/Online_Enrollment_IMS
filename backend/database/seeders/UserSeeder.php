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
            ['email' => 'admin@gmail.com'], // 1. Search only by email
            [                               // 2. These are the values to set/update
                'name' => 'Mark Cedrix',
                'password' => Hash::make('mark123'),
                'role' => 'admin',
            ]
        );

        // Registrar user
        User::updateOrCreate(
            ['email' => 'registrar@gmail.com'], // 1. Search only by email
            [                                   // 2. These are the values to set/update
                'name' => 'Registrar User',
                'password' => Hash::make('registrar123'),
                'role' => 'registrar',
            ]
        );
    }
}