<?php

namespace App\Http\Controllers;

use App\Models\Schedule;
use App\Models\Subject;
use App\Models\Room;
use App\Models\TimeSlot;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use SebastianBergmann\Environment\Console;
use Illuminate\Support\Facades\Log;


class ScheduleController extends Controller
{
    public function index() {
        return response()->json(Schedule::with(['subject', 'teacher', 'room', 'time_slot'])->get());
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'section_id'   => 'required|exists:sections,id',
                'subject_id'   => 'required|exists:subjects,id',
                'teacher_id'   => 'required|exists:teachers,id',
                'days'         => 'required|array', // Expecting array from React
                'time_slot_id' => 'required|exists:time_slots,id',
                'room_id'      => 'required|exists:rooms,id',
            ]);

            $timeSlotId = $request->time_slot_id;
            $roomId = $request->room_id;
            $teacherId = $request->teacher_id;
            $sectionId = $request->section_id;

            // Use a transaction to ensure atomic operations
            return DB::transaction(function () use ($validated, $request, $timeSlotId, $roomId, $teacherId, $sectionId) {
                $createdSchedules = [];

                foreach ($request->days as $day) {
                    // Check A: Room Conflict
                    $roomConflict = Schedule::where('day', $day)
                        ->where('time_slot_id', $timeSlotId)
                        ->where('room_id', $roomId)
                        ->exists();
                    if ($roomConflict) {
                        return response()->json(['message' => "Room conflict on $day."], 422);
                    }

                    // Check B: Teacher Conflict
                    $teacherConflict = Schedule::where('day', $day)
                        ->where('time_slot_id', $timeSlotId)
                        ->where('teacher_id', $teacherId)
                        ->exists();
                    if ($teacherConflict) {
                        $teacher = Teacher::find($teacherId);
                        return response()->json(['message' => "Teacher {$teacher->lastName} is busy on $day."], 422);
                    }

                    // Check C: Section Conflict
                    $sectionConflict = Schedule::where('day', $day)
                        ->where('time_slot_id', $timeSlotId)
                        ->where('section_id', $sectionId)
                        ->exists();
                    if ($sectionConflict) {
                        return response()->json(['message' => "Section already has a class on $day at this time."], 422);
                    }

                    // Check D: Subject already scheduled for this section ON THIS DAY
                    $subjectExists = Schedule::where('section_id', $sectionId)
                        ->where('subject_id', $request->subject_id)
                        ->where('day', $day)
                        ->exists();
                    if ($subjectExists) {
                        return response()->json(['message' => "This subject is already scheduled for this section on $day."], 422);
                    }

                    // Create the record for this specific day
                    $createdSchedules[] = Schedule::create([
                        'section_id'   => $sectionId,
                        'subject_id'   => $request->subject_id,
                        'teacher_id'   => $teacherId,
                        'day'          => $day,
                        'time_slot_id' => $timeSlotId,
                        'room_id'      => $roomId,
                    ]);
                }

                return response()->json([
                    'message' => 'Schedules created successfully!',
                    'data' => $createdSchedules
                ], 201);
            });

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Server Error: ' . $e->getMessage()], 500);
        }
    }

  public function destroy(Request $request, $id)
{
    try {
        // Check if the request is trying to delete multiple IDs
        // or just the single ID from the URL
        $idsToDelete = $request->input('ids', [$id]);

        $deletedCount = Schedule::whereIn('id', $idsToDelete)->delete();

        if ($deletedCount === 0) {
            return response()->json([
                'message' => 'No schedules found to delete.'
            ], 404);
        }

        return response()->json([
            'message' => "Successfully removed $deletedCount schedule slots.",
            'deleted_ids' => $idsToDelete
        ], 200);

    } catch (\Exception $e) {
        // Log the actual error for debugging
        Log::error("Schedule Delete Error: " . $e->getMessage());
        
        return response()->json([
            'message' => 'Error deleting schedule',
            'error' => $e->getMessage()
        ], 500);
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