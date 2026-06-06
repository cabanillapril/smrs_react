-- ============================================================
-- CTech SMRS — Comprehensive Database Test Queries
-- DB Browser for SQLite compatible
-- ============================================================


-- ============================================================
-- CLEANUP — Wipe existing test data so inserts never conflict.
-- Run this first if you have existisng records.
-- ============================================================

DELETE FROM deficiencies;
DELETE FROM grades;
DELETE FROM curriculum;
DELETE FROM subjects;
DELETE FROM students;


-- ============================================================
-- SECTION 0 — SCHEMA INSPECTION
-- ============================================================

PRAGMA table_info(students);
PRAGMA table_info(subjects);
PRAGMA table_info(curriculum);
PRAGMA table_info(grades);
PRAGMA table_info(deficiencies);

PRAGMA foreign_key_list(curriculum);
PRAGMA foreign_key_list(grades);
PRAGMA foreign_key_list(deficiencies);


-- ============================================================
-- SECTION 1 — STUDENTS (CREATE)
-- Insert 10 students with varied programs, majors, year levels,
-- sections, and statuses to exercise every code-path.
-- ============================================================

INSERT INTO students (
    student_id, first_name, middle_name, last_name,
    birthday, gender, address, contact_number, email,
    year_level, course, section, status, major
) VALUES
    ('24-00101', 'Maria',   'Santos',   'Reyes',
     '2002-03-15', 'Female',
     '12 Rizal St., Quezon City', '09171234567', 'maria.reyes@ctech.edu',
     1, 'Bachelor of Science in Industrial Technology', 'A', 'Regular',
     'Electronics Technology'),

    ('24-00102', 'Jose',    'Cruz',     'Dela Torre',
     '2001-07-22', 'Male',
     '45 Mabini Ave., Manila', '09281234567', 'jose.delatorre@ctech.edu',
     2, 'Bachelor of Science in Industrial Technology', 'B', 'Irregular',
     'Automotive Technology'),

    ('23-00201', 'Ana',     'Garcia',   'Lim',
     '2000-11-05', 'Female',
     '8 Luna Rd., Pasig City', '09391234567', 'ana.lim@ctech.edu',
     3, 'Bachelor of Science in Industrial Technology', 'A', 'Regular',
     'Electrical Technology'),

    ('22-00301', 'Carlos',  'Mendoza',  'Santos',
     '1999-05-18', 'Male',
     '77 Bonifacio St., Makati', '09501234567', 'carlos.santos@ctech.edu',
     4, 'Bachelor of Science in Industrial Technology', 'C', 'Regular',
     'Electronics Technology'),

    ('24-00401', 'Liza',    'Tan',      'Aquino',
     '2002-09-30', 'Female',
     '3 Katipunan Ave., QC', '09611234567', 'liza.aquino@ctech.edu',
     1, 'Bachelor of Science in Mechatronics and Automation Technology',
     'A', 'Regular', NULL),

    ('23-00501', 'Ramon',   'Bautista', 'Villanueva',
     '2001-01-14', 'Male',
     '19 Aurora Blvd., Cubao', '09721234567', 'ramon.villanueva@ctech.edu',
     2, 'Two-Year Technical Course', 'A', 'Regular',
     'Associate in Mechatronics and Automation Technology'),

    ('24-00601', 'Rosa',    'Flores',   'Castillo',
     '2003-06-28', 'Female',
     '55 EDSA, Mandaluyong', '09831234567', 'rosa.castillo@ctech.edu',
     1, 'Two-Year Technical Course', 'B', 'Irregular',
     'Automotive Technology'),

    ('24-00701', 'Miguel',  'Lopez',    'Ramos',
     '2003-12-01', 'Male',
     '102 Commonwealth Ave., QC', '09941234567', 'miguel.ramos@ctech.edu',
     1, 'One-Year Technical Course', 'A', 'Regular',
     'Welding'),

    ('21-00801', 'Elena',   'Hernandez','Gomez',
     '1998-08-10', 'Female',
     '24 Shaw Blvd., Mandaluyong', '09101234567', 'elena.gomez@ctech.edu',
     4, 'Bachelor of Science in Industrial Technology', 'D', 'Graduated',
     'Electrical Technology'),

    ('24-00901', 'Antonio', 'Pascual',  'Torres',
     '2002-04-07', 'Male',
     '36 F. Blumentritt, Manila', '09211234567', 'antonio.torres@ctech.edu',
     1, 'One-Year Technical Course', 'A', 'Regular',
     'Practical Electricity');


-- Verify inserts
SELECT student_number, student_id, first_name, last_name,
       year_level, course, status, major
