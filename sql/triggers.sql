-- =============================================================
-- UniOps DB — Triggers (PL/pgSQL)
-- Maps to PL/SQL syllabus: BEFORE/AFTER triggers, row-level
-- =============================================================

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER 1: BEFORE INSERT on book_issue
-- Prevent issuing a ReferenceBook.
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_prevent_reference_issue()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_type VARCHAR(15);
BEGIN
    SELECT book_type INTO v_type
    FROM   library_book
    WHERE  book_id = NEW.book_id;

    IF v_type = 'reference' THEN
        RAISE EXCEPTION 'Cannot issue reference book (book_id=%)', NEW.book_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_book_issue_before_insert
    BEFORE INSERT ON book_issue
    FOR EACH ROW
    EXECUTE FUNCTION trg_prevent_reference_issue();

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER 2: AFTER UPDATE on book_issue (returned_at set)
-- Auto-compute fine and create payment record.
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_auto_fine_on_return()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_fine NUMERIC(8,2);
    v_days INT;
BEGIN
    -- Only fire when returned_at changes from NULL to a value
    IF OLD.returned_at IS NULL AND NEW.returned_at IS NOT NULL THEN
        v_days := GREATEST(0, EXTRACT(DAY FROM NEW.returned_at - NEW.due_at)::INT);
        v_fine := v_days * 5.00;

        -- Update the fine_amount on the issue row
        IF v_fine > 0 AND NEW.fine_amount = 0 THEN
            NEW.fine_amount := v_fine;

            INSERT INTO payment (student_id, amount, type, ref)
            VALUES (NEW.student_id, v_fine, 'library_fine',
                    'AUTO-FINE-ISS-' || NEW.issue_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Use BEFORE UPDATE so we can modify NEW.fine_amount
CREATE TRIGGER trg_book_issue_auto_fine
    BEFORE UPDATE ON book_issue
    FOR EACH ROW
    EXECUTE FUNCTION trg_auto_fine_on_return();

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER 3: Audit log on student table
-- Logs INSERT / UPDATE / DELETE.
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_audit_student()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, row_id, new_data, changed_by)
        VALUES ('student', 'INSERT', NEW.student_id,
                row_to_json(NEW)::jsonb, current_user);
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, row_id, old_data, new_data, changed_by)
        VALUES ('student', 'UPDATE', NEW.student_id,
                row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, current_user);
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, row_id, old_data, changed_by)
        VALUES ('student', 'DELETE', OLD.student_id,
                row_to_json(OLD)::jsonb, current_user);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_student_audit
    AFTER INSERT OR UPDATE OR DELETE ON student
    FOR EACH ROW
    EXECUTE FUNCTION trg_audit_student();

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER 4: Audit log on book_issue table
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_audit_book_issue()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, row_id, new_data, changed_by)
        VALUES ('book_issue', 'INSERT', NEW.issue_id,
                row_to_json(NEW)::jsonb, current_user);
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, row_id, old_data, new_data, changed_by)
        VALUES ('book_issue', 'UPDATE', NEW.issue_id,
                row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, current_user);
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, row_id, old_data, changed_by)
        VALUES ('book_issue', 'DELETE', OLD.issue_id,
                row_to_json(OLD)::jsonb, current_user);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_book_issue_audit
    AFTER INSERT OR UPDATE OR DELETE ON book_issue
    FOR EACH ROW
    EXECUTE FUNCTION trg_audit_book_issue();

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER 5: Audit log on event_booking table
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_audit_event_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, row_id, new_data, changed_by)
        VALUES ('event_booking', 'INSERT', NEW.booking_id,
                row_to_json(NEW)::jsonb, current_user);
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, row_id, old_data, new_data, changed_by)
        VALUES ('event_booking', 'UPDATE', NEW.booking_id,
                row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, current_user);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_event_booking_audit
    AFTER INSERT OR UPDATE ON event_booking
    FOR EACH ROW
    EXECUTE FUNCTION trg_audit_event_booking();

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER 6: BEFORE INSERT on event_booking
-- Prevent double-booking (overlapping approved/pending for same room)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_prevent_double_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_conflict INT;
BEGIN
    SELECT COUNT(*) INTO v_conflict
    FROM   event_booking
    WHERE  room_id = NEW.room_id
      AND  status IN ('approved', 'pending')
      AND  start_time < NEW.end_time
      AND  end_time   > NEW.start_time;

    IF v_conflict > 0 THEN
        RAISE EXCEPTION 'Room % is already booked during % to %',
                         NEW.room_id, NEW.start_time, NEW.end_time;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_event_booking_no_overlap
    BEFORE INSERT ON event_booking
    FOR EACH ROW
    EXECUTE FUNCTION trg_prevent_double_booking();
