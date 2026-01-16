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
        // UPDATED: Added schedules.room, schedules.timeSlot, and schedules.subject
        $sections = Section::with([
            'advisor', 
            'students',
            'schedules.subject', 
            'schedules.room', 
            'schedules.timeSlot'
        ])->withCount('students')->get();
        
        return response()->json($sections);
    }

    // Create a new section
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'gradeLevel' => 'required|string',
            'teacher_id' => 'nullable|exists:teachers,id',
            'capacity' => 'required|integer|min:1',
        ]);

        $section = Section::create($validated);

        return response()->json([
            'message' => 'Section created successfully',
            'section' => $section->load('advisor')
        ], 201);
    }

    // Show a specific section with its schedule and students
    public function show($id)
    {
        // UPDATED: Added schedules.room and schedules.timeSlot
        $section = Section::with([
            'advisor', 
            'students', 
            'schedules.subject',
            'schedules.teacher',
            'schedules.room',      // Load Room details
            'schedules.timeSlot'   // Load Time Slot details
        ])
        ->withCount('students')
        ->findOrFail($id);
            
        return response()->json($section);
    }

    public function getRooms() {
    return response()->json(Room::all());
}

public function getTimeSlots() {
    return response()->json(TimeSlot::all());
}
}