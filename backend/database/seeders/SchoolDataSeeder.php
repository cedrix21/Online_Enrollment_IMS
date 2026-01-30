<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Teacher;
use App\Models\Section;
use App\Models\Subject;
use App\Models\Room;
use App\Models\TimeSlot;
use App\Models\Student;
use Illuminate\Support\Facades\DB; 

class SchoolDataSeeder extends Seeder
{
    public function run()
    {
        $year = date('Y');

        // 1. CREATE 8 TEACHERS
        $teacherData = [
            ['first' => 'Maria', 'last' => 'Santos', 'spec' => 'Mathematics'],
            ['first' => 'Juan', 'last' => 'Dela Cruz', 'spec' => 'English'],
            ['first' => 'Elena', 'last' => 'Gomez', 'spec' => 'Science'],
            ['first' => 'Ricardo', 'last' => 'Reyes', 'spec' => 'Filipino'],
            ['first' => 'Sonia', 'last' => 'Bautista', 'spec' => 'Social Studies'],
            ['first' => 'Pedro', 'last' => 'Penduko', 'spec' => 'MAPEH'],
            ['first' => 'Liza', 'last' => 'Soerano', 'spec' => 'General Ed'],
            ['first' => 'Raynalyn', 'last' => 'Ocaris', 'spec' => 'History'],
        ];

        $teachers = [];
        foreach ($teacherData as $index => $data) {
            // Remove spaces from last name to handle multi-word names like "Dela Cruz"
            $lastNameNoSpace = str_replace(' ', '', $data['last']);
            $teachers[] = Teacher::create([
                'teacherId'      => 'TCH-' . $year . '-' . str_pad($index + 1, 4, '0', STR_PAD_LEFT),
                'firstName'      => $data['first'],
                'lastName'       => $data['last'],
                'email'          => strtolower($data['first'] . '.' . $lastNameNoSpace) . '@sics.com',
                'specialization' => $data['spec'],
                'status'         => 'active'
            ]);
        }

        // 2. CREATE 8 SECTIONS (One for each level)
        $levels = ['Kindergarten 1', 'Kindergarten 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
        $sectionNames = ['St. John', 'St. Luke', 'St. Mark', 'St. Matthew', 'St. Peter', 'St. Paul', 'St. Anne', 'St. Mary'];

        $createdSections = [];
        foreach ($levels as $index => $level) {
            $createdSections[$level] = Section::create([
                'name'           => $sectionNames[$index],
                'gradeLevel'     => $level,
                'teacher_id'     => $teachers[$index]->id, 
                'capacity'       => 40,
                'students_count' => 0,
            ]);
        }

        // 3. CREATE SUBJECTS FOR EACH GRADE LEVEL
        $baseSubjects = [
            ['Mathematics', 'MATH'], 
            ['English', 'ENG'], 
            ['Science', 'SCI'], 
            ['Filipino', 'FIL'],
            ['Araling Panlipunan', 'AP']
        ];

        // Store subject codes for later reference
        $createdSubjects = [];

        foreach ($levels as $levelIndex => $level) {
            foreach ($baseSubjects as $base) {
                $subjectCode = $base[1] . '-' . strtoupper(str_replace(' ', '', $level));
                $subject = Subject::updateOrCreate(
                    ['subjectCode' => $subjectCode],
                    [
                        'subjectName' => $base[0],
                        'gradeLevel'  => $level,
                        'teacher_id'  => $teachers[$levelIndex]->id // Assign to the corresponding teacher
                    ]
                );
                $createdSubjects[$level][] = $subject;
            }
        }

        // 4. CREATE ROOMS AND TIME SLOTS
        // Disable foreign key checks
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        Room::truncate(); // Clear existing
        TimeSlot::truncate(); // Clear existing  
            
        // Re-enable foreign key checks
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // Create 10 Rooms
        for ($i = 1; $i <= 10; $i++) {
            Room::create([
                'room_name' => "Room " . (100 + $i),
                'building'  => "Main Building"
            ]);
        }

        // Create 8 Time Slots (1 hour each)
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

        // 9. SETUP TEACHER ADVISORY SYSTEM
        // Assign each teacher as advisor to their corresponding grade level
        foreach ($levels as $index => $gradeLevel) {
            $teacher = $teachers[$index];
            
            // Update teacher's advisory grade
            $teacher->update([
                'advisory_grade' => $gradeLevel
            ]);

            // Assign this teacher to all subjects of their grade level
            if (isset($createdSubjects[$gradeLevel])) {
                foreach ($createdSubjects[$gradeLevel] as $subject) {
                    $subject->update(['teacher_id' => $teacher->id]);
                }
            }
        }

        echo "✅ School data seeded successfully!\n";
        echo "   - 8 Teachers created with advisory grades assigned\n";
        echo "   - 8 Sections created\n";
        echo "   - " . (count($levels) * count($baseSubjects)) . " Subjects created\n";
        echo "   - 10 Rooms created\n";
        echo "   - 8 Time Slots created\n";
    }
}