<?php

namespace App\Http\Controllers;

use App\Models\EnrollmentRequirement;
use App\Models\Enrollment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class EnrollmentRequirementController extends Controller
{
    // GET /api/enrollments/{id}/requirements
    // Returns all uploaded requirements for an enrollment
    public function index($id)
{
    $enrollment = Enrollment::with('requirements')->findOrFail($id);

    $requirements = $enrollment->requirements->map(function ($req) {
        // Remove 'public/' prefix if it exists in the database string
        $cleanPath = ltrim(str_replace('public/', '', $req->file_path), '/');
        
        return [
            'id'            => $req->id,
            'type'          => $req->type,
            'type_label'    => $req->type_label,
            'original_name' => $req->original_name,
            'status'        => $req->status,
            'url'           => asset('storage/' . $cleanPath),
            'created_at'    => $req->created_at->format('M d, Y'),
        ];
    });

    return response()->json($requirements);
}

    // PATCH /api/requirements/{id}/status
    // Admin verifies or rejects a document
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