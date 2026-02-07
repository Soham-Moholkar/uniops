-- =============================================================
-- UniOps DB — Stored Procedures & Functions (PL/pgSQL)
-- Maps to PL/SQL syllabus: procedures, functions, cursors
-- =============================================================

-- ═══════════════════════════════════════════════════════════════
-- FUNCTION: calculate_fine(issue_id) → NUMERIC
-- Calculates fine at ₹5/day for overdue books.
-- PL/SQL mapping: CREATE FUNCTION ... RETURN NUMBER
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION calculate_fine(p_issue_id INT)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_due       TIMESTAMP;
    v_returned  TIMESTAMP;
    v_days      INT;
    v_fine      NUMERIC(8,2);
BEGIN
    SELECT due_at, returned_at
    INTO   v_due, v_returned
    FROM   book_issue
    WHERE  issue_id = p_issue_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Issue ID % not found', p_issue_id;
    END IF;

    -- Use return date if returned, else current time
    IF v_returned IS NOT NULL THEN
        v_days := GREATEST(0, EXTRACT(DAY FROM v_returned - v_due)::INT);
    ELSE
        v_days := GREATEST(0, EXTRACT(DAY FROM NOW() - v_due)::INT);
    END IF;

    v_fine := v_days * 5.00;  -- ₹5 per day
    RETURN v_fine;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- PROCEDURE: issue_book(student_id, book_id)
-- Business logic: check book_type, availability, max issues,
-- then insert book_issue and decrement copies_avail.
-- PL/SQL mapping: CREATE PROCEDURE
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE PROCEDURE issue_book(
    p_student_id INT,
    p_book_id    INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_book_type   VARCHAR(15);
    v_avail       INT;
    v_active      INT;
    v_max_issues  CONSTANT INT := 3;
BEGIN
    -- 1) Validate book exists & check type
    SELECT book_type, copies_avail
    INTO   v_book_type, v_avail
    FROM   library_book
    WHERE  book_id = p_book_id
    FOR UPDATE;  -- row-level lock

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Book ID % does not exist', p_book_id;
    END IF;

    IF v_book_type = 'reference' THEN
        RAISE EXCEPTION 'Cannot issue a reference book (book_id=%)', p_book_id;
    END IF;

    IF v_avail <= 0 THEN
        RAISE EXCEPTION 'No copies available for book_id=%', p_book_id;
    END IF;

    -- 2) Check student active issue count
    SELECT COUNT(*)
    INTO   v_active
    FROM   book_issue
    WHERE  student_id = p_student_id
      AND  returned_at IS NULL;

    IF v_active >= v_max_issues THEN
        RAISE EXCEPTION 'Student % already has % active issues (max=%)',
                         p_student_id, v_active, v_max_issues;
    END IF;

    -- 3) Insert issue record
    INSERT INTO book_issue (student_id, book_id, issued_at, due_at)
    VALUES (p_student_id, p_book_id, NOW(), NOW() + INTERVAL '14 days');

    -- 4) Decrement available copies
    UPDATE library_book
    SET    copies_avail = copies_avail - 1
    WHERE  book_id = p_book_id;

    RAISE NOTICE 'Book % issued to student %', p_book_id, p_student_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- PROCEDURE: return_book(issue_id)
-- Marks return, calculates fine, increments copies_avail.
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE PROCEDURE return_book(
    p_issue_id INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_book_id    INT;
    v_fine       NUMERIC(8,2);
    v_returned   TIMESTAMP;
BEGIN
    -- 1) Lock the issue row
    SELECT book_id, returned_at
    INTO   v_book_id, v_returned
    FROM   book_issue
    WHERE  issue_id = p_issue_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Issue ID % not found', p_issue_id;
    END IF;

    IF v_returned IS NOT NULL THEN
        RAISE EXCEPTION 'Issue % already returned', p_issue_id;
    END IF;

    -- 2) Calculate fine
    v_fine := calculate_fine(p_issue_id);

    -- 3) Update issue
    UPDATE book_issue
    SET    returned_at = NOW(),
           fine_amount = v_fine
    WHERE  issue_id = p_issue_id;

    -- 4) Increment copies
    UPDATE library_book
    SET    copies_avail = copies_avail + 1
    WHERE  book_id = v_book_id;

    -- 5) If fine > 0, create payment record
    IF v_fine > 0 THEN
        INSERT INTO payment (student_id, amount, type, ref)
        SELECT bi.student_id, v_fine, 'library_fine',
               'FINE-ISS-' || p_issue_id
        FROM   book_issue bi
        WHERE  bi.issue_id = p_issue_id;
    END IF;

    RAISE NOTICE 'Book returned for issue %. Fine: %', p_issue_id, v_fine;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- CURSOR EXAMPLE: Bulk reminder list for overdue books
-- PL/SQL mapping: DECLARE CURSOR ... IS ... ; OPEN; FETCH; CLOSE;
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION generate_overdue_reminders()
RETURNS TABLE(student_name VARCHAR, student_email VARCHAR,
              book_title VARCHAR, due_date TIMESTAMP, days_overdue INT)
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
    cur CURSOR FOR
        SELECT s.name AS sname, s.email AS semail,
               lb.title AS btitle, bi.due_at,
               EXTRACT(DAY FROM NOW() - bi.due_at)::INT AS doverdue
        FROM   book_issue bi
        JOIN   student s      ON bi.student_id = s.student_id
        JOIN   library_book lb ON bi.book_id   = lb.book_id
        WHERE  bi.returned_at IS NULL
          AND  bi.due_at < NOW()
        ORDER BY bi.due_at;
BEGIN
    OPEN cur;
    LOOP
        FETCH cur INTO rec;
        EXIT WHEN NOT FOUND;

        student_name  := rec.sname;
        student_email := rec.semail;
        book_title    := rec.btitle;
        due_date      := rec.due_at;
        days_overdue  := rec.doverdue;

        RAISE NOTICE 'REMINDER: % (%) — "%" overdue by % days',
                      rec.sname, rec.semail, rec.btitle, rec.doverdue;

        RETURN NEXT;
    END LOOP;
    CLOSE cur;
END;
$$;

-- Usage: SELECT * FROM generate_overdue_reminders();

-- ═══════════════════════════════════════════════════════════════
-- PROCEDURE: approve_booking(booking_id)
-- Checks for schedule conflicts before approving.
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE PROCEDURE approve_booking(
    p_booking_id INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_room_id    INT;
    v_start      TIMESTAMP;
    v_end        TIMESTAMP;
    v_conflict   INT;
BEGIN
    SELECT room_id, start_time, end_time
    INTO   v_room_id, v_start, v_end
    FROM   event_booking
    WHERE  booking_id = p_booking_id AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking % not found or not in pending state', p_booking_id;
    END IF;

    -- Check overlapping approved bookings for same room
    SELECT COUNT(*)
    INTO   v_conflict
    FROM   event_booking
    WHERE  room_id = v_room_id
      AND  booking_id != p_booking_id
      AND  status = 'approved'
      AND  start_time < v_end
      AND  end_time   > v_start;

    IF v_conflict > 0 THEN
        RAISE EXCEPTION 'Schedule conflict: room % is already booked for that time', v_room_id;
    END IF;

    UPDATE event_booking
    SET    status = 'approved'
    WHERE  booking_id = p_booking_id;

    RAISE NOTICE 'Booking % approved', p_booking_id;
END;
$$;