FROM students
ORDER BY student_number;


-- ============================================================
-- SECTION 2 — STUDENTS (READ)
-- Range of SELECT queries to test filtering logic used by the API.
-- ============================================================

-- 2a. All active (non-graduated) students
SELECT student_id, first_name, last_name, status, year_level
FROM students
WHERE status != 'Graduated';

-- 2b. Filter by program
SELECT student_id, first_name, last_name, major
FROM students
WHERE course = 'Bachelor of Science in Industrial Technology'
ORDER BY year_level, section;

-- 2c. Filter by year level AND section
SELECT student_id, first_name, last_name, course
FROM students
WHERE year_level = 1 AND section = 'A';

-- 2d. Filter by major
SELECT student_id, first_name, last_name, course
FROM students
WHERE major = 'Electronics Technology';

-- 2e. Search by name (LIKE — mirrors frontend search)
SELECT student_id, first_name, last_name
FROM students
WHERE (first_name || ' ' || last_name) LIKE '%reyes%'
   OR student_id LIKE '%101%';

-- 2f. Count students by status
SELECT status, COUNT(*) AS total
FROM students
GROUP BY status
ORDER BY total DESC;

-- 2g. Count active students per year level (mirrors dashboard stats)
SELECT year_level, COUNT(*) AS headcount
FROM students
WHERE status != 'Graduated'
GROUP BY year_level
ORDER BY year_level;

-- 2h. Count active students per program (dashboard bar chart)
SELECT course, year_level, COUNT(*) AS total
FROM students
WHERE status != 'Graduated'
GROUP BY course, year_level
ORDER BY course, year_level;

-- 2i. Lookup a single student by student_id (used by grade/deficiency creation)
SELECT * FROM students WHERE student_id = '24-00101';


-- ============================================================
-- SECTION 3 — STUDENTS (UPDATE)
-- Test partial updates: status change, section change, address change.
-- ============================================================

-- 3a. Promote a student to 2nd year and change section
UPDATE students
SET year_level = 2, section = 'B'
WHERE student_id = '24-00101';

SELECT student_id, year_level, section FROM students WHERE student_id = '24-00101';

-- 3b. Change enrollment status to Irregular
UPDATE students
SET status = 'Irregular'
WHERE student_id = '24-00401';

SELECT student_id, status FROM students WHERE student_id = '24-00401';

-- 3c. Update contact info
UPDATE students
SET contact_number = '09999999999',
    email          = 'liza.updated@ctech.edu'
WHERE student_id = '24-00401';

SELECT student_id, contact_number, email FROM students WHERE student_id = '24-00401';

-- 3d. Graduate a student
UPDATE students
SET status = 'Graduated'
WHERE student_id = '22-00301';

SELECT student_id, first_name, last_name, status FROM students WHERE student_id = '22-00301';


-- ============================================================
-- SECTION 4 — SUBJECTS (CREATE + READ)
-- Subjects are auto-created by grade/deficiency/curriculum routes,
-- but we also test direct manipulation here.
-- ============================================================

INSERT INTO subjects (subject_code, subject_name, unit, course, major) VALUES
    ('MATH101',  'Calculus I',                           3,
     'Bachelor of Science in Industrial Technology', NULL),
    ('PHYS101',  'Engineering Physics',                  3,
     'Bachelor of Science in Industrial Technology', NULL),
    ('ELX201',   'Electronics Circuits',                 3,
     'Bachelor of Science in Industrial Technology', 'Electronics Technology'),
    ('ELX301',   'Microcontrollers & Embedded Systems',  3,
     'Bachelor of Science in Industrial Technology', 'Electronics Technology'),
    ('AUTO101',  'Automotive Technology Fundamentals',   3,
     'Bachelor of Science in Industrial Technology', 'Automotive Technology'),
    ('ELEC201',  'Electrical Machines',                  3,
     'Bachelor of Science in Industrial Technology', 'Electrical Technology'),
    ('MAT101',   'Engineering Mathematics',              3,
     'Bachelor of Science in Mechatronics and Automation Technology', NULL),
    ('WELD101',  'Basic Welding',                        3,
     'One-Year Technical Course', 'Welding'),
    ('PELEC101', 'Practical Electricity Fundamentals',   3,
     'One-Year Technical Course', 'Practical Electricity'),
    ('DRAW101',  'Technical Drawing',                    2,
     'Two-Year Technical Course', NULL);

-- Read all subjects
SELECT subject_id, subject_code, subject_name, unit, course, major
FROM subjects
ORDER BY course, major, subject_code;

-- Lookup by code (used internally by grade/deficiency routes)
SELECT * FROM subjects WHERE subject_code = 'MATH101';

