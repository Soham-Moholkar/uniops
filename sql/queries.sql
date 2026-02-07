-- =============================================================
-- UniOps DB — Complex Queries (Unit-II Coverage)
-- Demonstrates: joins, nested queries, GROUP BY/HAVING,
--   set ops, aggregates, correlated subqueries, tuple vars
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- Q1: INNER JOIN — Students with their department names
-- ─────────────────────────────────────────────────────────────
SELECT s.student_id, s.name, s.email, d.name AS department
FROM   student s
JOIN   department d ON s.dept_id = d.dept_id
ORDER BY s.name;

-- ─────────────────────────────────────────────────────────────
-- Q2: LEFT JOIN — All books and their issue count (even unissued)
-- ─────────────────────────────────────────────────────────────
SELECT lb.book_id, lb.title, lb.book_type,
       COUNT(bi.issue_id) AS times_issued
FROM   library_book lb
LEFT JOIN book_issue bi ON lb.book_id = bi.book_id
GROUP BY lb.book_id, lb.title, lb.book_type
ORDER BY times_issued DESC;

-- ─────────────────────────────────────────────────────────────
-- Q3: GROUP BY + HAVING — Departments with > 1 enrolled student
-- ─────────────────────────────────────────────────────────────
SELECT d.name AS department,
       COUNT(DISTINCT e.student_id) AS enrolled_students
FROM   department d
JOIN   course c   ON d.dept_id = c.dept_id
JOIN   enrollment e ON c.course_id = e.course_id
GROUP BY d.name
HAVING COUNT(DISTINCT e.student_id) > 1
ORDER BY enrolled_students DESC;

-- ─────────────────────────────────────────────────────────────
-- Q4: Nested query — Students who have never issued a book
-- ─────────────────────────────────────────────────────────────
SELECT s.student_id, s.name
FROM   student s
WHERE  s.student_id NOT IN (
           SELECT bi.student_id FROM book_issue bi
       );

-- ─────────────────────────────────────────────────────────────
-- Q5: Correlated subquery — Students whose fine exceeds average
-- ─────────────────────────────────────────────────────────────
SELECT s.student_id, s.name, bi.fine_amount
FROM   student s
JOIN   book_issue bi ON s.student_id = bi.student_id
WHERE  bi.fine_amount > (
           SELECT AVG(bi2.fine_amount)
           FROM   book_issue bi2
           WHERE  bi2.fine_amount > 0
       );

-- ─────────────────────────────────────────────────────────────
-- Q6: UNION — All emails from students and user_accounts
-- ─────────────────────────────────────────────────────────────
SELECT email, 'student' AS source FROM student
UNION
SELECT email, 'user_account' AS source FROM user_account;

-- ─────────────────────────────────────────────────────────────
-- Q7: INTERSECT — Emails present in both student and user_account
-- ─────────────────────────────────────────────────────────────
SELECT email FROM student
INTERSECT
SELECT email FROM user_account;

-- ─────────────────────────────────────────────────────────────
-- Q8: EXCEPT — User accounts that are NOT linked to a student
-- ─────────────────────────────────────────────────────────────
SELECT email FROM user_account
EXCEPT
SELECT email FROM student;

-- ─────────────────────────────────────────────────────────────
-- Q9: IN + subquery — Courses taken by student 'Alice Johnson'
-- ─────────────────────────────────────────────────────────────
SELECT c.code, c.name, e.semester, e.grade
FROM   course c
JOIN   enrollment e ON c.course_id = e.course_id
WHERE  e.student_id IN (
           SELECT student_id FROM student WHERE name = 'Alice Johnson'
       );

-- ─────────────────────────────────────────────────────────────
-- Q10: Aggregate functions — Payment summary per student
-- ─────────────────────────────────────────────────────────────
SELECT s.name,
       COUNT(p.payment_id) AS payment_count,
       SUM(p.amount)       AS total_paid,
       AVG(p.amount)       AS avg_payment,
       MIN(p.amount)       AS min_payment,
       MAX(p.amount)       AS max_payment
FROM   student s
JOIN   payment p ON s.student_id = p.student_id
GROUP BY s.name
ORDER BY total_paid DESC;

