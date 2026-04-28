<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Spatie\Activitylog\Facades\Activity;

class ActivityLogController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'action' => 'required|string',
            'metadata' => 'nullable|array',
        ]);

        if (!Auth::check()) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        activity()
            ->causedBy(Auth::user())
            ->withProperties([
                ...$validated['metadata'] ?? [],
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ])
            ->log($validated['action']);

        return response()->json(['message' => 'Activity logged successfully.']);
    }
}