-- Filter subjects by course and major
SELECT subject_code, subject_name, unit
FROM subjects
WHERE course = 'Bachelor of Science in Industrial Technology'
  AND (major = 'Electronics Technology' OR major IS NULL)
ORDER BY subject_code;

-- Update subject units
UPDATE subjects SET unit = 4 WHERE subject_code = 'MATH101';
SELECT subject_id, subject_code, unit FROM subjects WHERE subject_code = 'MATH101';

-- Reset unit
UPDATE subjects SET unit = 3 WHERE subject_code = 'MATH101';


-- ============================================================
-- SECTION 5 — CURRICULUM (CREATE)
-- Map subjects to year/semester slots for each program.
-- ============================================================

-- 5a. BSIT — 1st Year, 1st Semester
INSERT INTO curriculum (course, major, year_level, semester, subject_id)
SELECT 'Bachelor of Science in Industrial Technology', NULL, 1, 1, subject_id
FROM subjects WHERE subject_code = 'MATH101';

INSERT INTO curriculum (course, major, year_level, semester, subject_id)
SELECT 'Bachelor of Science in Industrial Technology', NULL, 1, 1, subject_id
FROM subjects WHERE subject_code = 'PHYS101';

INSERT INTO curriculum (course, major, year_level, semester, subject_id)
SELECT 'Bachelor of Science in Industrial Technology', NULL, 1, 2, subject_id
FROM subjects WHERE subject_code = 'DRAW101';

-- 5b. BSIT Electronics Major — 2nd Year, 1st Semester
INSERT INTO curriculum (course, major, year_level, semester, subject_id)
SELECT 'Bachelor of Science in Industrial Technology',
       'Electronics Technology', 2, 1, subject_id
FROM subjects WHERE subject_code = 'ELX201';

-- 5c. BSIT Electronics Major — 3rd Year, 1st Semester
INSERT INTO curriculum (course, major, year_level, semester, subject_id)
SELECT 'Bachelor of Science in Industrial Technology',
       'Electronics Technology', 3, 1, subject_id
FROM subjects WHERE subject_code = 'ELX301';

-- 5d. BSIT Automotive Major — 2nd Year, 1st Semester
INSERT INTO curriculum (course, major, year_level, semester, subject_id)
SELECT 'Bachelor of Science in Industrial Technology',
       'Automotive Technology', 2, 1, subject_id
FROM subjects WHERE subject_code = 'AUTO101';

-- 5e. BSIT Electrical Major — 2nd Year, 2nd Semester
INSERT INTO curriculum (course, major, year_level, semester, subject_id)
SELECT 'Bachelor of Science in Industrial Technology',
       'Electrical Technology', 2, 2, subject_id
FROM subjects WHERE subject_code = 'ELEC201';

-- 5f. BSMAT — 1st Year, 1st Semester
INSERT INTO curriculum (course, major, year_level, semester, subject_id)
SELECT 'Bachelor of Science in Mechatronics and Automation Technology',
       NULL, 1, 1, subject_id
FROM subjects WHERE subject_code = 'MAT101';

-- 5g. One-Year — 1st Semester
INSERT INTO curriculum (course, major, year_level, semester, subject_id)
SELECT 'One-Year Technical Course', 'Welding', 1, 1, subject_id
FROM subjects WHERE subject_code = 'WELD101';

INSERT INTO curriculum (course, major, year_level, semester, subject_id)
SELECT 'One-Year Technical Course', 'Practical Electricity', 1, 1, subject_id
FROM subjects WHERE subject_code = 'PELEC101';


-- ============================================================
-- SECTION 6 — CURRICULUM (READ)
-- Mirrors getByCourse() and the enriched _enrich() join.
-- ============================================================

-- 6a. Full curriculum for BSIT (all years, all majors)
SELECT c.curriculum_id, c.course, c.major, c.year_level, c.semester,
       s.subject_code, s.subject_name, s.unit
FROM curriculum c
JOIN subjects s ON s.subject_id = c.subject_id
WHERE c.course = 'Bachelor of Science in Industrial Technology'
ORDER BY c.major, c.year_level, c.semester, s.subject_code;

-- 6b. Curriculum filtered by major
SELECT c.year_level, c.semester, s.subject_code, s.subject_name, s.unit
FROM curriculum c
JOIN subjects s ON s.subject_id = c.subject_id
WHERE c.course = 'Bachelor of Science in Industrial Technology'
  AND c.major = 'Electronics Technology'
ORDER BY c.year_level, c.semester;

