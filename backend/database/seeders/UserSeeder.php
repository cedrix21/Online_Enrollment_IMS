<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User; // make sure your User model exists

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Admin user
        User::create([
            'name' => 'Mark Cedrix',
            'email' => 'admin@example.com',
            'password' => Hash::make('password123'),
            'role' => 'admin', // assuming you have a 'role' column
        ]);

        // Registrar user
        User::create([
            'name' => 'Registrar User',
            'email' => 'registrar@example.com',
            'password' => Hash::make('password123'),
            'role' => 'registrar',
        ]);

       
    }
}
