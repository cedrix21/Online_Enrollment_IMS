<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SubjectSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Subjects based on actual SICS class schedules for S.Y. 2025-2026
     */
    public function run()
    {
        $subjects = [
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // NURSERY (Afternoon Program: 1:00 PM - 3:30 PM)
            // Note: No formal academics in schedule, only routine activities
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // (Nursery subjects omitted per extracted schedule data)

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // KINDERGARTEN 1 (Morning Program: 8:00 AM - 11:20 AM)
            // Note: No formal academics in schedule, only routine activities
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // (Kindergarten 1 subjects omitted per extracted schedule data)

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // KINDERGARTEN 2 (Morning Program: 8:15 AM - 11:15 AM)
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ['subjectCode' => 'K2-ENG', 'subjectName' => 'English', 'gradeLevel' => 'Kindergarten 2'],
            ['subjectCode' => 'K2-MATH', 'subjectName' => 'Math', 'gradeLevel' => 'Kindergarten 2'],
            ['subjectCode' => 'K2-FIL', 'subjectName' => 'Filipino', 'gradeLevel' => 'Kindergarten 2'],
            ['subjectCode' => 'K2-SCI', 'subjectName' => 'Science', 'gradeLevel' => 'Kindergarten 2'],
            ['subjectCode' => 'K2-BIBLE', 'subjectName' => 'Bible Class', 'gradeLevel' => 'Kindergarten 2'],
            ['subjectCode' => 'K2-READ', 'subjectName' => 'Reading/Storytelling', 'gradeLevel' => 'Kindergarten 2'],
            ['subjectCode' => 'K2-PE', 'subjectName' => 'PE/Arts', 'gradeLevel' => 'Kindergarten 2'],
            ['subjectCode' => 'K2-LIB', 'subjectName' => 'Review Class & Library Time', 'gradeLevel' => 'Kindergarten 2'],

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // GRADE 1 (Full Day: 8:10 AM - 4:25 PM)
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ['subjectCode' => 'G1-VAL', 'subjectName' => 'Values/Bible Class', 'gradeLevel' => 'Grade 1'],
            ['subjectCode' => 'G1-ENG-R', 'subjectName' => 'English Reading', 'gradeLevel' => 'Grade 1'],
            ['subjectCode' => 'G1-MATH', 'subjectName' => 'Math', 'gradeLevel' => 'Grade 1'],
            ['subjectCode' => 'G1-ENG-L', 'subjectName' => 'English Language', 'gradeLevel' => 'Grade 1'],
            ['subjectCode' => 'G1-SOC', 'subjectName' => 'Social Studies', 'gradeLevel' => 'Grade 1'],
            ['subjectCode' => 'G1-FIL', 'subjectName' => 'Filipino', 'gradeLevel' => 'Grade 1'],
            ['subjectCode' => 'G1-SCI', 'subjectName' => 'Science', 'gradeLevel' => 'Grade 1'],

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // GRADE 2 (Full Day with Minutes: 8:10 AM - 4:20 PM)
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ['subjectCode' => 'G2-MATH', 'subjectName' => 'Math', 'gradeLevel' => 'Grade 2'],
            ['subjectCode' => 'G2-FIL', 'subjectName' => 'Filipino', 'gradeLevel' => 'Grade 2'],
            ['subjectCode' => 'G2-AP', 'subjectName' => 'Araling Panlipunan', 'gradeLevel' => 'Grade 2'],
            ['subjectCode' => 'G2-KOR', 'subjectName' => 'Korean Class', 'gradeLevel' => 'Grade 2'],
            ['subjectCode' => 'G2-ENG', 'subjectName' => 'English', 'gradeLevel' => 'Grade 2'],
            ['subjectCode' => 'G2-SCI', 'subjectName' => 'Science', 'gradeLevel' => 'Grade 2'],
            ['subjectCode' => 'G2-VAL', 'subjectName' => 'Values', 'gradeLevel' => 'Grade 2'],
            ['subjectCode' => 'G2-MAPEH', 'subjectName' => 'MAPEH', 'gradeLevel' => 'Grade 2'],

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // GRADE 3 (Mirrors Grade 4 structure per schedule)
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ['subjectCode' => 'G3-ENG', 'subjectName' => 'English', 'gradeLevel' => 'Grade 3'],
            ['subjectCode' => 'G3-SCI', 'subjectName' => 'Science', 'gradeLevel' => 'Grade 3'],
            ['subjectCode' => 'G3-AP', 'subjectName' => 'Araling Panlipunan', 'gradeLevel' => 'Grade 3'],
            ['subjectCode' => 'G3-KOR', 'subjectName' => 'Korean Language', 'gradeLevel' => 'Grade 3'],
            ['subjectCode' => 'G3-FIL', 'subjectName' => 'Filipino', 'gradeLevel' => 'Grade 3'],
            ['subjectCode' => 'G3-MUS', 'subjectName' => 'Music', 'gradeLevel' => 'Grade 3'],
            ['subjectCode' => 'G3-VAL', 'subjectName' => 'Values', 'gradeLevel' => 'Grade 3'],
            ['subjectCode' => 'G3-MATH', 'subjectName' => 'Mathematics', 'gradeLevel' => 'Grade 3'],
            ['subjectCode' => 'G3-HELE', 'subjectName' => 'HELE', 'gradeLevel' => 'Grade 3'],
            ['subjectCode' => 'G3-PE', 'subjectName' => 'P.E.', 'gradeLevel' => 'Grade 3'],

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // GRADE 4 (Full Day: 8:10 AM - 4:20 PM)
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ['subjectCode' => 'G4-ENG', 'subjectName' => 'English', 'gradeLevel' => 'Grade 4'],
            ['subjectCode' => 'G4-SCI', 'subjectName' => 'Science', 'gradeLevel' => 'Grade 4'],
            ['subjectCode' => 'G4-AP', 'subjectName' => 'Araling Panlipunan', 'gradeLevel' => 'Grade 4'],
            ['subjectCode' => 'G4-KOR', 'subjectName' => 'Korean Language', 'gradeLevel' => 'Grade 4'],
            ['subjectCode' => 'G4-FIL', 'subjectName' => 'Filipino', 'gradeLevel' => 'Grade 4'],
            ['subjectCode' => 'G4-MUS', 'subjectName' => 'Music', 'gradeLevel' => 'Grade 4'],
            ['subjectCode' => 'G4-VAL', 'subjectName' => 'Values', 'gradeLevel' => 'Grade 4'],
            ['subjectCode' => 'G4-MATH', 'subjectName' => 'Mathematics', 'gradeLevel' => 'Grade 4'],
            ['subjectCode' => 'G4-HELE', 'subjectName' => 'HELE', 'gradeLevel' => 'Grade 4'],
            ['subjectCode' => 'G4-PE', 'subjectName' => 'P.E.', 'gradeLevel' => 'Grade 4'],

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // GRADE 5 (Full Day: 8:10 AM - 4:20 PM)
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ['subjectCode' => 'G5-FIL', 'subjectName' => 'Filipino', 'gradeLevel' => 'Grade 5'],
            ['subjectCode' => 'G5-MUS', 'subjectName' => 'Music', 'gradeLevel' => 'Grade 5'],
            ['subjectCode' => 'G5-ENG', 'subjectName' => 'English', 'gradeLevel' => 'Grade 5'],
            ['subjectCode' => 'G5-MATH', 'subjectName' => 'Mathematics', 'gradeLevel' => 'Grade 5'],
            ['subjectCode' => 'G5-VAL', 'subjectName' => 'Values', 'gradeLevel' => 'Grade 5'],
            ['subjectCode' => 'G5-SCI', 'subjectName' => 'Science', 'gradeLevel' => 'Grade 5'],
            ['subjectCode' => 'G5-HELE', 'subjectName' => 'HELE', 'gradeLevel' => 'Grade 5'],
            ['subjectCode' => 'G5-PE', 'subjectName' => 'P.E.', 'gradeLevel' => 'Grade 5'],
            ['subjectCode' => 'G5-AP', 'subjectName' => 'Araling Panlipunan', 'gradeLevel' => 'Grade 5'],
            ['subjectCode' => 'G5-KOR', 'subjectName' => 'Korean Language', 'gradeLevel' => 'Grade 5'],

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // GRADE 6 (Full Day: 8:10 AM - 4:20 PM)
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ['subjectCode' => 'G6-SCI', 'subjectName' => 'Science', 'gradeLevel' => 'Grade 6'],
            ['subjectCode' => 'G6-FIL', 'subjectName' => 'Filipino', 'gradeLevel' => 'Grade 6'],
            ['subjectCode' => 'G6-MUS', 'subjectName' => 'Music', 'gradeLevel' => 'Grade 6'],
            ['subjectCode' => 'G6-ENG', 'subjectName' => 'English', 'gradeLevel' => 'Grade 6'],
            ['subjectCode' => 'G6-MATH', 'subjectName' => 'Mathematics', 'gradeLevel' => 'Grade 6'],
            ['subjectCode' => 'G6-HELE', 'subjectName' => 'HELE', 'gradeLevel' => 'Grade 6'],
            ['subjectCode' => 'G6-PE', 'subjectName' => 'P.E.', 'gradeLevel' => 'Grade 6'],
            ['subjectCode' => 'G6-AP', 'subjectName' => 'Araling Panlipunan', 'gradeLevel' => 'Grade 6'],
            ['subjectCode' => 'G6-KOR', 'subjectName' => 'Korean Language', 'gradeLevel' => 'Grade 6'],
            ['subjectCode' => 'G6-VAL', 'subjectName' => 'Values', 'gradeLevel' => 'Grade 6'],
        ];

        // Insert subjects with timestamps and school year
        foreach ($subjects as $subject) {
            DB::table('subjects')->insert([
                'subjectCode' => $subject['subjectCode'],
                'subjectName' => $subject['subjectName'],
                'gradeLevel' => $subject['gradeLevel'],
                'school_year' => '2025-2026',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->command->info('✅ Subjects seeded successfully for all grade levels!');
        $this->command->info('📊 Total subjects created: ' . count($subjects));
        $this->command->info('');
        $this->command->info('📚 Breakdown by Grade (per extracted schedule):');
        $this->command->info('   • Nursery: No subjects (routine activities only)');
        $this->command->info('   • Kindergarten 1: No subjects (routine activities only)');
        $this->command->info('   • Kindergarten 2: 8 subjects');
        $this->command->info('   • Grade 1: 7 subjects');
        $this->command->info('   • Grade 2: 8 subjects (includes MAPEH)');
        $this->command->info('   • Grade 3: 10 subjects (mirrors Grade 4)');
        $this->command->info('   • Grade 4: 10 subjects');
        $this->command->info('   • Grade 5: 10 subjects');
        $this->command->info('   • Grade 6: 10 subjects');
        $this->command->info('');
        $this->command->info('📝 Key Updates:');
        $this->command->info('   • Removed special activity days (Fund Project, Activity Day)');
        $this->command->info('   • Removed English/Library combo subjects (kept core English)');
        $this->command->info('   • Grade 3 now perfectly mirrors Grade 4 structure');
        $this->command->info('   • Added Reading/Storytelling to K2');
        $this->command->info('   • Grade 3-6 now include HELE (Home Economics & Livelihood Education)');
    }
}