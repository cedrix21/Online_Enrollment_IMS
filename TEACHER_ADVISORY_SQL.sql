-- Teacher Advisory System - Database Setup & Testing

-- ============================================================================
-- 1. CREATING TEST DATA FOR TEACHER ADVISORY SYSTEM
-- ============================================================================

-- First, ensure you have a teacher user account
INSERT INTO users (name, email, password, role, created_at, updated_at) VALUES
('Ms. Maria Santos', 'maria.santos@school.com', '$2y$12$...', 'teacher', NOW(), NOW());

-- Create corresponding teacher record
INSERT INTO teachers (teacherId, firstName, lastName, email, specialization, advisory_grade, phone, status, created_at, updated_at) VALUES
('TCH-2026-001', 'Maria', 'Santos', 'maria.santos@school.com', 'Mathematics', 'Grade 7', '09123456789', 'active', NOW(), NOW());

-- ============================================================================
-- 2. CREATE SUBJECTS FOR THE TEACHER
-- ============================================================================

-- Find the teacher ID first
SELECT id FROM teachers WHERE email = 'maria.santos@school.com';
-- Assuming teacher_id = 1

INSERT INTO subjects (subjectCode, subjectName, gradeLevel, teacher_id, created_at, updated_at) VALUES
('MATH-7', 'Mathematics 7', 'Grade 7', 1, NOW(), NOW()),
('ENG-7', 'English 7', 'Grade 7', 1, NOW(), NOW()),
('SCI-7', 'Science 7', 'Grade 7', 1, NOW(), NOW());

-- ============================================================================
-- 3. VERIFY STUDENTS ARE IN CORRECT GRADE LEVEL
-- ============================================================================

-- Students must have gradeLevel matching teacher's advisory_grade
-- Check existing students
SELECT id, studentId, firstName, lastName, gradeLevel FROM students WHERE gradeLevel = 'Grade 7';

-- If needed, update student gradeLevel
UPDATE students SET gradeLevel = 'Grade 7' WHERE studentId IN ('STU-2026-001', 'STU-2026-002', 'STU-2026-003');

-- ============================================================================
-- 4. VERIFY THE GRADES TABLE WAS CREATED
-- ============================================================================

-- Check grades table structure
DESCRIBE grades;

-- Expected columns:
-- id, teacher_id, student_id, subject_id, score, remarks, quarter, created_at, updated_at

-- ============================================================================
-- 5. MANUAL TEST: INSERT A GRADE
-- ============================================================================

-- Get IDs
SELECT id FROM teachers WHERE email = 'maria.santos@school.com'; -- teacher_id
SELECT id FROM students WHERE gradeLevel = 'Grade 7' LIMIT 1; -- student_id
SELECT id FROM subjects WHERE teacher_id = 1; -- subject_id

-- Insert test grade (replace IDs with actual values)
INSERT INTO grades (teacher_id, student_id, subject_id, score, remarks, quarter, created_at, updated_at)
VALUES (1, 1, 1, 85.50, 'Good performance', 'Q1', NOW(), NOW());

-- ============================================================================
-- 6. VERIFY GRADES WERE SAVED
-- ============================================================================

SELECT g.*, s.studentId, s.firstName, s.lastName, sub.subjectName, t.firstName as teacherName
FROM grades g
JOIN teachers t ON g.teacher_id = t.id
JOIN students s ON g.student_id = s.id
JOIN subjects sub ON g.subject_id = sub.id
WHERE t.email = 'maria.santos@school.com';

-- ============================================================================
-- 7. USEFUL QUERIES FOR MONITORING
-- ============================================================================

-- Get all grades by a specific teacher
SELECT g.*, s.studentId, s.firstName, s.lastName, sub.subjectName
FROM grades g
JOIN students s ON g.student_id = s.id
JOIN subjects sub ON g.subject_id = sub.id
WHERE g.teacher_id = 1
ORDER BY g.quarter, s.firstName;

-- Get grades for a specific quarter
SELECT g.*, s.studentId, s.firstName, s.lastName, sub.subjectName
FROM grades g
JOIN students s ON g.student_id = s.id
JOIN subjects sub ON g.subject_id = sub.id
WHERE g.teacher_id = 1 AND g.quarter = 'Q1'
ORDER BY s.firstName;

