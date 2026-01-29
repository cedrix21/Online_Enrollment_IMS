# Teacher Advisory System - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Run Database Migration
```bash
cd backend
php artisan migrate
```

### Step 2: Create a Teacher Account (Choose One)

**Option A: Using SQL (Recommended for quick testing)**
```sql
-- 1. Add teacher user
INSERT INTO users (name, email, password, role, created_at, updated_at) 
VALUES ('Ms. Maria Santos', 'maria.santos@school.com', '$2y$12$...', 'teacher', NOW(), NOW());

-- 2. Add teacher profile
INSERT INTO teachers (teacherId, firstName, lastName, email, specialization, advisory_grade, phone, status, created_at, updated_at) 
VALUES ('TCH-2026-001', 'Maria', 'Santos', 'maria.santos@school.com', 'Mathematics', 'Grade 7', '09123456789', 'active', NOW(), NOW());

-- 3. Add subjects
INSERT INTO subjects (subjectCode, subjectName, gradeLevel, teacher_id, created_at, updated_at) 
VALUES 
('MATH-7', 'Mathematics 7', 'Grade 7', 1, NOW(), NOW()),
('ENG-7', 'English 7', 'Grade 7', 1, NOW(), NOW());
```

**Option B: Using Artisan Command** (if you have seeder setup)
```bash
php artisan tinker

$user = User::create(['name' => 'Ms. Maria Santos', 'email' => 'maria.santos@school.com', 'password' => bcrypt('password123'), 'role' => 'teacher']);
$teacher = Teacher::create(['teacherId' => 'TCH-2026-001', 'firstName' => 'Maria', 'lastName' => 'Santos', 'email' => 'maria.santos@school.com', 'specialization' => 'Mathematics', 'advisory_grade' => 'Grade 7', 'status' => 'active']);
```

### Step 3: Ensure Students Exist with Matching Grade Level
```sql
-- Update students to be in Grade 7 (or whatever the teacher's advisory_grade is)
UPDATE students SET gradeLevel = 'Grade 7' LIMIT 5;
```

### Step 4: Test Login
1. Open your application
2. Go to login page
3. Enter:
   - **Email:** maria.santos@school.com
   - **Password:** password123
4. ✅ You should be redirected to `/teacher-advisory`

### Step 5: Test Grade Entry
1. Select a quarter (Q1, Q2, Q3, Q4)
2. Find a student in the table
3. Enter a grade (0-100) for a subject
4. Click ✓ to save
5. ✅ Grade should be saved and message should confirm success

---

## 📱 What Teachers See

### Login Page
- Email field
- Password field
- Login button

### Teacher Advisory Page
- Header: "Teacher Advisory - Grade Evaluation"
- Quarter selector (dropdown)
- Table with:
  - Student ID
  - Student Name
  - Section
  - Grade columns for each subject
  - Score input fields
  - Save buttons

### Data Entry Flow
1. Teacher logs in → Redirected to advisory page
2. Selects quarter
3. Enters grades
4. Clicks save button
5. Receives success message
6. Grades are stored in database

---

## 🔑 Key Credentials Example

| Field | Value |
|-------|-------|
| Email | maria.santos@school.com |
| Password | password123 |
| Role | teacher |
| Advisory Class | Grade 7 |
| Subjects | Mathematics, English |

---

## ✅ Checklist Before Going Live

- [ ] Migration ran successfully (`php artisan migrate`)
- [ ] Teacher user account created
- [ ] Teacher profile (Teacher model) created with matching email
- [ ] Students have `gradeLevel` = teacher's `advisory_grade`
- [ ] Subjects created and assigned to teacher (`teacher_id`)
- [ ] Can login with teacher credentials
- [ ] Redirected to `/teacher-advisory` after login
- [ ] Students appear in the table
- [ ] Subjects appear in table headers
- [ ] Can enter grades (0-100)
- [ ] Can save individual grades
- [ ] Can save all grades at once
- [ ] Grades persist after page refresh

---

## 📊 Expected Database Structure

After running the migration, you should have:

