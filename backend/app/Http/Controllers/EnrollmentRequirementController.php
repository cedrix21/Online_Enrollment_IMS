<?php

namespace App\Http\Controllers;

use App\Models\EnrollmentRequirement;
use Illuminate\Http\Request;

class EnrollmentRequirementController extends Controller
{
    // GET /api/enrollments/{id}/requirements
    public function index($id)
    {
        $requirements = EnrollmentRequirement::where('enrollment_id', $id)->get();

        foreach ($requirements as $req) {
            $cleanPath = ltrim(str_replace('public/', '', $req->file_path), '/');
            $req->url = asset('storage/' . $cleanPath);
        }

        return response()->json($requirements);
    }

    // PATCH /api/requirements/{id}/status
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,verified,rejected',
        ]);

        $requirement = EnrollmentRequirement::findOrFail($id);
        $requirement->update(['status' => $request->status]);

        return response()->json([
            'message' => 'Status updated successfully',
            'requirement' => $requirement,
        ]);
    }
}