<?php

namespace App\Http\Controllers;

use App\Models\Section;
use App\Models\Room;
use App\Models\TimeSlot;
use Illuminate\Http\Request;

class SectionController extends Controller
{
    // List all sections with their Advisor, Student Count, and Schedule details
    public function index()
    {
        $sections = Section::with([
            'advisor', 
            'students',
            'schedules.subject', 
            'schedules.room', 
            'schedules.teacher',
            'schedules.time_slot'
        ])->withCount('students')->get();
        
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

        return response()->json([
            'message' => 'Section created successfully',
            'section' => $section->load('advisor')
        ], 201);
    }

    // Show a specific section with its schedule and students
    public function show($id)
    {
        $section = Section::with([
            'advisor', 
            'students', 
            'schedules.subject',
            'schedules.teacher',
            'schedules.room',
            'schedules.time_slot'
        ])
        ->withCount('students')
        ->findOrFail($id);
            
        return response()->json($section);
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

        // Check if section has schedules
        if ($section->schedules()->count() > 0) {
            return response()->json([
                'message' => "Cannot delete section '{$section->name}'. It has {$section->schedules()->count()} scheduled subject(s). Please remove schedules first.",
                'has_schedules' => true
            ], 422);
        }

        $sectionName = $section->name;
        $section->delete();

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