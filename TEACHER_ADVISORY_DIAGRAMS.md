# Teacher Advisory System - Visual Architecture & Flow Diagrams

## 1. USER FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                     TEACHER ADVISORY SYSTEM                     │
└─────────────────────────────────────────────────────────────────┘

                            ┌──────────┐
                            │  Teacher │
                            │  Login   │
                            └────┬─────┘
                                 │
                    ┌────────────────────────────┐
                    │  Enter Email & Password    │
                    └────────────┬───────────────┘
                                 │
                    ┌────────────────────────────┐
                    │  Submit POST /api/login    │
                    └────────────┬───────────────┘
                                 │
                    ┌────────────────────────────┐
                    │  Check User Role = 'teacher'
                    └────────────┬───────────────┘
                                 │
                    ┌────────────────────────────┐
                    │  Generate JWT Token        │
                    └────────────┬───────────────┘
                                 │
                    ┌────────────────────────────┐
                    │  Redirect to               │
                    │  /teacher-advisory         │
                    └────────────┬───────────────┘
                                 │
                ┌────────────────────────────────────────┐
                │   TEACHER ADVISORY PAGE LOADS          │
                ├────────────────────────────────────────┤
                │  1. Fetch Students (GET /teacher/students)
                │  2. Fetch Subjects (GET /teacher/subjects)
                │  3. Fetch Grades   (GET /teacher/grades)
                └────────────┬───────────────────────────┘
                             │
            ┌────────────────────────────────────┐
            │  Display Interactive Grade Table   │
            ├────────────────────────────────────┤
            │  ┌──────────────────────────────┐  │
            │  │ Students × Subjects Matrix   │  │
            │  │                              │  │
            │  │ Student  │ Math │ Eng │ Sci │  │
            │  │ ─────────┼──────┼─────┼─────│  │
            │  │ Juan     │ [85]▼│ [  ]│ [  ]│  │
            │  │ Maria    │ [  ]│ [92]│ [  ]│  │
            │  │ Pedro    │ [  ]│ [  ]│ [78]│  │
            │  │                              │  │
            │  └──────────────────────────────┘  │
            │                                    │
            │  [Save All Grades] Button          │
            └────────┬───────────────────────────┘
                     │
         ┌───────────────────────────┐
         │ Teacher Enters Grades    │
         │ and Clicks Save          │
         └───────────────┬───────────┘
                         │
        ┌────────────────────────────┐
        │ POST /api/teacher/grades   │
        │ {student_id, subject_id,   │
        │  score, remarks, quarter}  │
        └────────────┬───────────────┘
                     │
        ┌────────────────────────────┐
        │ Backend Validation:        │
        │ - Score: 0-100             │
        │ - Student exists           │
        │ - Subject exists           │
        │ - Teacher owns these       │
        └────────────┬───────────────┘
                     │
        ┌────────────────────────────┐
        │ Save Grade to Database     │
        │ INSERT/UPDATE grades table │
        └────────────┬───────────────┘
                     │
        ┌────────────────────────────┐
        │ Return Success Message     │
        │ with Grade Details         │
        └────────────┬───────────────┘
                     │
        ┌────────────────────────────┐
        │ Show Success Toast         │
        │ "Grade saved successfully" │
        └─────────────────────────────┘
