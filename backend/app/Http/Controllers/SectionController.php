<?php

namespace App\Http\Controllers;

use App\Models\Section;
use App\Models\Room;
use App\Models\TimeSlot;
use Illuminate\Http\Request;
use App\Models\Subject;
use App\Models\Teacher;
use Illuminate\Support\Facades\DB;

class SectionController extends Controller
{
    // List all sections with their Advisor, Student Count, and Schedule details
    public function index(Request $request)
{
    $schoolYear = $request->input('school_year', $this->getCurrentSchoolYear());

    $query = Section::with([
        'advisor',
        'students' => function ($query) use ($schoolYear) {
            $query->where('school_year', $schoolYear);
        },
        'schedules.subject',
        'schedules.room',
        'schedules.teacher',
        'schedules.time_slot'
    ])
    ->withCount(['students' => function ($query) use ($schoolYear) {
        $query->where('school_year', $schoolYear);
    }]);

    // 🆕 Filter by grade level
    if ($request->has('gradeLevel')) {
        $query->where('gradeLevel', $request->gradeLevel);
    }

    // 🆕 Filter by sections with vacancy
    if ($request->has('with_vacancy') && $request->with_vacancy === 'true') {
        $query->having('students_count', '<', DB::raw('capacity'));
    }

    $sections = $query->get();

    return response()->json($sections);
}

    // Create a new section with validation
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'gradeLevel' => 'required|string',
            'teacher_id' => 'nullable|exists:teachers,id',
            'capacity' => 'required|integer|min:1',
        ]);

        // Check if section name already exists for this grade level
        $existingSection = Section::where('name', $validated['name'])
            ->where('gradeLevel', $validated['gradeLevel'])
            ->first();

        if ($existingSection) {
            return response()->json([
                'message' => "A section named '{$validated['name']}' already exists for {$validated['gradeLevel']}. Please use a different name."
            ], 422);
        }

        // If teacher is assigned, check if they already advise another section for this grade
        if (!empty($validated['teacher_id'])) {
            $teacherHasSection = Section::where('teacher_id', $validated['teacher_id'])
                ->where('gradeLevel', $validated['gradeLevel'])
                ->first();

            if ($teacherHasSection) {
                return response()->json([
                    'message' => "This teacher already advises '{$teacherHasSection->name}' for {$validated['gradeLevel']}. A teacher can only advise one section per grade level."
                ], 422);
            }
        }

        $section = Section::create($validated);
        
         // 🆕 Sync teacher's advisory_grade
    if (!empty($validated['teacher_id'])) {
        Teacher::where('id', $validated['teacher_id'])
            ->update(['advisory_grade' => $section->gradeLevel]);
    }
        // Determine school year (use request if provided, otherwise current)
    $schoolYear = $request->input('school_year', $this->getCurrentSchoolYear());

    // Attach all subjects for this grade level and school year
    $subjects = Subject::where('gradeLevel', $section->gradeLevel)
        ->where('school_year', $schoolYear)
        ->get();

    if ($subjects->isNotEmpty()) {
        $section->subjects()->attach(
            $subjects->pluck('id')->mapWithKeys(fn($id) => [$id => ['school_year' => $schoolYear]])
        );
    }

        return response()->json([
            'message' => 'Section created successfully',
            'section' => $section->load('advisor','subjects')
        ], 201);
    }

    // Show a specific section with its schedule and students
   public function show(Request $request, $id)
{
    $schoolYear = $request->input('school_year', $this->getCurrentSchoolYear());

    $section = Section::with([
        'advisor',
        'students' => function ($query) use ($schoolYear) {
            $query->where('school_year', $schoolYear);
        },
        'schedules' => function ($query) use ($schoolYear) {   // 🆕 filter schedules
            $query->where('school_year', $schoolYear);
        },
        'schedules.subject',
        'schedules.teacher',
        'schedules.room',
        'schedules.time_slot',
        'subjects'
    ])
    ->withCount(['students' => function ($query) use ($schoolYear) {
        $query->where('school_year', $schoolYear);
    }])
    ->findOrFail($id);

    return response()->json($section);
}

private function getCurrentSchoolYear(): string
{
    // return '2026-2027';
    $month = (int) date('n');
    $year  = (int) date('Y');
    return ($month >= 6) ? "{$year}-" . ($year + 1) : ($year - 1) . "-{$year}";
}

    // Delete a section
    public function destroy($id)
    {
        $section = Section::findOrFail($id);

        // Check if section has enrolled students
        if ($section->students()->count() > 0) {
            return response()->json([
                'message' => "Cannot delete section '{$section->name}'. It has {$section->students()->count()} enrolled student(s). Please transfer or remove students first."
            ], 422);
        }

        

        $sectionName = $section->name;
        $section->delete();

        $teacherId = $section->teacher_id;
        $section->delete();

        if ($teacherId) {
            $otherSections = Section::where('teacher_id', $teacherId)->count();
            if ($otherSections === 0) {
                Teacher::where('id', $teacherId)->update(['advisory_grade' => null]);
            }
        }
         // 🆕 Clear teacher's advisory_grade if they have no other sections
        if ($teacherId) {
            $otherSections = Section::where('teacher_id', $teacherId)->count();
            if ($otherSections === 0) {
                Teacher::where('id', $teacherId)->update(['advisory_grade' => null]);
            }
        }

        return response()->json([
            'message' => "Section '{$sectionName}' deleted successfully"
        ], 200);
    }

    public function getRooms()
    {
        return response()->json(Room::all());
    }

    public function getTimeSlots()
    {
        return response()->json(TimeSlot::all());
    }
}