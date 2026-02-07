-- =============================================================
-- UniOps DB — Seed Data
-- =============================================================

-- ── 1. User Accounts (passwords hashed with pgcrypto) ──
INSERT INTO user_account (email, password_hash, role) VALUES
  ('admin@uni.edu',   crypt('admin123',   gen_salt('bf')), 'admin'),
  ('alice@uni.edu',   crypt('student123', gen_salt('bf')), 'student'),
  ('bob@uni.edu',     crypt('student123', gen_salt('bf')), 'student'),
  ('carol@uni.edu',   crypt('student123', gen_salt('bf')), 'student'),
  ('dave@uni.edu',    crypt('student123', gen_salt('bf')), 'student'),
  ('eve@uni.edu',     crypt('student123', gen_salt('bf')), 'student'),
  ('staff@uni.edu',   crypt('staff123',   gen_salt('bf')), 'staff'),
  ('libr@uni.edu',    crypt('staff123',   gen_salt('bf')), 'staff');

-- ── 2. Departments ──
INSERT INTO department (name) VALUES
  ('Computer Science'),
  ('Electrical Engineering'),
  ('Mechanical Engineering'),
  ('Mathematics'),
  ('Physics');

-- ── 3. Students ──
INSERT INTO student (user_id, name, email, phone, dept_id, year, status) VALUES
  (2, 'Alice Johnson',  'alice@uni.edu',  '9876543210', 1, 2, 'active'),
  (3, 'Bob Smith',      'bob@uni.edu',    '9876543211', 1, 3, 'active'),
  (4, 'Carol Davis',    'carol@uni.edu',  '9876543212', 2, 1, 'active'),
  (5, 'Dave Wilson',    'dave@uni.edu',   '9876543213', 3, 4, 'active'),
  (6, 'Eve Martinez',   'eve@uni.edu',    '9876543214', 4, 2, 'active');

-- ── 4. Courses ──
INSERT INTO course (dept_id, code, name, credits) VALUES
  (1, 'CS201', 'Data Structures',        4),
  (1, 'CS301', 'Database Systems',       4),
  (1, 'CS302', 'Operating Systems',      3),
  (2, 'EE201', 'Circuit Theory',         4),
  (2, 'EE301', 'Signal Processing',      3),
  (3, 'ME201', 'Thermodynamics',         4),
  (4, 'MA201', 'Linear Algebra',         3),
  (4, 'MA301', 'Probability & Stats',    3),
  (5, 'PH201', 'Quantum Mechanics',      4),
  (1, 'CS401', 'Machine Learning',       4);

-- ── 5. Enrollments ──
INSERT INTO enrollment (student_id, course_id, semester, grade) VALUES
  (1, 1, 'F2025', 'A'),
  (1, 2, 'F2025', 'A'),
  (1, 7, 'F2025', 'B+'),
  (2, 1, 'F2025', 'B'),
  (2, 2, 'F2025', NULL),     -- in progress
  (2, 3, 'F2025', 'A'),
  (3, 4, 'F2025', 'B+'),
  (3, 5, 'F2025', NULL),
  (4, 6, 'F2025', 'A'),
  (5, 7, 'F2025', 'A'),
  (5, 8, 'F2025', 'B'),
  (1, 10, 'S2026', NULL),
  (2, 10, 'S2026', NULL);

-- ── 6. Library Books ──
INSERT INTO library_book (isbn, title, author, copies_total, copies_avail, book_type) VALUES
  ('978-0-13-468599-1', 'Database System Concepts',         'Silberschatz et al.',  5, 5, 'circulating'),
  ('978-0-262-03384-8', 'Introduction to Algorithms',       'Cormen et al.',        4, 4, 'circulating'),
  ('978-0-13-235088-4', 'Operating System Concepts',        'Silberschatz et al.',  3, 3, 'circulating'),
  ('978-0-07-352330-7', 'Discrete Mathematics',             'Rosen',                3, 3, 'circulating'),
  ('978-0-321-12521-7', 'Domain-Driven Design',             'Eric Evans',           2, 2, 'circulating'),
  ('978-0-201-63361-0', 'Design Patterns',                  'Gang of Four',         2, 2, 'reference'),
  ('978-0-13-110362-7', 'The C Programming Language',       'K&R',                  3, 3, 'reference'),
  ('978-0-596-51774-8', 'JavaScript: The Good Parts',       'Crockford',            4, 4, 'circulating'),
  ('978-1-491-95038-8', 'Fluent Python',                    'Luciano Ramalho',      3, 3, 'circulating'),
  ('978-0-134-68599-1', 'Clean Code',                       'Robert C. Martin',     4, 4, 'circulating');

-- ── 7. Book Issues ──
INSERT INTO book_issue (student_id, book_id, issued_at, due_at, returned_at, fine_amount) VALUES
  (1, 1, '2025-12-01', '2025-12-15', '2025-12-14', 0.00),
  (1, 2, '2025-12-10', '2025-12-24', NULL, 0.00),           -- currently issued
  (2, 1, '2025-11-20', '2025-12-04', '2025-12-10', 30.00), -- returned late, fine
  (3, 4, '2026-01-05', '2026-01-19', NULL, 0.00),
  (5, 9, '2026-01-10', '2026-01-24', '2026-01-20', 0.00);

-- Update copies_avail for currently issued books
UPDATE library_book SET copies_avail = copies_avail - 1 WHERE book_id = 2;  -- Alice
UPDATE library_book SET copies_avail = copies_avail - 1 WHERE book_id = 4;  -- Carol

-- ── 8. Rooms ──
INSERT INTO room (name, building, capacity) VALUES
  ('Auditorium A',    'Main Block',     500),
  ('Seminar Hall 1',  'CS Block',       120),
  ('Lab 301',         'CS Block',        60),
  ('Conference Room', 'Admin Block',     30),
  ('Open Arena',      'Sports Complex', 2000);

-- ── 9. Event Bookings ──
INSERT INTO event_booking (room_id, organizer_student_id, start_time, end_time, purpose, status) VALUES
  (2, 1, '2026-02-10 10:00', '2026-02-10 12:00', 'DBMS Workshop',           'approved'),
  (1, 2, '2026-02-15 14:00', '2026-02-15 17:00', 'Cultural Fest Rehearsal',  'pending'),
  (4, 3, '2026-02-12 09:00', '2026-02-12 10:30', 'Dept Meeting',            'approved'),
  (3, 1, '2026-02-20 14:00', '2026-02-20 16:00', 'ML Lab Session',          'pending');

-- ── 10. Payments ──
INSERT INTO payment (student_id, amount, type, paid_at, ref) VALUES
  (1, 50000.00, 'tuition',      '2025-08-01', 'TXN-2025-0001'),
  (2, 50000.00, 'tuition',      '2025-08-01', 'TXN-2025-0002'),
  (3, 48000.00, 'tuition',      '2025-08-05', 'TXN-2025-0003'),
  (4, 52000.00, 'tuition',      '2025-08-02', 'TXN-2025-0004'),
  (5, 45000.00, 'tuition',      '2025-08-03', 'TXN-2025-0005'),
  (2, 30.00,    'library_fine', '2025-12-10', 'FINE-2025-0001'),
  (1, 500.00,   'event_fee',   '2026-02-01', 'EVT-2026-0001');
