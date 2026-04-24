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
        }])
        ->where('school_year', $schoolYear);

        if ($request->has('gradeLevel')) {
            $query->where('gradeLevel', $request->gradeLevel);
        }

        if ($request->has('with_vacancy') && $request->with_vacancy === 'true') {
            // FIX: PostgreSQL does not allow referencing withCount() aliases in HAVING.
            // Filter in PHP after fetching instead — avoids the SQL dialect issue entirely.
            $sections = $query->get()->filter(function ($section) {
                return $section->students_count < $section->capacity;
            })->values();

            return response()->json($sections);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'gradeLevel' => 'required|string',
            'teacher_id' => 'nullable|exists:teachers,id',
            'capacity'   => 'required|integer|min:1',
        ]);

        $schoolYear = $request->input('school_year', $this->getCurrentSchoolYear());
        $validated['school_year'] = $schoolYear;

        $existingSection = Section::where('name', $validated['name'])
            ->where('gradeLevel', $validated['gradeLevel'])
            ->where('school_year', $schoolYear)
            ->first();

        if ($existingSection) {
            return response()->json([
                'message' => "A section named '{$validated['name']}' already exists for {$validated['gradeLevel']}. Please use a different name."
            ], 422);
        }

        if (!empty($validated['teacher_id'])) {
            $teacherHasSection = Section::where('teacher_id', $validated['teacher_id'])
                ->where('gradeLevel', $validated['gradeLevel'])
                ->where('school_year', $schoolYear)
                ->first();

            if ($teacherHasSection) {
                return response()->json([
                    'message' => "This teacher already advises '{$teacherHasSection->name}' for {$validated['gradeLevel']}. A teacher can only advise one section per grade level."
                ], 422);
            }
        }

        $section = Section::create($validated);

        if (!empty($validated['teacher_id'])) {
            Teacher::where('id', $validated['teacher_id'])
                ->update(['advisory_grade' => $section->gradeLevel]);
        }

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
            'section' => $section->load('advisor', 'subjects')
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $schoolYear = $request->input('school_year', $this->getCurrentSchoolYear());

        $section = Section::with([
            'advisor',
            'students' => function ($query) use ($schoolYear) {
                $query->where('school_year', $schoolYear);
            },
            'schedules' => function ($query) use ($schoolYear) {
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
        $month = (int) date('n');
        $year  = (int) date('Y');
        return ($month >= 6) ? "{$year}-" . ($year + 1) : ($year - 1) . "-{$year}";
    }

    public function destroy(Request $request, $id)
    {
        $schoolYear = $request->input('school_year', $this->getCurrentSchoolYear());

        $section = Section::find($id);
        if (!$section) {
            return response()->json(['message' => 'Section not found.'], 404);
        }

        if ($section->school_year !== $schoolYear) {
            return response()->json([
                'message' => "This section belongs to school year {$section->school_year}. Please switch to that school year to delete it."
            ], 422);
        }

        $studentCount = $section->students()->where('school_year', $schoolYear)->count();
        if ($studentCount > 0) {
            return response()->json([
                'message' => "Cannot delete section '{$section->name}'. It has {$studentCount} enrolled student(s) for {$schoolYear}. Please transfer or remove students first."
            ], 422);
        }

        $sectionName = $section->name;
        $teacherId   = $section->teacher_id;

        $section->delete();

        if ($teacherId) {
            $otherSections = Section::where('teacher_id', $teacherId)
                ->where('school_year', $schoolYear)
                ->count();
            if ($otherSections === 0) {
                Teacher::where('id', $teacherId)->update(['advisory_grade' => null]);
            }
        }

        return response()->json([
            'message' => "Section '{$sectionName}' deleted successfully for {$schoolYear}"
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

    public function getSectionSubjects($sectionId, Request $request)
    {
        $schoolYear = $request->input('school_year', $this->getCurrentSchoolYear());

        $section = Section::with(['subjects' => function ($q) use ($schoolYear) {
            $q->wherePivot('school_year', $schoolYear);
        }])->findOrFail($sectionId);

        return response()->json($section->subjects);
    }
}