-- 6c. Total units per year-semester block (mirrors tfoot calculation)
SELECT c.year_level, c.semester, SUM(s.unit) AS total_units
FROM curriculum c
JOIN subjects s ON s.subject_id = c.subject_id
WHERE c.course = 'Bachelor of Science in Industrial Technology'
GROUP BY c.year_level, c.semester
ORDER BY c.year_level, c.semester;

-- 6d. All programs and their subject count
SELECT c.course, COUNT(*) AS subject_count
FROM curriculum c
GROUP BY c.course
ORDER BY subject_count DESC;

-- 6e. Check for duplicate curriculum entries (same course+major+year+semester+subject)
SELECT course, major, year_level, semester, subject_id, COUNT(*) AS cnt
FROM curriculum
GROUP BY course, major, year_level, semester, subject_id
HAVING cnt > 1;


-- ============================================================
-- SECTION 7 — CURRICULUM (UPDATE + DELETE)
-- ============================================================

-- 7a. Move a subject to a different semester
UPDATE curriculum
SET semester = 2
WHERE curriculum_id = (
    SELECT c.curriculum_id FROM curriculum c
    JOIN subjects s ON s.subject_id = c.subject_id
    WHERE s.subject_code = 'DRAW101'
    LIMIT 1
);

SELECT c.curriculum_id, c.semester, s.subject_code
FROM curriculum c
JOIN subjects s ON s.subject_id = c.subject_id
WHERE s.subject_code = 'DRAW101';

-- 7b. Reassign curriculum entry to a different major
UPDATE curriculum
SET major = 'Electrical Technology'
WHERE curriculum_id = (
    SELECT c.curriculum_id FROM curriculum c
    JOIN subjects s ON s.subject_id = c.subject_id
    WHERE s.subject_code = 'ELEC201' LIMIT 1
);

-- 7c. Delete a curriculum entry (clean remove)
DELETE FROM curriculum
WHERE curriculum_id = (
    SELECT c.curriculum_id FROM curriculum c
    JOIN subjects s ON s.subject_id = c.subject_id
    WHERE s.subject_code = 'DRAW101' LIMIT 1
);

-- Confirm deletion
SELECT COUNT(*) AS remaining_draw101
FROM curriculum c
JOIN subjects s ON s.subject_id = c.subject_id
WHERE s.subject_code = 'DRAW101';


-- ============================================================
-- SECTION 8 — GRADES (CREATE)
-- Covers passing, failing, INC, and borderline grades.
-- grade_routes auto-computes final grade and remarks.
-- Here we insert directly to test the model.
-- ============================================================

INSERT INTO grades (student_id, subject_id, semester, school_year,
                    midterm, finals, grade, remarks)
SELECT '24-00101', subject_id, 1, '2025-2026',
       1.50, 1.75, 1.625, 'Passed'
FROM subjects WHERE subject_code = 'MATH101';

INSERT INTO grades (student_id, subject_id, semester, school_year,
                    midterm, finals, grade, remarks)
SELECT '24-00101', subject_id, 1, '2025-2026',
       2.00, 2.25, 2.125, 'Passed'
FROM subjects WHERE subject_code = 'PHYS101';

INSERT INTO grades (student_id, subject_id, semester, school_year,
                    midterm, finals, grade, remarks)
SELECT '24-00102', subject_id, 1, '2025-2026',
       3.00, 3.50, 3.25, 'Failed'
FROM subjects WHERE subject_code = 'AUTO101';

INSERT INTO grades (student_id, subject_id, semester, school_year,
                    midterm, finals, grade, remarks)
SELECT '23-00201', subject_id, 1, '2025-2026',
       2.25, 2.50, 2.375, 'Passed'
FROM subjects WHERE subject_code = 'ELX201';

INSERT INTO grades (student_id, subject_id, semester, school_year,
                    midterm, finals, grade, remarks)
SELECT '23-00201', subject_id, 2, '2025-2026',
       1.00, 1.25, 1.125, 'Passed'
FROM subjects WHERE subject_code = 'ELEC201';

-- INC grade (midterm only, finals not yet taken)
INSERT INTO grades (student_id, subject_id, semester, school_year,
                    midterm, finals, grade, remarks)
SELECT '24-00102', subject_id, 1, '2025-2026',
       NULL, NULL, 0.0, 'INC'
FROM subjects WHERE subject_code = 'MATH101';

-- Borderline passing grade
INSERT INTO grades (student_id, subject_id, semester, school_year,
                    midterm, finals, grade, remarks)
SELECT '23-00501', subject_id, 1, '2025-2026',
       3.00, 3.00, 3.00, 'Passed'
FROM subjects WHERE subject_code = 'MAT101';

