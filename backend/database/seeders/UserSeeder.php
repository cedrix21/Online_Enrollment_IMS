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
        User::updateOrCreate([
            'name' => 'Mark Cedrix',
            'email' => 'admin@gmail.com',
            'password' => Hash::make('mark123'),
            'role' => 'admin', // assuming you have a 'role' column
        ]);

        // Registrar user
        User::updateOrCreate([
            'name' => 'Registrar User',
            'email' => 'registrar@gmail.com',
            'password' => Hash::make('registrar123'),
            'role' => 'registrar',
        ]);

       
    }
}
