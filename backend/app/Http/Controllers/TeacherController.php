<?php

namespace App\Http\Controllers;

use App\Models\Teacher;
use App\Models\User;
use App\Models\SubjectAssignment;
use App\Models\Subject; 
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class TeacherController extends Controller
{
    // Get all teachers with their assignments
    public function index()
    {
        $teachers = Teacher::with([
            'assignments.subject',
            'assignments' => function($query) {
                $query->orderBy('gradeLevel');
            }
        ])->get();

        return response()->json($teachers);
    }

    // Create new teacher AND automatically create User account
    public function store(Request $request)
    {
        $validated = $request->validate([
            'firstName' => 'required|string',
            'lastName' => 'required|string',
            'email' => 'required|email|unique:teachers|unique:users',
            'specialization' => 'required|string',
            'advisory_grade' => 'nullable|string',
            'phone' => 'nullable|string',
            'status' => 'required|in:active,on_leave,resigned'
        ]);

        DB::beginTransaction();
        
        try {
            // Generate teacherId: TCH-2026-0001
            $year = date('Y');
            $count = Teacher::where('teacherId', 'like', "TCH-$year-%")->count() + 1;
            $validated['teacherId'] = 'TCH-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

            // 1. Create teacher record
            $teacher = Teacher::create($validated);
            
            // 2. Automatically create User account for login
            $user = User::create([
                'name' => $validated['firstName'] . ' ' . $validated['lastName'],
                'email' => $validated['email'], // Same email links them
                'password' => Hash::make('teacher123'), // Default password
                'role' => 'teacher'
            ]);

            DB::commit();
            
            return response()->json([
                'message' => 'Teacher created successfully! Login credentials created.',
                'teacher' => $teacher,
                'credentials' => [
                    'email' => $user->email,
                    'default_password' => 'teacher123',
                    'note' => 'Teacher can now login to Teacher Advisory Portal'
                ]
            ], 201);
            
        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'message' => 'Failed to create teacher',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Update teacher info AND sync User account
    public function update(Request $request, $id)
    {
        $teacher = Teacher::findOrFail($id);
        
        $validated = $request->validate([
            'firstName' => 'sometimes|string',
            'lastName' => 'sometimes|string',
            'email' => 'sometimes|email|unique:teachers,email,' . $id,
            'specialization' => 'sometimes|string',
            'advisory_grade' => 'nullable|string',
            'phone' => 'nullable|string',
            'status' => 'sometimes|in:active,on_leave,resigned'
        ]);

        DB::beginTransaction();
        
        try {
            // Get old email before update
            $oldEmail = $teacher->email;

            // Update teacher
            $teacher->update($validated);
            
            // Update corresponding User account (linked by email)
            $user = User::where('email', $oldEmail)->where('role', 'teacher')->first();
            
            if ($user) {
                $userUpdate = [];
                
                // Update name if firstName or lastName changed
                if (isset($validated['firstName']) || isset($validated['lastName'])) {
                    $userUpdate['name'] = ($validated['firstName'] ?? $teacher->firstName) . ' ' . 
                                         ($validated['lastName'] ?? $teacher->lastName);
                }
                
                // Update email if changed
                if (isset($validated['email'])) {
                    $userUpdate['email'] = $validated['email'];
                }
                
                if (!empty($userUpdate)) {
                    $user->update($userUpdate);
                }
            } else {
                // Create User if doesn't exist (for legacy teachers)
                User::create([
                    'name' => $teacher->firstName . ' ' . $teacher->lastName,
                    'email' => $teacher->email,
                    'password' => Hash::make('teacher123'),
                    'role' => 'teacher'
                ]);
            }

            DB::commit();
            
            return response()->json([
                'message' => 'Teacher updated successfully',
                'teacher' => $teacher->load('assignments.subject')
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'message' => 'Failed to update teacher',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Assign subject to teacher
    public function assignSubject(Request $request, $teacherId)
    {
        $validated = $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'gradeLevel' => 'required|string',
            'schedule' => 'nullable|string'
        ]);

        // Check if assignment already exists
        $exists = SubjectAssignment::where([
            'teacher_id' => $teacherId,
            'subject_id' => $validated['subject_id'],
            'gradeLevel' => $validated['gradeLevel']
        ])->exists();

        if ($exists) {
            return response()->json([
                'message' => 'This subject is already assigned to this teacher for this grade level'
            ], 400);
        }

        $assignment = SubjectAssignment::create([
            'teacher_id' => $teacherId,
            'subject_id' => $validated['subject_id'],
            'gradeLevel' => $validated['gradeLevel'],
            'schedule' => $validated['schedule'] ?? null
        ]);

        return response()->json([
            'message' => 'Subject assigned successfully',
            'assignment' => $assignment->load('subject')
        ], 201);
    }

    // Get teacher's assignments
    public function getAssignments($teacherId)
    {
        $assignments = SubjectAssignment::with('subject')
            ->where('teacher_id', $teacherId)
            ->orderBy('gradeLevel')
            ->get();

        return response()->json($assignments);
    }

    // Remove subject assignment
    public function removeAssignment($assignmentId)
    {
        $assignment = SubjectAssignment::findOrFail($assignmentId);
        $assignment->delete();

        return response()->json([
            'message' => 'Assignment removed successfully'
        ]);
    }

    public function getAvailableSubjects()
    {
        try {
            // Fetch all subjects so the admin can choose from them
            $subjects = Subject::orderBy('gradeLevel')
                ->orderBy('subjectName')
                ->get();

            return response()->json($subjects);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error fetching subjects'], 500);
        }
    }

    public function getAllAssignments()
    {
        // This matches the teacherLoad state in your React code
        $assignments = SubjectAssignment::with(['teacher', 'subject'])->get();
        return response()->json($assignments);
    }
}