-- Welding student
INSERT INTO grades (student_id, subject_id, semester, school_year,
                    midterm, finals, grade, remarks)
SELECT '24-00701', subject_id, 1, '2025-2026',
       1.75, 1.50, 1.625, 'Passed'
FROM subjects WHERE subject_code = 'WELD101';


-- ============================================================
-- SECTION 9 — GRADES (READ)
-- Mirrors get_all(), get_by_student(), and the enriched response.
-- ============================================================

-- 9a. All grades with student and subject info (enriched)
SELECT g.grade_id,
       st.student_id, st.first_name, st.last_name,
       s.subject_code, s.subject_name,
       g.midterm, g.finals, g.grade, g.remarks,
       g.semester, g.school_year
FROM grades g
JOIN students st ON st.student_id = g.student_id
JOIN subjects s  ON s.subject_id  = g.subject_id
ORDER BY st.student_id, g.semester;

-- 9b. Grades for a specific student
SELECT s.subject_code, g.midterm, g.finals, g.grade, g.remarks
FROM grades g
JOIN subjects s ON s.subject_id = g.subject_id
WHERE g.student_id = '24-00101';

-- 9c. All failed grades (for deficiency cross-check)
SELECT g.grade_id, st.student_id, st.first_name, st.last_name,
       s.subject_code, g.grade, g.remarks
FROM grades g
JOIN students st ON st.student_id = g.student_id
JOIN subjects s  ON s.subject_id  = g.subject_id
WHERE g.remarks = 'Failed';

-- 9d. GWA per student (average of all non-INC grades)
SELECT st.student_id, st.first_name, st.last_name,
       ROUND(AVG(g.grade), 3) AS gwa
FROM grades g
JOIN students st ON st.student_id = g.student_id
WHERE g.remarks != 'INC'
GROUP BY g.student_id
ORDER BY gwa ASC;

-- 9e. Grade distribution counts
SELECT remarks, COUNT(*) AS count
FROM grades
GROUP BY remarks;

-- 9f. Grades filtered by semester
SELECT st.student_id, s.subject_code, g.grade, g.remarks
FROM grades g
JOIN students st ON st.student_id = g.student_id
JOIN subjects s  ON s.subject_id  = g.subject_id
WHERE g.semester = 1
ORDER BY st.student_id, s.subject_code;


-- ============================================================
-- SECTION 10 — GRADES (UPDATE + DELETE)
-- ============================================================

-- 10a. Record finals grade for the INC entry and recompute
-- COALESCE handles NULL midterm: treats it as 2.50 so grade is never NULL
UPDATE grades
SET midterm = COALESCE(midterm, 2.50),
    finals  = 2.50,
    grade   = ROUND((COALESCE(midterm, 2.50) + 2.50) / 2, 2),
    remarks = CASE
                WHEN ROUND((COALESCE(midterm, 2.50) + 2.50) / 2, 2) <= 3.0 THEN 'Passed'
                ELSE 'Failed'
              END
WHERE grade_id = (
    SELECT g.grade_id FROM grades g
    JOIN subjects s ON s.subject_id = g.subject_id
    WHERE g.student_id = '24-00102'
      AND s.subject_code = 'MATH101'
      AND g.remarks = 'INC'
    LIMIT 1
);

SELECT g.grade_id, g.midterm, g.finals, g.grade, g.remarks
FROM grades g
JOIN subjects s ON s.subject_id = g.subject_id
WHERE g.student_id = '24-00102' AND s.subject_code = 'MATH101';

-- 10b. Correct a midterm grade entry
UPDATE grades
SET midterm = 2.75,
    grade   = ROUND((2.75 + finals) / 2, 2)
WHERE grade_id = (
    SELECT g.grade_id FROM grades g
    JOIN subjects s ON s.subject_id = g.subject_id
    WHERE g.student_id = '24-00102' AND s.subject_code = 'AUTO101'
    LIMIT 1
);

-- 10c. Delete a grade record
DELETE FROM grades
WHERE grade_id = (
    SELECT g.grade_id FROM grades g
    JOIN subjects s ON s.subject_id = g.subject_id
    WHERE g.student_id = '23-00501' AND s.subject_code = 'MAT101'
    LIMIT 1
);

SELECT COUNT(*) AS remaining_501_grades FROM grades WHERE student_id = '23-00501';


-- ============================================================
-- SECTION 11 — DEFICIENCIES (CREATE)
-- Cover all four types, both statuses, and multiple semesters.
-- ============================================================

-- Incomplete
INSERT INTO deficiencies (student_id, subject_id, type, status,
                           semester, date_recorded)
SELECT '24-00102', subject_id, 'Incomplete', 'pending',
       '1st Semester 2025-2026',
       date('now')
