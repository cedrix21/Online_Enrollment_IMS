<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Student;
use App\Models\Section;

class StudentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Creates 2 students for each grade level
     */
    public function run(): void
    {
        $year = date('Y');
        $schoolYear = $year . '-' . ($year + 1);

        // Student data: 2 students per grade level
        $studentsData = [
            // Nursery
            ['firstName' => 'Sophia', 'lastName' => 'Cruz', 'gradeLevel' => 'Nursery'],
            ['firstName' => 'Lucas', 'lastName' => 'Santos', 'gradeLevel' => 'Nursery'],

            // Kindergarten 1
            ['firstName' => 'Emma', 'lastName' => 'Garcia', 'gradeLevel' => 'Kindergarten 1'],
            ['firstName' => 'Noah', 'lastName' => 'Mendoza', 'gradeLevel' => 'Kindergarten 1'],

            // Kindergarten 2
            ['firstName' => 'Olivia', 'lastName' => 'Lopez', 'gradeLevel' => 'Kindergarten 2'],
            ['firstName' => 'Liam', 'lastName' => 'Reyes', 'gradeLevel' => 'Kindergarten 2'],

            // Grade 1
            ['firstName' => 'Ava', 'lastName' => 'Gonzales', 'gradeLevel' => 'Grade 1'],
            ['firstName' => 'Ethan', 'lastName' => 'Fernandez', 'gradeLevel' => 'Grade 1'],

            // Grade 2
            ['firstName' => 'Isabella', 'lastName' => 'Rivera', 'gradeLevel' => 'Grade 2'],
            ['firstName' => 'Mason', 'lastName' => 'Torres', 'gradeLevel' => 'Grade 2'],

            // Grade 3
            ['firstName' => 'Mia', 'lastName' => 'Ramirez', 'gradeLevel' => 'Grade 3'],
            ['firstName' => 'Logan', 'lastName' => 'Martinez', 'gradeLevel' => 'Grade 3'],

            // Grade 4
            ['firstName' => 'Charlotte', 'lastName' => 'Hernandez', 'gradeLevel' => 'Grade 4'],
            ['firstName' => 'Jackson', 'lastName' => 'Ortega', 'gradeLevel' => 'Grade 4'],

            // Grade 5
            ['firstName' => 'Amelia', 'lastName' => 'Delgado', 'gradeLevel' => 'Grade 5'],
            ['firstName' => 'Benjamin', 'lastName' => 'Valdez', 'gradeLevel' => 'Grade 5'],

            // Grade 6
            ['firstName' => 'Evelyn', 'lastName' => 'Castro', 'gradeLevel' => 'Grade 6'],
            ['firstName' => 'Michael', 'lastName' => 'Morales', 'gradeLevel' => 'Grade 6'],
        ];

        $createdCount = 0;
        $skippedCount = 0;

        foreach ($studentsData as $index => $data) {
            // Find the section for this grade level
            $section = Section::where('gradeLevel', $data['gradeLevel'])->first();

            if (!$section) {
                $this->command->warn("⚠️  No section found for {$data['gradeLevel']} - Skipping student {$data['firstName']} {$data['lastName']}");
                $skippedCount++;
                continue;
            }

            // Generate unique student ID
            $studentNumber = str_pad($index + 1, 4, '0', STR_PAD_LEFT);
            $studentId = 'STU-' . $year . '-' . $studentNumber;

            // Generate email
            $email = strtolower($data['firstName'] . '.' . str_replace(' ', '', $data['lastName'])) . '@student.sics.com';

            try {
                // Create student
                Student::create([
                    'studentId' => $studentId,
                    'firstName' => $data['firstName'],
                    'lastName' => $data['lastName'],
                    'email' => $email,
                    'gradeLevel' => $data['gradeLevel'],
                    'section_id' => $section->id,
                    'status' => 'active',
                    'school_year' => $schoolYear,
                    'lrn' => '123000' . str_pad($index + 1, 4, '0', STR_PAD_LEFT),
                    'contact_number' => '555-000' . str_pad($index + 1, 2, '0', STR_PAD_LEFT),
                ]);
                $createdCount++;
                $this->command->line("✅ Created: {$studentId} - {$data['firstName']} {$data['lastName']} ({$data['gradeLevel']})");
            } catch (\Exception $e) {
                $this->command->error("❌ Error creating student {$data['firstName']} {$data['lastName']}: " . $e->getMessage());
                $skippedCount++;
            }
        }

        $this->command->info("\n📊 Seeder Summary:");
        $this->command->info("✅ Students Created: $createdCount");
        $this->command->warn("⚠️  Students Skipped: $skippedCount");
        
        if ($skippedCount > 0) {
            $this->command->warn("\n⚠️  NOTE: Sections must exist first!");
            $this->command->line("Run: php artisan db:seed --class=SchoolDataSeeder");
        }
    }
}
