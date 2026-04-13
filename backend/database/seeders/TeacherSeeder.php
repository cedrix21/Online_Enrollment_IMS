<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Teacher;
use App\Models\Section;

class TeacherSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Creates teachers with their advisory sections
     */
    public function run(): void
    {
        $year = date('Y');

        // Teacher data: One teacher per grade level (advisory teacher)
        $teachersData = [
            [
                'firstName' => 'Maria',
                'lastName' => 'Santos',
                'specialization' => 'Mathematics',
                'advisory_grade' => 'Nursery',
                'sectionName' => 'St. John',
                'phone' => '555-0101',
            ],
            [
                'firstName' => 'Juan',
                'lastName' => 'Dela Cruz',
                'specialization' => 'English',
                'advisory_grade' => 'Kindergarten 1',
                'sectionName' => 'St. Luke',
                'phone' => '555-0102',
            ],
            [
                'firstName' => 'Elena',
                'lastName' => 'Gomez',
                'specialization' => 'Science',
                'advisory_grade' => 'Kindergarten 2',
                'sectionName' => 'St. Mark',
                'phone' => '555-0103',
            ],
            [
                'firstName' => 'Ricardo',
                'lastName' => 'Reyes',
                'specialization' => 'Filipino',
                'advisory_grade' => 'Grade 1',
                'sectionName' => 'St. Matthew',
                'phone' => '555-0104',
            ],
            [
                'firstName' => 'Sonia',
                'lastName' => 'Bautista',
                'specialization' => 'MAPEH',
                'advisory_grade' => 'Grade 2',
                'sectionName' => 'St. Peter',
                'phone' => '555-0105',
            ],
            [
                'firstName' => 'Pedro',
                'lastName' => 'Penduko',
                'specialization' => 'Social Studies',
                'advisory_grade' => 'Grade 3',
                'sectionName' => 'St. Paul',
                'phone' => '555-0106',
            ],
            [
                'firstName' => 'Raynalyn',
                'lastName' => 'Ocaris',
                'specialization' => 'History',
                'advisory_grade' => 'Grade 4',
                'sectionName' => 'St. Anne',
                'phone' => '555-0107',
            ],
            [
                'firstName' => 'Angela',
                'lastName' => 'Morales',
                'specialization' => 'PE/Health',
                'advisory_grade' => 'Grade 5',
                'sectionName' => 'St. Mary',
                'phone' => '555-0108',
            ],
            [
                'firstName' => 'Carlos',
                'lastName' => 'Torres',
                'specialization' => 'Arts',
                'advisory_grade' => 'Grade 6',
                'sectionName' => 'St. Gabriel',
                'phone' => '555-0109',
            ],
        ];

        $createdTeachers = 0;
        $createdSections = 0;

        foreach ($teachersData as $index => $data) {
            // Generate unique teacher ID
            $teacherNumber = str_pad($index + 1, 4, '0', STR_PAD_LEFT);
            $teacherId = 'TCH-' . $year . '-' . $teacherNumber;

            // Generate email (last name without spaces)
            $lastNameNoSpace = str_replace(' ', '', $data['lastName']);
            $email = strtolower($data['firstName'] . '.' . $lastNameNoSpace) . '@teachers.sics.com';

            try {
                // Create teacher
                $teacher = Teacher::create([
                    'teacherId' => $teacherId,
                    'firstName' => $data['firstName'],
                    'lastName' => $data['lastName'],
                    'email' => $email,
                    'specialization' => $data['specialization'],
                    'advisory_grade' => $data['advisory_grade'],
                    'phone' => $data['phone'],
                    'status' => 'active',
                ]);

                $createdTeachers++;
                $this->command->line("✅ Teacher Created: {$teacherId} - {$data['firstName']} {$data['lastName']} ({$data['specialization']})");

                // Create corresponding section with this teacher as advisor
                $section = Section::create([
                    'name' => $data['sectionName'],
                    'gradeLevel' => $data['advisory_grade'],
                    'teacher_id' => $teacher->id,
                    'capacity' => 40,
                    'students_count' => 0,
                ]);

                $createdSections++;
                $this->command->line("   └─ Section Created: {$data['sectionName']} ({$data['advisory_grade']})");

            } catch (\Exception $e) {
                $this->command->error("❌ Error creating teacher/section {$data['firstName']} {$data['lastName']}: " . $e->getMessage());
            }
        }

        $this->command->info("\n📊 Seeder Summary:");
        $this->command->info("✅ Teachers Created: $createdTeachers");
        $this->command->info("✅ Sections Created: $createdSections");
        $this->command->info('\n🎓 Teachers are now set as Advisory Teachers with sections ready for students!');
    }
}