FROM subjects WHERE subject_code = 'AUTO101';

-- Failed
INSERT INTO deficiencies (student_id, subject_id, type, status,
                           semester, date_recorded)
SELECT '24-00102', subject_id, 'Failed', 'pending',
       '1st Semester 2025-2026',
       date('now')
FROM subjects WHERE subject_code = 'MATH101';

-- Dropped — already resolved
INSERT INTO deficiencies (student_id, subject_id, type, status,
                           semester, date_recorded, date_resolved)
SELECT '23-00201', subject_id, 'Dropped', 'resolved',
       '2nd Semester 2024-2025',
       date('now', '-90 days'), date('now', '-30 days')
FROM subjects WHERE subject_code = 'ELX201';

-- Other type, pending
INSERT INTO deficiencies (student_id, subject_id, type, status,
                           semester, deadline, remarks, date_recorded)
SELECT '24-00601', subject_id, 'Other', 'pending',
       '1st Semester 2025-2026',
       date('now', '+30 days'), 'Missing laboratory requirements',
       date('now')
FROM subjects WHERE subject_code = 'AUTO101';

-- Second Incomplete for a different student
INSERT INTO deficiencies (student_id, subject_id, type, status,
                           semester, date_recorded)
SELECT '23-00501', subject_id, 'Incomplete', 'pending',
       '1st Semester 2025-2026',
       date('now')
FROM subjects WHERE subject_code = 'MAT101';


-- ============================================================
-- SECTION 12 — DEFICIENCIES (READ)
-- Mirrors get_all(), get_by_student(), and dashboard counts.
-- ============================================================

-- 12a. All deficiencies enriched (mirrors _enrich)
SELECT d.deficiency_id,
       st.student_id, st.first_name, st.last_name,
       s.subject_code, s.subject_name,
       d.type, d.status, d.semester,
       d.deadline, d.remarks,
       d.date_recorded, d.date_resolved
FROM deficiencies d
JOIN students st ON st.student_id = d.student_id
JOIN subjects s  ON s.subject_id  = d.subject_id
ORDER BY d.status DESC, d.date_recorded DESC;

-- 12b. Deficiencies for a specific student
SELECT s.subject_code, d.type, d.status, d.semester
FROM deficiencies d
JOIN subjects s ON s.subject_id = d.subject_id
WHERE d.student_id = '24-00102';

-- 12c. All pending deficiencies (dashboard count)
SELECT COUNT(*) AS pending_total
FROM deficiencies
WHERE status = 'pending';

-- 12d. Pending deficiencies by type (dashboard breakdown)
SELECT type, COUNT(*) AS count
FROM deficiencies
WHERE status = 'pending'
GROUP BY type;

-- 12e. Students with more than one active deficiency
SELECT d.student_id, st.first_name, st.last_name,
       COUNT(*) AS active_deficiencies
FROM deficiencies d
JOIN students st ON st.student_id = d.student_id
WHERE d.status = 'pending'
GROUP BY d.student_id
HAVING active_deficiencies > 0
ORDER BY active_deficiencies DESC;

-- 12f. Deficiencies overdue (past deadline, still pending)
SELECT d.deficiency_id, st.student_id, st.first_name, st.last_name,
       s.subject_code, d.type, d.deadline
FROM deficiencies d
JOIN students st ON st.student_id = d.student_id
JOIN subjects s  ON s.subject_id  = d.subject_id
WHERE d.status  = 'pending'
  AND d.deadline IS NOT NULL
  AND d.deadline < date('now');


-- ============================================================
-- SECTION 13 — DEFICIENCIES (UPDATE / RESOLVE + DELETE)
-- ============================================================

-- 13a. Resolve an Incomplete deficiency
UPDATE deficiencies
SET status        = 'resolved',
    date_resolved = date('now')
WHERE deficiency_id = (
    SELECT d.deficiency_id FROM deficiencies d
    JOIN subjects s ON s.subject_id = d.subject_id
    WHERE d.student_id = '24-00102'
      AND s.subject_code = 'AUTO101'
      AND d.type = 'Incomplete'
    LIMIT 1
);

-- Verify resolution
SELECT deficiency_id, status, date_resolved
FROM deficiencies
WHERE deficiency_id = (
    SELECT d.deficiency_id FROM deficiencies d
    JOIN subjects s ON s.subject_id = d.subject_id
    WHERE d.student_id = '24-00102' AND s.subject_code = 'AUTO101'
    LIMIT 1
);

-- 13b. Update deadline and remarks on an open deficiency
UPDATE deficiencies
SET deadline = date('now', '+60 days'),
    remarks  = 'Extension granted by department chair'
