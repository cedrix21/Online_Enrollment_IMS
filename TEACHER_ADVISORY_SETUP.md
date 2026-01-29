# Teacher Advisory & Grade Evaluation System

## Overview
This feature enables teachers to log in with their own credentials and input grades for their students through an intuitive advisory page.

## What Was Created

### Backend Changes

#### 1. **Grade Model** (`app/Models/Grade.php`)
- Added relationships to Teacher, Student, and Subject models
- Fields: teacher_id, student_id, subject_id, score, remarks, quarter
- Allows storing grades with quarterly tracking

#### 2. **GradeController** (`app/Http/Controllers/GradeController.php`)
New endpoints for teachers:
- `getTeacherStudents()` - Fetch all students in teacher's advisory class
- `getTeacherSubjects()` - Get subjects assigned to the teacher
- `getGrades()` - Retrieve all grades submitted by the teacher
- `submitGrade()` - Create or update a grade for a student
- `getSubjectGrades()` - Get all grades for a specific subject

#### 3. **Database Migration** (`database/migrations/2026_01_29_120000_create_grades_table.php`)
Creates the `grades` table with:
- Foreign keys to teachers, students, and subjects
- Quarter tracking (Q1, Q2, Q3, Q4)
- Unique constraint to prevent duplicate entries

#### 4. **API Routes** (routes/api.php)
Added teacher-specific routes under `/teacher` prefix:
- GET `/teacher/students` - Get advisory students
- GET `/teacher/subjects` - Get assigned subjects
- GET `/teacher/grades` - Get all grades
- POST `/teacher/grades` - Submit/update a grade
- GET `/teacher/grades/subject/{subjectId}` - Get grades by subject

#### 5. **User Model Update** (`app/Models/User.php`)
- Added `teacher()` relationship to link User with Teacher model via email

### Frontend Changes

#### 1. **TeacherAdvisory Component** (`frontend/src/pages/TeacherAdvisory.js`)
Features:
- Displays all students in teacher's advisory class in a table
- Shows subjects assigned to the teacher
- Quarter selector (Q1, Q2, Q3, Q4)
- Grade input fields for each student-subject combination
- Individual save buttons for each grade
- Bulk save all grades button
- Real-time error and success messages
- Loading states

#### 2. **TeacherAdvisory Styles** (`frontend/src/pages/TeacherAdvisory.css`)
- Modern gradient design matching the application theme
- Responsive table layout
- Mobile-friendly interface
- Smooth animations and transitions

#### 3. **App.js Update**
- Added TeacherAdvisory import
- Added protected route: `/teacher-advisory`
- Role-based access control (teacher role only)

#### 4. **Login.js Update**
- Modified to redirect based on user role:
  - Teachers → `/teacher-advisory`
  - Admins/Registrars → `/dashboard`

## How to Set Up

### 1. Run Database Migration
```bash
cd backend
php artisan migrate
```

### 2. Create Teacher User Accounts
Teachers need a User account with `role = 'teacher'`. You can create them via:

**Option A: Database Seed**
```php
// In database/seeders/DatabaseSeeder.php
$user = User::create([
    'name' => 'John Doe',
    'email' => 'john.doe@school.com',
    'password' => bcrypt('password123'),
    'role' => 'teacher'
]);

// Create corresponding Teacher record
Teacher::create([
    'teacherId' => 'TCH-2026-001',
    'firstName' => 'John',
    'lastName' => 'Doe',
    'email' => 'john.doe@school.com',
    'specialization' => 'Mathematics',
    'advisory_grade' => 'Grade 7',
    'phone' => '1234567890',
    'status' => 'active'
]);
```

**Option B: Admin Panel**
Create users through your existing admin enrollment interface with role set to 'teacher'

### 3. Assign Students to Teacher's Advisory Class
Ensure students have their `gradeLevel` matching the teacher's `advisory_grade`:
```php
// Example: Teacher with advisory_grade = 'Grade 7'
// Students with gradeLevel = 'Grade 7' will appear on their advisory page
```

### 4. Assign Subjects to Teacher
Use the Subject model to assign subjects with the teacher's ID:
```php
Subject::create([
    'subjectCode' => 'MATH-7',
    'subjectName' => 'Mathematics 7',
    'gradeLevel' => 'Grade 7',
    'teacher_id' => $teacher->id
]);
```

## How Teachers Use It

### Login
1. Go to login page
2. Enter teacher email and password
3. System automatically redirects to `/teacher-advisory`

### Input Grades
1. Select the quarter (Q1, Q2, Q3, Q4)
2. Find the student in the table
3. Enter the grade score (0-100) for each subject
4. Click the ✓ button to save individual grades
5. Or click "Save All Grades" to save all entries at once

### View Existing Grades
- All previously saved grades are automatically loaded
- Grades persist across sessions
- Can be updated anytime by entering new scores

## API Response Examples

### Get Students
```json
GET /api/teacher/students
[
  {
    "id": 1,
    "studentId": "STU-2026-001",
    "firstName": "Maria",
    "lastName": "Garcia",
    "email": "maria@school.com",
    "gradeLevel": "Grade 7",
    "section": {
      "id": 1,
      "sectionName": "7-A"
    }
  }
]
```

### Submit Grade
```json
POST /api/teacher/grades
{
  "student_id": 1,
  "subject_id": 2,
  "score": 85.5,
  "remarks": "Good performance",
  "quarter": "Q1"
}

Response:
{
  "message": "Grade saved successfully",
  "grade": {
    "id": 1,
    "teacher_id": 1,
    "student_id": 1,
    "subject_id": 2,
    "score": 85.5,
    "remarks": "Good performance",
    "quarter": "Q1"
  }
}
```

## Key Features

✅ **Role-Based Authentication** - Only users with 'teacher' role can access  
✅ **Auto-Redirect** - Teachers automatically go to advisory page after login  
✅ **Responsive Design** - Works on mobile, tablet, and desktop  
✅ **Quarterly Tracking** - Support for Q1, Q2, Q3, Q4 grading periods  
✅ **Individual & Bulk Save** - Save grades one at a time or all at once  
✅ **Data Persistence** - All grades are stored in the database  
✅ **Real-time Feedback** - Success and error messages  
✅ **Input Validation** - Ensures valid score ranges (0-100)  

## Security

- Protected routes require authentication (`auth:sanctum` middleware)
- Teachers can only see their own advisory students
- Teachers can only access their assigned subjects
- Role middleware ensures only teachers access teacher endpoints
- Grade submissions are validated on backend

## Troubleshooting

**Teachers not appearing on advisory page:**
- Verify teacher's `advisory_grade` matches student's `gradeLevel`
- Check that students exist in the database

**Subjects not showing:**
- Ensure subjects have the teacher's `teacher_id` assigned
- Verify subject `gradeLevel` matches the advisory class

**Login redirection not working:**
- Check that user role is set to 'teacher' (lowercase)
- Clear browser cache and localStorage
- Verify token is being stored correctly

**Grades not saving:**
- Check network tab in browser DevTools
- Verify score is between 0-100
- Ensure student and subject IDs are correct
- Check server logs for validation errors

## Future Enhancements

- Add grade distribution charts
- Export grades to PDF/Excel
- Set up grade templates
- Parent notification emails
- Grade statistics and analytics
- Comments and feedback per student
