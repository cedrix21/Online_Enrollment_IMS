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
    public function index(Request $request)
{
    $schoolYear = $request->input('school_year', $this->getCurrentSchoolYear());

    $teachers = Teacher::with([
        'assignments' => function ($query) use ($schoolYear) {
            $query->where('school_year', $schoolYear)
                  ->orderBy('gradeLevel');
        },
        'assignments.subject',
        'advisorySection'
    ])->get();

    return response()->json($teachers);
}

private function getCurrentSchoolYear(): string
{
    // return '2026-2027';
    $month = (int) date('n');
    $year  = (int) date('Y');
    return ($month >= 6) ? "{$year}-" . ($year + 1) : ($year - 1) . "-{$year}";
}


    // Create new teacher, User account, AND Section (if advisory_grade is set)
    public function store(Request $request)
{
    $validated = $request->validate([
        'firstName'      => 'required|string',
        'lastName'       => 'required|string',
        'email'          => 'required|email|unique:teachers|unique:users',
        'specialization' => 'required|string',
        'section_id'     => 'nullable|exists:sections,id',   // 🆕 changed
        'phone'          => 'nullable|string',
        'status'         => 'required|in:active,on_leave,resigned'
    ]);

    DB::beginTransaction();
    
    try {
        // Generate teacherId
        $year = date('Y');
        $count = Teacher::where('teacherId', 'like', "TCH-$year-%")->count() + 1;
        $validated['teacherId'] = 'TCH-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

        // 1. Create teacher record (without advisory_grade yet)
        $teacherData = collect($validated)->except('section_id')->toArray();
        $teacher = Teacher::create($teacherData);
        
        // 2. Create User account
        $user = User::create([
            'name'     => $validated['firstName'] . ' ' . $validated['lastName'],
            'email'    => $validated['email'],
            'password' => Hash::make('teacher123'),
            'role'     => 'teacher'
        ]);

        // 3. Assign section if provided
        $section = null;
        // Get school year from request or default
        $schoolYear = $request->input('school_year', $this->getCurrentSchoolYear());

        if (!empty($validated['section_id'])) {
            // ✅ Scope query to school_year
            $section = Section::where('id', $validated['section_id'])
                ->where('school_year', $schoolYear)
                ->firstOrFail();  // throws 404 if section exists but in different year
            $section->teacher_id = $teacher->id;
            $section->save();
            
            // Sync advisory_grade from section
            $teacher->update(['advisory_grade' => $section->gradeLevel]);
        }

        DB::commit();
        
        return response()->json([
            'message' => 'Teacher created successfully! ' . 
                         ($section ? "Assigned to section {$section->name}." : ''),
            'teacher' => $teacher->load('advisorySection'),
            'section' => $section,
            'credentials' => [
                'email'           => $user->email,
                'default_password' => 'teacher123',
                'note'            => 'Teacher can now login to Teacher Advisory Portal'
            ]
        ], 201);
        
    } catch (\Exception $e) {
        DB::rollBack();
        return response()->json([
            'message' => 'Failed to create teacher',
            'error'   => $e->getMessage()
        ], 500);
    }
}

    // Update teacher info, sync User account, AND manage Section
    public function update(Request $request, $id)
{
    $teacher = Teacher::findOrFail($id);
    
    $validated = $request->validate([
        'firstName'      => 'sometimes|string',
        'lastName'       => 'sometimes|string',
        'email'          => 'sometimes|email|unique:teachers,email,' . $id,
        'specialization' => 'sometimes|string',
        'section_id'     => 'nullable|exists:sections,id',   // 🆕 changed
        'phone'          => 'nullable|string',
        'status'         => 'sometimes|in:active,on_leave,resigned'
    ]);

    DB::beginTransaction();
    
    try {
        $oldEmail = $teacher->email;

        // Update teacher basic info (exclude section_id)
        $teacherData = collect($validated)->except('section_id')->toArray();
        $teacher->update($teacherData);
        
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
                'name'     => $teacher->firstName . ' ' . $teacher->lastName,
                'email'    => $teacher->email,
                'password' => Hash::make('teacher123'),
                'role'     => 'teacher'
            ]);
        }

        // Handle section reassignment
        if ($request->has('section_id')) {
            $newSectionId = $validated['section_id'];
            $schoolYear = $request->input('school_year', $this->getCurrentSchoolYear()); // ✅ get year
            
            // Remove teacher from old section (only if that section belongs to the same school year)
            $oldSection = Section::where('teacher_id', $teacher->id)
                ->where('school_year', $schoolYear)   // ✅ added scope
                ->first();
            if ($oldSection) {
                $oldSection->teacher_id = null;
                $oldSection->save();
            }
            
            if ($newSectionId) {
                // ✅ scope to school_year
                $newSection = Section::where('id', $newSectionId)
                    ->where('school_year', $schoolYear)
                    ->firstOrFail();
                $newSection->teacher_id = $teacher->id;
                $newSection->save();
                $teacher->advisory_grade = $newSection->gradeLevel;
            } else {
                $teacher->advisory_grade = null;
            }
            $teacher->save();
        }

        DB::commit();
        
        return response()->json([
            'message' => 'Teacher updated successfully',
            'teacher' => $teacher->load(['assignments.subject', 'advisorySection'])
        ]);
        
    } catch (\Exception $e) {
        DB::rollBack();
        return response()->json([
            'message' => 'Failed to update teacher',
            'error'   => $e->getMessage()
        ], 500);
    }
}

    // Assign subject to teacher
    public function assignSubject(Request $request, $teacherId)
    {
        $validated = $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'gradeLevel' => 'required|string',
            'schedule' => 'nullable|string',
            'school_year'  => 'nullable|string',
        ]);

        $schoolYear = $validated['school_year'] ?? $this->getCurrentSchoolYear();

        $exists = SubjectAssignment::where([
            'teacher_id' => $teacherId,
            'subject_id' => $validated['subject_id'],
            'gradeLevel' => $validated['gradeLevel'],
            'school_year' => $schoolYear,
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
            'schedule' => $validated['schedule'] ?? null,
            'school_year' => $schoolYear,
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

    public function getAllAssignments(Request $request)
{
    $schoolYear = $request->input('school_year', $this->getCurrentSchoolYear());

    $assignments = SubjectAssignment::with(['teacher', 'subject'])
        ->where('school_year', $schoolYear)
        ->get();

    return response()->json($assignments);
}
}