```

---

## 2. DATABASE RELATIONSHIP DIAGRAM

```
┌──────────────┐         ┌──────────────┐
│    USERS     │         │   TEACHERS   │
├──────────────┤         ├──────────────┤
│ id (PK)      │         │ id (PK)      │
│ name         │         │ teacherId    │
│ email        │         │ firstName    │
│ password     │         │ lastName     │
│ role         │         │ email        │◄────┐
│ created_at   │         │ advisory_grade
│ updated_at   │         │ specialization
└──────────────┘         │ phone        │
                         │ status       │
                         └──────────────┘
                             ▲
                             │ 1:1
                             │
                ┌────────────────────────────┐
                │ User.role = 'teacher'      │
                │ User.email = Teacher.email │
                └────────────────────────────┘


    ┌──────────────┐         ┌──────────────┐
    │  SUBJECTS    │         │   TEACHERS   │
    ├──────────────┤         ├──────────────┤
    │ id (PK)      │         │ id (PK)      │
    │ subjectCode  │         │ ...          │
    │ subjectName  │         └──────────────┘
    │ gradeLevel   │             ▲
    │ teacher_id ──┼─────────────┘ 1:N
    │ created_at   │         (Teacher has
    │ updated_at   │          many Subjects)
    └──────────────┘


    ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
    │  STUDENTS    │         │   GRADES     │         │   SUBJECTS   │
    ├──────────────┤         ├──────────────┤         ├──────────────┤
    │ id (PK)      │         │ id (PK)      │         │ id (PK)      │
    │ studentId    │         │ teacher_id ──┼────────►│ ...          │
    │ firstName    │         │ student_id ──┼───┐     └──────────────┘
    │ lastName     │         │ subject_id ───┤   │
    │ email        │         │ score        │   │
    │ gradeLevel   │◄────────┼─ remarks     │   │
    │ section_id   │         │ quarter      │   │
    │ status       │         │ created_at   │   │
    │ created_at   │         │ updated_at   │   │
    │ updated_at   │         └──────────────┘   │
    └──────────────┘             ▲              │
         1▲                       │              │
          │                 1:N   │              │
          │           (Teacher has many Grades) │
          │                       │              │
          └───────────────────────┴──────────────┘
                1:N (Student has many Grades)


┌─────────────────────────────────────────────────────────────┐
│                    GRADES TABLE                             │
├─────────────────────────────────────────────────────────────┤
│ id: BIGINT PRIMARY KEY AUTO_INCREMENT                       │
│                                                             │
│ teacher_id: BIGINT (FK → teachers.id)                       │
│   └─ Which teacher entered this grade                       │
│                                                             │
│ student_id: BIGINT (FK → students.id)                       │
│   └─ Which student received this grade                      │
│                                                             │
│ subject_id: BIGINT (FK → subjects.id)                       │
│   └─ Which subject this grade is for                        │
│                                                             │
│ score: DECIMAL(5,2) NULL                                    │
│   └─ Grade value 0-100 (e.g., 85.50)                        │
│                                                             │
│ remarks: VARCHAR(255) NULL                                  │
│   └─ Optional comments (e.g., "Good performance")           │
│                                                             │
│ quarter: VARCHAR(3) DEFAULT 'Q1'                            │
│   └─ Q1, Q2, Q3, or Q4                                      │
│                                                             │
│ created_at: TIMESTAMP                                       │
│ updated_at: TIMESTAMP                                       │
│                                                             │
│ UNIQUE CONSTRAINT: (teacher_id, student_id, subject_id, quarter)
│   └─ Prevents duplicate grades for same parameters         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. API ROUTE STRUCTURE

```
API BASE: /api

┌─ PUBLIC ROUTES (No Auth Required)
│
├─ POST /login
│   ├─ Input: { email, password }
│   └─ Output: { access_token, user }
│
└─ POST /enrollment/submit


┌─ PROTECTED ROUTES (auth:sanctum middleware)
│
├─ POST /logout
├─ GET /user
├─ GET /students
├─ GET /teachers
├─ POST /teachers
├─ GET /subjects
├─ GET /sections
├─ POST /sections
├─ GET /schedules
│
│
├─ TEACHER ONLY (RoleMiddleware: 'teacher')
│  │
│  ├─ GET /teacher/students
│  │   └─ Returns: Array of students with gradeLevel = teacher.advisory_grade
│  │
│  ├─ GET /teacher/subjects
│  │   └─ Returns: Array of subjects where teacher_id = auth.teacher.id
│  │
│  ├─ GET /teacher/grades
│  │   └─ Returns: Array of all grades for this teacher
│  │
│  ├─ POST /teacher/grades
│  │   ├─ Input: { student_id, subject_id, score, remarks, quarter }
│  │   └─ Creates/Updates grade record
│  │
│  └─ GET /teacher/grades/subject/{subjectId}
│      └─ Returns: Grades filtered by subject
│
│
└─ ADMIN/REGISTRAR ONLY (RoleMiddleware: 'admin,registrar')
   │
   ├─ GET /enrollments
   ├─ GET /enrollments/summary
   ├─ PUT /enrollment/{id}/status
   └─ POST /admin/enroll-student
```