WHERE deficiency_id = (
    SELECT d.deficiency_id FROM deficiencies d
    WHERE d.student_id = '24-00601' AND d.status = 'pending'
    LIMIT 1
);

-- 13c. Delete a resolved deficiency (archive cleanup)
DELETE FROM deficiencies
WHERE status = 'resolved'
  AND date_resolved < date('now', '-60 days');

-- Confirm count after cleanup
SELECT status, COUNT(*) FROM deficiencies GROUP BY status;

-- 13d. Delete a specific pending deficiency
DELETE FROM deficiencies
WHERE deficiency_id = (
    SELECT d.deficiency_id FROM deficiencies d
    JOIN subjects s ON s.subject_id = d.subject_id
    WHERE d.student_id = '23-00501'
      AND s.subject_code = 'MAT101'
    LIMIT 1
);


-- ============================================================
-- SECTION 14 — DASHBOARD STATS QUERIES
-- Mirrors /dashboard/stats exactly.
-- ============================================================

SELECT
    (SELECT COUNT(*) FROM students)                                      AS total_students,
    (SELECT COUNT(*) FROM students WHERE status != 'Graduated')          AS active_students,
    (SELECT COUNT(*) FROM deficiencies)                                  AS total_deficiencies,
    (SELECT COUNT(*) FROM deficiencies WHERE status = 'pending')         AS pending_deficiencies,
    (SELECT COUNT(*) FROM deficiencies WHERE status = 'resolved')        AS resolved_count,
    (SELECT COUNT(*) FROM deficiencies
     WHERE type LIKE '%incomplete%' AND status = 'pending')              AS incomplete_count,
    (SELECT COUNT(*) FROM deficiencies
     WHERE type LIKE '%failed%' AND status = 'pending')                  AS failed_count;


-- ============================================================
-- SECTION 15 — CROSS-TABLE JOIN QUERIES
-- Simulate the enriched API responses that join multiple tables.
-- ============================================================

-- 15a. Full student academic profile (grades + deficiency count)
SELECT st.student_id,
       st.first_name || ' ' || st.last_name                 AS full_name,
       st.course, st.major, st.year_level, st.status,
       COUNT(DISTINCT g.grade_id)                           AS grade_count,
       ROUND(AVG(CASE WHEN g.remarks != 'INC'
                      THEN g.grade END), 3)                 AS gwa,
       COUNT(DISTINCT d.deficiency_id)                      AS total_deficiencies,
       SUM(CASE WHEN d.status = 'pending' THEN 1 ELSE 0 END) AS pending_deficiencies
FROM students st
LEFT JOIN grades      g ON g.student_id = st.student_id
LEFT JOIN deficiencies d ON d.student_id = st.student_id
GROUP BY st.student_id
ORDER BY st.year_level, st.last_name;

-- 15b. Subject load check: subjects in curriculum but with no grades recorded
SELECT DISTINCT c.course, c.major, c.year_level, c.semester,
       s.subject_code, s.subject_name
FROM curriculum c
JOIN subjects s ON s.subject_id = c.subject_id
WHERE NOT EXISTS (
    SELECT 1 FROM grades g WHERE g.subject_id = s.subject_id
)
ORDER BY c.course, c.year_level, c.semester;

-- 15c. Deficiencies with subject and student details combined
SELECT st.student_id,
       st.first_name || ' ' || st.last_name AS student_name,
       st.year_level, st.section, st.course,
       s.subject_code, d.type, d.status, d.semester
FROM deficiencies d
JOIN students st ON st.student_id = d.student_id
JOIN subjects s  ON s.subject_id  = d.subject_id
ORDER BY d.status, st.year_level;

-- 15d. Students enrolled in a program and their grades for that program's subjects
SELECT st.student_id, st.first_name, st.last_name,
       s.subject_code, g.grade, g.remarks
FROM students st
JOIN grades g      ON g.student_id = st.student_id
JOIN subjects s    ON s.subject_id = g.subject_id
WHERE st.course = 'Bachelor of Science in Industrial Technology'
  AND s.course  = 'Bachelor of Science in Industrial Technology'
ORDER BY st.student_id, s.subject_code;


-- ============================================================
-- SECTION 16 — EDGE CASES & CONSTRAINT TESTS
-- ============================================================

-- 16a. Attempt to insert a student with a duplicate student_id
--      (should fail with UNIQUE constraint error in SQLite)
-- Uncomment to test:
-- INSERT INTO students (student_id, first_name, last_name, year_level, course, status)
-- VALUES ('24-00101', 'Duplicate', 'Student', 1,
--         'Bachelor of Science in Industrial Technology', 'Regular');