-- Get grades for a specific student
SELECT g.*, sub.subjectName, t.firstName as teacherName
FROM grades g
JOIN subjects sub ON g.subject_id = sub.id
JOIN teachers t ON g.teacher_id = t.id
WHERE g.student_id = 1
ORDER BY g.quarter;

-- Get average grade per student
SELECT s.id, s.studentId, s.firstName, s.lastName, AVG(g.score) as average_score
FROM grades g
JOIN students s ON g.student_id = s.id
WHERE g.teacher_id = 1 AND g.quarter = 'Q1'
GROUP BY s.id
ORDER BY average_score DESC;

-- Check for duplicate grades (shouldn't exist due to unique constraint)
SELECT teacher_id, student_id, subject_id, quarter, COUNT(*) as count
FROM grades
GROUP BY teacher_id, student_id, subject_id, quarter
HAVING COUNT(*) > 1;

-- ============================================================================
-- 8. DELETE TEST DATA (if needed)
-- ============================================================================

-- Delete grades
DELETE FROM grades WHERE teacher_id = 1;

-- Delete subjects
DELETE FROM subjects WHERE teacher_id = 1;

-- Delete teacher
DELETE FROM teachers WHERE id = 1;

-- Delete user
DELETE FROM users WHERE email = 'maria.santos@school.com';

-- ============================================================================
-- 9. SAMPLE BULK INSERT FOR TESTING
-- ============================================================================

-- Insert multiple students for testing
INSERT INTO students (studentId, firstName, lastName, email, gradeLevel, status, created_at, updated_at) VALUES
('STU-2026-010', 'Juan', 'Dela Cruz', 'juan@school.com', 'Grade 7', 'active', NOW(), NOW()),
('STU-2026-011', 'Pedro', 'Reyes', 'pedro@school.com', 'Grade 7', 'active', NOW(), NOW()),
('STU-2026-012', 'Anna', 'Martinez', 'anna@school.com', 'Grade 7', 'active', NOW(), NOW()),
('STU-2026-013', 'Rosa', 'Garcia', 'rosa@school.com', 'Grade 7', 'active', NOW(), NOW()),
('STU-2026-014', 'Carlos', 'Lopez', 'carlos@school.com', 'Grade 7', 'active', NOW(), NOW());

-- Insert multiple grades at once
INSERT INTO grades (teacher_id, student_id, subject_id, score, remarks, quarter, created_at, updated_at) VALUES
(1, 1, 1, 85.5, 'Good', 'Q1', NOW(), NOW()),
(1, 1, 2, 90.0, 'Excellent', 'Q1', NOW(), NOW()),
(1, 1, 3, 78.5, 'Satisfactory', 'Q1', NOW(), NOW()),
(1, 2, 1, 92.0, 'Excellent', 'Q1', NOW(), NOW()),
(1, 2, 2, 88.0, 'Good', 'Q1', NOW(), NOW()),
(1, 2, 3, 85.0, 'Good', 'Q1', NOW(), NOW());

-- ============================================================================
-- 10. CHECK DATA INTEGRITY
-- ============================================================================

-- Verify all required relationships
SELECT 
  'Teachers' as table_name,
  COUNT(*) as count
FROM teachers
UNION ALL
SELECT 
  'Subjects',
  COUNT(*)
FROM subjects
UNION ALL
SELECT 
  'Students',
  COUNT(*)
FROM students
UNION ALL
SELECT 
  'Grades',
  COUNT(*)
FROM grades;

-- View the complete grade data for a teacher
SELECT 
  t.teacherId,
  t.firstName as teacher_first_name,
  t.lastName as teacher_last_name,
  s.studentId,
  s.firstName as student_first_name,
  s.lastName as student_last_name,
  sub.subjectCode,
  sub.subjectName,
  g.score,
  g.remarks,
  g.quarter,
  g.created_at,
  g.updated_at
FROM grades g
JOIN teachers t ON g.teacher_id = t.id
JOIN students s ON g.student_id = s.id
JOIN subjects sub ON g.subject_id = sub.id
WHERE t.email = 'maria.santos@school.com'
ORDER BY g.quarter, s.firstName, sub.subjectName;
