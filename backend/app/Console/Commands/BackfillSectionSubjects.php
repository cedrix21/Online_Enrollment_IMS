<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Section;
use App\Models\Subject;

class BackfillSectionSubjects extends Command
{
    protected $signature = 'backfill:section-subjects';
    protected $description = 'Attach existing grade-level subjects to existing sections';

    public function handle()
    {
        $sections = Section::all();
        $count = 0;

        foreach ($sections as $section) {
            $schoolYear = $section->school_year ?? $this->getCurrentSchoolYear();
            $subjects = Subject::where('gradeLevel', $section->gradeLevel)
                ->where('school_year', $schoolYear)
                ->get();

            $existingIds = $section->subjects()->pluck('subject_id')->toArray();
            $newSubjects = $subjects->whereNotIn('id', $existingIds);

            if ($newSubjects->isNotEmpty()) {
                $section->subjects()->attach(
                    $newSubjects->pluck('id')->mapWithKeys(fn($id) => [$id => ['school_year' => $schoolYear]])
                );
                $count += $newSubjects->count();
            }
        }

        $this->info("Attached {$count} subject(s) to existing sections.");
    }

    private function getCurrentSchoolYear(): string
    {
        $month = (int) date('n');
        $year  = (int) date('Y');
        return ($month >= 6) ? "{$year}-" . ($year + 1) : ($year - 1) . "-{$year}";
    }
    //php artisan backfill:section-subjects
}