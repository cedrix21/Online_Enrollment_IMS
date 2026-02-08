<?php

namespace App\Http\Controllers;

use App\Models\Teacher;
use App\Models\User;
use App\Models\Section;
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

    // Create new teacher, User account, AND Section (if advisory_grade is set)
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
                'email' => $validated['email'],
                'password' => Hash::make('teacher123'),
                'role' => 'teacher'
            ]);

            // 3. Automatically create Section if advisory_grade is set
            $section = null;
            if (!empty($validated['advisory_grade'])) {
                // Generate section name from teacher's last name
                $sectionName = $teacher->lastName . ' Section';
                
                $section = Section::create([
                    'name' => $sectionName,
                    'gradeLevel' => $validated['advisory_grade'],
                    'teacher_id' => $teacher->id,
                    'capacity' => 40, // Default capacity
                ]);
            }

            DB::commit();
            
            return response()->json([
                'message' => 'Teacher created successfully! ' . 
                             ($section ? 'Section created automatically.' : ''),
                'teacher' => $teacher,
                'section' => $section,
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

    // Update teacher info, sync User account, AND manage Section
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
            $oldEmail = $teacher->email;
            $oldAdvisoryGrade = $teacher->advisory_grade;

            // Update teacher
            $teacher->update($validated);
            
            // Update corresponding User account
            $user = User::where('email', $oldEmail)->where('role', 'teacher')->first();
            
            if ($user) {
                $userUpdate = [];
                
                if (isset($validated['firstName']) || isset($validated['lastName'])) {
                    $userUpdate['name'] = ($validated['firstName'] ?? $teacher->firstName) . ' ' . 
                                         ($validated['lastName'] ?? $teacher->lastName);
                }
                
                if (isset($validated['email'])) {
                    $userUpdate['email'] = $validated['email'];
                }
                
                if (!empty($userUpdate)) {
                    $user->update($userUpdate);
                }
            } else {
                User::create([
                    'name' => $teacher->firstName . ' ' . $teacher->lastName,
                    'email' => $teacher->email,
                    'password' => Hash::make('teacher123'),
                    'role' => 'teacher'
                ]);
            }

            // Handle Section creation/update if advisory_grade changed
            if (isset($validated['advisory_grade'])) {
                // Find existing section for this teacher
                $existingSection = Section::where('teacher_id', $teacher->id)->first();

                if ($validated['advisory_grade'] && empty($oldAdvisoryGrade)) {
                    // Teacher got advisory grade assigned - create section
                    if (!$existingSection) {
                        Section::create([
                            'name' => $teacher->lastName . ' Section',
                            'gradeLevel' => $validated['advisory_grade'],
                            'teacher_id' => $teacher->id,
                            'capacity' => 40,
                        ]);
                    }
                } elseif ($validated['advisory_grade'] && $oldAdvisoryGrade !== $validated['advisory_grade']) {
                    // Advisory grade changed - update section
                    if ($existingSection) {
                        $existingSection->update([
                            'gradeLevel' => $validated['advisory_grade']
                        ]);
                    } else {
                        Section::create([
                            'name' => $teacher->lastName . ' Section',
                            'gradeLevel' => $validated['advisory_grade'],
                            'teacher_id' => $teacher->id,
                            'capacity' => 40,
                        ]);
                    }
                } elseif (empty($validated['advisory_grade']) && $oldAdvisoryGrade) {
                    // Advisory grade removed - optionally delete section or unassign teacher
                    if ($existingSection) {
                        $existingSection->update(['teacher_id' => null]);
                    }
                }
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

    public function getAssignments($teacherId)
    {
        $assignments = SubjectAssignment::with('subject')
            ->where('teacher_id', $teacherId)
            ->orderBy('gradeLevel')
            ->get();

        return response()->json($assignments);
    }

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
        $assignments = SubjectAssignment::with(['teacher', 'subject'])->get();
        return response()->json($assignments);
    }
}