---

## 4. COMPONENT HIERARCHY

```
App.js (Router Setup)
│
├─ <Routes>
│  │
│  ├─ /login → Login.js
│  │           ├─ Email Input
│  │           ├─ Password Input
│  │           └─ Login Button
│  │
│  └─ /teacher-advisory → <ProtectedRoute roles=["teacher"]>
│                         │
│                         └─ TeacherAdvisory.js
│                            ├─ Header
│                            │  ├─ Title
│                            │  └─ Subtitle
│                            │
│                            ├─ Quarter Selector
│                            │  └─ Dropdown (Q1, Q2, Q3, Q4)
│                            │
│                            ├─ Error/Success Alerts
│                            │  ├─ Error Message
│                            │  └─ Success Message
│                            │
│                            ├─ Grades Table
│                            │  ├─ Table Header
│                            │  │  ├─ Student ID
│                            │  │  ├─ Student Name
│                            │  │  ├─ Section
│                            │  │  └─ Subject Columns
│                            │  │
│                            │  └─ Table Body (for each student)
│                            │     ├─ Student ID
│                            │     ├─ Student Name
│                            │     ├─ Section Name
│                            │     └─ Grade Inputs (for each subject)
│                            │        ├─ Score Input Field
│                            │        └─ Save Button (✓)
│                            │
│                            └─ Action Buttons
│                               └─ Save All Grades Button
```

---

## 5. DATA FLOW DIAGRAM

```
FRONTEND (React)                    BACKEND (Laravel)              DATABASE
────────────────                    ────────────────               ────────

                    LOGIN FLOW
┌──────────────┐    
│ Login Form   │
│ email        │───POST─────────┐
│ password     │                │ AuthController
└──────────────┘                │ ::login()
                                │
                                ├─ Check credentials
                                │
                                ├─ Generate JWT Token
                                ▼
                        ┌────────────────┐
                        │ Return Token   │
                        │ + User Object  │
                        └────┬───────────┘
                             │◄─────────────────────────────────┐
                             │                                   │
                    ┌────────────────────────┐                   │
                    │ Store in localStorage: │                   │
                    │ - token                │                   │
                    │ - user                 │                   │
                    └────────┬───────────────┘                   │
                             │ Redirect to role URL             │
                             │                                   │
                ┌────────────────────────────────────────────────┘
                │
            If user.role === 'teacher'
                │
                ▼
        ┌──────────────────────┐
        │ Navigate to:         │
        │ /teacher-advisory    │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────────────────────────┐
        │ TeacherAdvisory Component Loads          │
        │ useEffect() Fires                        │
        └──────────┬───────────────────────────────┘
                   │
        ┌──────────┴──────────┬──────────┐
        │                     │          │
        ▼                     ▼          ▼
    GET /teacher/students  GET /teacher/subjects  GET /teacher/grades
        │                     │          │
        │              GradeController  │
        │              ::getTeachers    │
        │              Students()       │
        │                     │          │
        │         ┌───────────┤          │
        │         │           │          │
        ├─────────┤           │          │
        │         │           │          │
        ▼         ▼           ▼          ▼
    Database Query Results Returned to Frontend
    │         │           │          │
    │         │           │          └──────────────┐
    │         │           └──────────────┐         │
    │         └──────────────┐           │         │
    │                        │           │         │
    └────────────────────────┴───────────┴─────────┘
                             │
                    ┌────────▼──────────┐
                    │ setState() calls: │
                    │ - setStudents()   │
                    │ - setSubjects()   │
                    │ - setGrades()     │
                    └────────┬──────────┘
                             │
                    ┌────────▼──────────────────┐
                    │ Component Re-renders      │
                    │ with Table Populated      │
                    └────────┬──────────────────┘
                             │
                             ▼
                    ┌────────────────────┐
                    │ TEACHER ENTERS     │
                    │ GRADES             │
                    └────────┬───────────┘
                             │
                ┌────────────────────────────┐
                │ User clicks Save or        │
                │ Save All Grades button     │
                └────────┬───────────────────┘
                         │
                ┌────────▼───────────────────┐
                │ POST /teacher/grades       │
                │ {student_id, subject_id,   │
                │  score, remarks, quarter}  │
                └────────┬───────────────────┘
                         │
                         │ GradeController
                         │ ::submitGrade()
                         │
                    ┌────┴──────────────────┐
                    │                       │
                    ▼                       ▼
                Validation         Check Authorization
                - Score 0-100      - Teacher ownership
                - Student exists   - Student in advisory
                - Subject exists   - Subject assigned
                                    │
                                    └──────┬───────┐
                                           │       │
                    Valid                  │       Invalid
                    │                      │       │
                    ▼                      │       ▼
            INSERT/UPDATE                 │   Return 422/403
            grades table                  │   Error Message
            │                             │
            └────────┬────────────────────┘
                     │
                     ▼
            Return Success Response
            {message, grade}
                     │
                     ▼
            Frontend Receives Response
            │
            ├─ Update state
            ├─ Show success message
            └─ Re-fetch grades
```