```
tables: users, teachers, students, subjects, grades
         ↓       ↓          ↓         ↓        ↓
       users  teachers   students  subjects  grades
        |        |          |         |        |
        └────────┴──────────┴─────────┴────────┘
                      (relationships)
```

---

## 🐛 Common Issues & Quick Fixes

### Problem: "No students showing on advisory page"
**Solution:** 
```sql
-- Check if students exist with matching gradeLevel
SELECT * FROM students WHERE gradeLevel = 'Grade 7';

-- If none, update some:
UPDATE students SET gradeLevel = 'Grade 7' LIMIT 5;
```

### Problem: "Subjects not appearing"
**Solution:**
```sql
-- Check if subjects have the correct teacher_id
SELECT * FROM subjects WHERE teacher_id = 1;

-- If none, create:
INSERT INTO subjects (subjectCode, subjectName, gradeLevel, teacher_id, created_at, updated_at) 
VALUES ('TEST-7', 'Test Subject', 'Grade 7', 1, NOW(), NOW());
```

### Problem: "Login redirects to dashboard instead of advisory"
**Solution:** 
- Ensure user's role is exactly `'teacher'` (lowercase)
- Clear browser localStorage: `localStorage.clear()`
- Refresh page

### Problem: "Grades not saving"
**Solution:**
- Check browser DevTools Network tab
- Verify score is between 0-100
- Check Laravel logs: `tail -f storage/logs/laravel.log`

---

## 🎯 Testing Scenario

### Complete Test Flow:
1. **Create test data** (see SQL above)
2. **Login** with teacher credentials
3. **Select Quarter 1**
4. **Find first student** in table
5. **Enter grade** (e.g., 85)
6. **Click save button**
7. **See success message** "Grade saved successfully"
8. **Refresh page**
9. **Verify grade is still there**
10. **Try bulk save**
11. **Verify all grades saved**

---

## 📝 API Endpoints You Can Test

With your API tool (Postman, cURL, etc.):

```bash
# 1. Login
POST http://localhost:8000/api/login
{
  "email": "maria.santos@school.com",
  "password": "password123"
}

# Response: { "access_token": "xxx", "user": {...} }

# 2. Get Students (use token from login)
GET http://localhost:8000/api/teacher/students
Header: Authorization: Bearer YOUR_TOKEN

# 3. Get Subjects
GET http://localhost:8000/api/teacher/subjects
Header: Authorization: Bearer YOUR_TOKEN

# 4. Submit Grade
POST http://localhost:8000/api/teacher/grades
Header: Authorization: Bearer YOUR_TOKEN
{
  "student_id": 1,
  "subject_id": 1,
  "score": 85.5,
  "remarks": "Good performance",
  "quarter": "Q1"
}
```

---

## 📚 Full Documentation Files

- **TEACHER_ADVISORY_SETUP.md** - Comprehensive setup guide
- **TEACHER_ADVISORY_IMPLEMENTATION.md** - Technical implementation details
- **TEACHER_ADVISORY_SQL.sql** - All SQL queries and test data

---

## ✨ Features Included

✅ Teacher login with role-based redirection  
✅ View all advisory students in a table  
✅ View assigned subjects  
✅ Input grades (0-100 score range)  
✅ Add remarks for each grade  
✅ Quarterly tracking (Q1, Q2, Q3, Q4)  
✅ Individual grade saving  
✅ Bulk save all grades  
✅ Edit/update existing grades  
✅ Real-time success/error messages  
✅ Responsive design for all devices  
✅ Secure API with authentication  
✅ Input validation  
✅ Database persistence  

---

## 🚀 You're Ready!

Once you've completed the 5 steps above, your teacher advisory system is ready to use.

**Test it out now:**
1. Login as teacher
2. Add some grades
3. Refresh the page (grades should persist)
4. You're done! 🎉

---

**Need Help?**
- Check `TEACHER_ADVISORY_SETUP.md` for detailed instructions
- Review `TEACHER_ADVISORY_SQL.sql` for database queries
- Check Laravel logs: `storage/logs/laravel.log`
- Check browser console: Press F12 → Console tab