-- 16b. Insert a student with no major (BSMAT — valid)
SELECT student_id, first_name, last_name, major
FROM students
WHERE course = 'Bachelor of Science in Mechatronics and Automation Technology';

-- 16c. Verify no orphaned grades (grade references a non-existent student_id)
SELECT g.grade_id, g.student_id
FROM grades g
LEFT JOIN students st ON st.student_id = g.student_id
WHERE st.student_id IS NULL;

-- 16d. Verify no orphaned deficiencies
SELECT d.deficiency_id, d.student_id
FROM deficiencies d
LEFT JOIN students st ON st.student_id = d.student_id
WHERE st.student_id IS NULL;

-- 16e. Verify no orphaned curriculum rows
SELECT c.curriculum_id, c.subject_id
FROM curriculum c
LEFT JOIN subjects s ON s.subject_id = c.subject_id
WHERE s.subject_id IS NULL;

-- 16f. Students with no grades recorded at all
SELECT st.student_id, st.first_name, st.last_name, st.status
FROM students st
LEFT JOIN grades g ON g.student_id = st.student_id
WHERE g.grade_id IS NULL
ORDER BY st.student_id;

-- 16g. Subjects that appear in curriculum but have no grades
SELECT s.subject_code, s.subject_name, COUNT(c.curriculum_id) AS curriculum_count
FROM subjects s
LEFT JOIN curriculum c ON c.subject_id = s.subject_id
LEFT JOIN grades g     ON g.subject_id = s.subject_id
WHERE g.grade_id IS NULL
GROUP BY s.subject_id
ORDER BY curriculum_count DESC;


-- ============================================================
-- SECTION 17 — STUDENTS (DELETE)
-- Test soft vs hard deletes and cascade behaviour.
-- ============================================================

-- 17a. Delete a student who has grades and deficiencies
--      (SQLite won't cascade unless PRAGMA foreign_keys=ON)
PRAGMA foreign_keys = ON;

-- First preview what's linked to this student
SELECT COUNT(*) AS linked_grades
FROM grades WHERE student_id = '24-00102';

SELECT COUNT(*) AS linked_deficiencies
FROM deficiencies WHERE student_id = '24-00102';

-- Delete grades first (to respect FK without cascades)
DELETE FROM grades WHERE student_id = '24-00102';
DELETE FROM deficiencies WHERE student_id = '24-00102';
DELETE FROM students WHERE student_id = '24-00102';

-- Verify full removal
SELECT COUNT(*) AS should_be_0_students
FROM students WHERE student_id = '24-00102';

SELECT COUNT(*) AS should_be_0_grades
FROM grades WHERE student_id = '24-00102';

-- 17b. Delete a student — clean up related records first
DELETE FROM grades       WHERE student_id = '24-00701';
DELETE FROM deficiencies WHERE student_id = '24-00701';
DELETE FROM students     WHERE student_id = '24-00701';

SELECT COUNT(*) AS should_be_0
FROM students WHERE student_id = '24-00701';


-- ============================================================
-- SECTION 18 — SUBJECTS (DELETE)
-- Subjects can only be safely deleted if no curriculum or grade rows
-- reference them.
-- ============================================================

-- 18a. Safe delete: subject with no grades or curriculum links
INSERT INTO subjects (subject_code, subject_name, unit, course, major)
VALUES ('TEMP999', 'Temporary Subject', 1, NULL, NULL);

DELETE FROM subjects WHERE subject_code = 'TEMP999';

SELECT COUNT(*) AS should_be_0
FROM subjects WHERE subject_code = 'TEMP999';

-- 18b. Preview before deleting a referenced subject
SELECT COUNT(*) AS curriculum_uses
FROM curriculum c
JOIN subjects s ON s.subject_id = c.subject_id
WHERE s.subject_code = 'MATH101';

SELECT COUNT(*) AS grade_uses
FROM grades g
JOIN subjects s ON s.subject_id = g.subject_id
WHERE s.subject_code = 'MATH101';
-- If both = 0, it's safe to delete. Otherwise, clean linked rows first.


-- ============================================================
-- SECTION 19 — FINAL STATE SUMMARY
-- Quick count of all records across every table.
-- ============================================================

SELECT 'students'    AS table_name, COUNT(*) AS record_count FROM students
UNION ALL
SELECT 'subjects',   COUNT(*) FROM subjects
UNION ALL
SELECT 'curriculum', COUNT(*) FROM curriculum
UNION ALL
SELECT 'grades',     COUNT(*) FROM grades
UNION ALL
SELECT 'deficiencies', COUNT(*) FROM deficiencies;