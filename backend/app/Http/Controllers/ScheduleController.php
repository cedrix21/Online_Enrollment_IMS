<?php

namespace App\Http\Controllers;

use App\Models\Schedule;
use App\Models\Subject;
use App\Models\Room;
use App\Models\TimeSlot;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    public function index() {
        // Return all schedules for conflict checking in React
        return response()->json(Schedule::all());
    }

    public function store(Request $request)
    {
        try {
            // 1. Validate inputs (We strictly use IDs now)
            $validated = $request->validate([
                'section_id'   => 'required|exists:sections,id',
                'subject_id'   => 'required|exists:subjects,id',
                'day'          => 'required|string',
                'time_slot_id' => 'required|exists:time_slots,id',  
                'room_id'      => 'required|exists:rooms,id',
            ]);

            // 2. Look up the subject to find the assigned teacher
            $subject = Subject::findOrFail($request->subject_id);

            // Safety check: Subject must have a teacher
            if (is_null($subject->teacher_id)) {
                return response()->json([
                    'message' => "Subject '{$subject->subjectName}' has no teacher assigned. Go to Subject Management and assign a teacher first."
                ], 422);
            }

            $teacherId = $subject->teacher_id;
            $day = $request->day;
            $timeSlotId = $request->time_slot_id;
            $roomId = $request->room_id;
            $sectionId = $request->section_id;

            // 3. SIMPLIFIED CONFLICT LOGIC (ID-Based)
            
            // Check A: Is the Room already booked at this time?
            $roomConflict = Schedule::where('day', $day)
                ->where('time_slot_id', $timeSlotId)
                ->where('room_id', $roomId)
                ->exists();

            if ($roomConflict) {
                return response()->json(['message' => "Conflict: The selected Room is already occupied at this time."], 422);
            }

            // Check B: Is the Teacher already teaching at this time?
            $teacherConflict = Schedule::where('day', $day)
                ->where('time_slot_id', $timeSlotId)
                ->where('teacher_id', $teacherId)
                ->exists();

            if ($teacherConflict) {
                return response()->json(['message' => "Conflict: Teacher {$subject->teacher->lastName} is already teaching another class at this time."], 422);
            }

            // Check C: Is the Section already busy at this time?
            $sectionConflict = Schedule::where('day', $day)
                ->where('time_slot_id', $timeSlotId)
                ->where('section_id', $sectionId)
                ->exists();

            if ($sectionConflict) {
                return response()->json(['message' => "Conflict: This Section already has a class scheduled at this time."], 422);
            }

            // 4. Create the schedule if clear
            $validated['teacher_id'] = $teacherId; // Inject the teacher ID found from the subject
            
            $schedule = Schedule::create($validated);
            
            return response()->json([
                'message' => 'Schedule created successfully!', 
                'data' => $schedule
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Server Error: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $schedule = Schedule::findOrFail($id);
            $schedule->delete();
            return response()->json(['message' => 'Schedule removed successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error deleting schedule'], 500);
        }
    }

    public function getAvailableResources(Request $request) 
    {
        $day = $request->day; 

        return response()->json([
            'rooms' => Room::all(),
            'timeSlots' => TimeSlot::all(),
            'occupied' => Schedule::where('day', $day)->get(['room_id', 'time_slot_id'])
        ]);
    }
}