---

## 6. STATE MANAGEMENT FLOW

```
TeacherAdvisory Component State:

┌─ students: Array
│  ├─ Populated from: GET /teacher/students
│  ├─ Used for: Table row display
│  └─ Updated when: Component mounts, after grade save
│
├─ subjects: Array
│  ├─ Populated from: GET /teacher/subjects
│  ├─ Used for: Table header columns
│  └─ Updated when: Component mounts, after grade save
│
├─ grades: Object
│  ├─ Structure: {
│  │   "studentId-subjectId-quarter": {
│  │     score: "85.5",
│  │     remarks: "Good"
│  │   }
│  │ }
│  ├─ Updated when: User types in input, grade saved
│  └─ Used for: Form input values, grade submission
│
├─ loading: Boolean
│  ├─ true: Fetching data
│  ├─ false: Data ready
│  └─ Used for: Show/hide loading spinner
│
├─ error: String
│  ├─ Contains error message if any
│  ├─ Cleared on: Component mount, new login
│  └─ Used for: Display error alert
│
├─ success: String
│  ├─ Contains success message
│  ├─ Auto-clears: After 3 seconds
│  └─ Used for: Display success alert
│
└─ selectedQuarter: String
   ├─ Default: "Q1"
   ├─ Options: "Q1", "Q2", "Q3", "Q4"
   ├─ Changed when: User selects different quarter
   └─ Used for: Grade key construction
```

---

## 7. SECURITY FLOW

```
REQUEST FLOW WITH SECURITY CHECKS:

1. Client sends request with JWT Token in header
   │
   │ Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
   │
   ▼
2. Laravel receives request
   │
   ▼
3. auth:sanctum Middleware
   ├─ Validates JWT token signature
   ├─ Checks token expiration
   └─ Verifies user exists
      │ Invalid/Expired ──► 401 Unauthorized
      │ Valid ──────────┐
      │                 ▼
      │         Get authenticated user
      │         from database
      │
      └─────────────────┬──────────────────┐
                        │                  │
                        ▼                  ▼
                   RoleMiddleware      Continue to
                   Check:              Controller
                   ├─ user.role exists
                   ├─ role in allowed list
                   │  (e.g., 'teacher')
                   │
                   Invalid ──────► 403 Forbidden
                   Valid ─────────────────┐
                                          │
                                          ▼
                                  GradeController
                                  ::submitGrade()
                                  │
                                  ├─ Validate input
                                  │  ├─ score 0-100
                                  │  ├─ student exists
                                  │  └─ subject exists
                                  │
                                  ├─ Verify ownership
                                  │  └─ teacher_id matches
                                  │     auth user's teacher
                                  │
                                  └─ Save to database
                                     ├─ INSERT (new)
                                     └─ UPDATE (existing)
```

---

This visual documentation should help developers and stakeholders understand the complete architecture and data flow of the Teacher Advisory system.
