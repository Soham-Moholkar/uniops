-- =============================================================
-- UniOps DB — Views + Indexes
-- =============================================================

-- ═══════════════════════════════════════════════════════════════
-- VIEW 1 (Updatable) — Single-table view on student
-- An updatable view because it maps to exactly one base table
-- with no aggregates, DISTINCT, GROUP BY, HAVING, UNION, or joins.
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW v_active_students AS
SELECT student_id, name, email, phone, dept_id, year, status, created_at
FROM   student
WHERE  status = 'active';

-- Test: update through the updatable view
-- UPDATE v_active_students SET phone = '1111111111' WHERE student_id = 1;
-- This works because the view is on a single table with no restrictions.

-- ═══════════════════════════════════════════════════════════════
-- VIEW 2 (Non-updatable) — Join-based view: student enrollments
-- Cannot be updated because it involves a JOIN + aggregate.
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW v_student_enrollments AS
SELECT s.student_id, s.name AS student_name,
       d.name AS department,
       c.code AS course_code, c.name AS course_name,
       e.semester, e.grade
FROM   student s
JOIN   department d  ON s.dept_id   = d.dept_id
JOIN   enrollment e  ON s.student_id = e.student_id
JOIN   course c      ON e.course_id  = c.course_id;

-- Attempting UPDATE v_student_enrollments SET grade = 'A' WHERE ...
-- would fail: ERROR: cannot update a view with a JOIN

-- ═══════════════════════════════════════════════════════════════
-- VIEW 3 (Non-updatable) — Library issue summary with aggregation
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW v_library_summary AS
SELECT s.student_id, s.name,
       COUNT(bi.issue_id)   AS total_issues,
       SUM(bi.fine_amount)  AS total_fines,
       COUNT(*) FILTER (WHERE bi.returned_at IS NULL) AS currently_issued
FROM   student s
LEFT JOIN book_issue bi ON s.student_id = bi.student_id
GROUP BY s.student_id, s.name;

-- ═══════════════════════════════════════════════════════════════
-- VIEW 4 (Updatable) — Room simple view
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW v_rooms AS
SELECT room_id, name, building, capacity
FROM   room;

-- This is updatable (single table, no aggregates).
-- UPDATE v_rooms SET capacity = 150 WHERE room_id = 2;

-- ═══════════════════════════════════════════════════════════════
-- VIEW 5 — Upcoming approved bookings
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW v_upcoming_bookings AS
SELECT eb.booking_id, r.name AS room, r.building,
       s.name AS organizer, eb.purpose,
       eb.start_time, eb.end_time, eb.status
FROM   event_booking eb
JOIN   room r    ON eb.room_id = r.room_id
JOIN   student s ON eb.organizer_student_id = s.student_id
WHERE  eb.status = 'approved'
  AND  eb.start_time > CURRENT_TIMESTAMP;

-- ═══════════════════════════════════════════════════════════════
-- Updatable view constraints documentation (in-script)
-- ═══════════════════════════════════════════════════════════════
/*
  PostgreSQL updatable view rules:
  1. FROM must reference exactly ONE table (no joins).
  2. No DISTINCT, GROUP BY, HAVING, LIMIT, OFFSET, UNION, INTERSECT, EXCEPT.
  3. No aggregate functions (COUNT, SUM, etc.) in the SELECT.
  4. No sub-queries in the SELECT.
  5. Columns must be simple references (no expressions).
  6. WITH CHECK OPTION can enforce that updates stay within the WHERE filter.

  Views v_active_students and v_rooms are updatable.
  Views v_student_enrollments, v_library_summary, v_upcoming_bookings are NOT updatable.
*/

-- ═══════════════════════════════════════════════════════════════
-- INDEXES (additional to schema.sql) — for query optimization
-- ═══════════════════════════════════════════════════════════════

-- Composite index for enrollment lookups
CREATE INDEX IF NOT EXISTS idx_enroll_composite
    ON enrollment(student_id, course_id, semester);

-- Partial index on active book issues
CREATE INDEX IF NOT EXISTS idx_active_issues
    ON book_issue(student_id, due_at)
    WHERE returned_at IS NULL;

-- Index on payment type for filtered aggregation
CREATE INDEX IF NOT EXISTS idx_payment_type
    ON payment(type);

-- Index on event_booking for schedule conflict checks
CREATE INDEX IF NOT EXISTS idx_booking_schedule
    ON event_booking(room_id, start_time, end_time)
    WHERE status IN ('pending','approved');