-- ─────────────────────────────────────────────────────────────
-- Q11: < SOME (= ANY) — Books with more copies than at least
--      one reference book
-- ─────────────────────────────────────────────────────────────
SELECT title, copies_total
FROM   library_book
WHERE  copies_total > SOME (
           SELECT copies_total FROM library_book WHERE book_type = 'reference'
       );

-- ─────────────────────────────────────────────────────────────
-- Q12: >= ALL — The book(s) with the most total copies
-- ─────────────────────────────────────────────────────────────
SELECT title, copies_total
FROM   library_book
WHERE  copies_total >= ALL (
           SELECT copies_total FROM library_book
       );

-- ─────────────────────────────────────────────────────────────
-- Q13: Tuple variable / self-join — Students in the same dept
-- ─────────────────────────────────────────────────────────────
SELECT s1.name AS student_a, s2.name AS student_b, d.name AS department
FROM   student s1
JOIN   student s2 ON s1.dept_id = s2.dept_id AND s1.student_id < s2.student_id
JOIN   department d ON s1.dept_id = d.dept_id;

-- ─────────────────────────────────────────────────────────────
-- Q14: ORDER BY + LIMIT — Top 3 students by total payments
-- ─────────────────────────────────────────────────────────────
SELECT s.name, SUM(p.amount) AS total_paid
FROM   student s
JOIN   payment p ON s.student_id = p.student_id
GROUP BY s.name
ORDER BY total_paid DESC
LIMIT 3;

-- ─────────────────────────────────────────────────────────────
-- Q15: EXISTS — Rooms that have at least one approved booking
-- ─────────────────────────────────────────────────────────────
SELECT r.room_id, r.name, r.building
FROM   room r
WHERE  EXISTS (
           SELECT 1 FROM event_booking eb
           WHERE  eb.room_id = r.room_id AND eb.status = 'approved'
       );

-- ─────────────────────────────────────────────────────────────
-- Q16: Multi-table join — Overdue books with student & book info
-- ─────────────────────────────────────────────────────────────
SELECT s.name AS student, lb.title AS book,
       bi.issued_at, bi.due_at,
       CURRENT_TIMESTAMP - bi.due_at AS overdue_by
FROM   book_issue bi
JOIN   student s      ON bi.student_id = s.student_id
JOIN   library_book lb ON bi.book_id    = lb.book_id
WHERE  bi.returned_at IS NULL
  AND  bi.due_at < CURRENT_TIMESTAMP
ORDER BY bi.due_at;

-- ─────────────────────────────────────────────────────────────
-- Q17: INSERT with SELECT — Bulk-create fine payments for overdue
-- ─────────────────────────────────────────────────────────────
-- (Wrapped in a DO block so it doesn't actually fire during demo)
-- INSERT INTO payment (student_id, amount, type, ref)
-- SELECT bi.student_id,
--        EXTRACT(DAY FROM CURRENT_TIMESTAMP - bi.due_at) * 5.00,
--        'library_fine',
--        'AUTO-FINE-' || bi.issue_id
-- FROM   book_issue bi
-- WHERE  bi.returned_at IS NULL AND bi.due_at < CURRENT_TIMESTAMP;

-- ─────────────────────────────────────────────────────────────
-- Q18: UPDATE with subquery — Suspend students with fine > 100
-- ─────────────────────────────────────────────────────────────
-- UPDATE student
-- SET    status = 'suspended'
-- WHERE  student_id IN (
--            SELECT student_id FROM book_issue
--            WHERE  fine_amount > 100
--        );

-- ─────────────────────────────────────────────────────────────
-- Q19: DELETE with condition — Remove cancelled bookings older
--      than 6 months
-- ─────────────────────────────────────────────────────────────
-- DELETE FROM event_booking
-- WHERE  status = 'cancelled'
--   AND  created_at < CURRENT_TIMESTAMP - INTERVAL '6 months';

-- ─────────────────────────────────────────────────────────────
-- Q20: Window function (bonus) — Rank students by total payment
-- ─────────────────────────────────────────────────────────────
SELECT s.name,
       SUM(p.amount) AS total_paid,
       RANK() OVER (ORDER BY SUM(p.amount) DESC) AS pay_rank
FROM   student s
JOIN   payment p ON s.student_id = p.student_id
GROUP BY s.name;
