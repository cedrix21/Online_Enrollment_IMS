<?php

namespace App\Http\Controllers;

use App\Models\TimeSlot;
use Illuminate\Http\Request;

class TimeSlotController extends Controller
{
    public function index()
    {
        return response()->json(TimeSlot::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'start_time' => 'required|date_format:H:i',
            'end_time'   => 'required|date_format:H:i|after:start_time',
        ]);

        $slot = TimeSlot::firstOrCreate(
            [
                'start_time' => $validated['start_time'],
                'end_time'   => $validated['end_time'],
            ],
            [
                'display_label' => "{$validated['start_time']} - {$validated['end_time']}",
            ]
        );

        return response()->json($slot, 201);
    }
}