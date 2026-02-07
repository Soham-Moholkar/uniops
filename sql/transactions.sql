-- =============================================================
-- UniOps DB — Transactions + Concurrency Control (Unit-IV)
-- Demonstrates ACID, isolation levels, anomalies & fixes.
-- =============================================================

-- ═══════════════════════════════════════════════════════════════
-- DEMO 1: ACID — Atomicity (all-or-nothing)
-- If any step fails, entire transaction rolls back.
-- ═══════════════════════════════════════════════════════════════
BEGIN;
    -- Step 1: Issue a book
    INSERT INTO book_issue (student_id, book_id)
    VALUES (1, 3);

    -- Step 2: Decrement available copies
    UPDATE library_book
    SET    copies_avail = copies_avail - 1
    WHERE  book_id = 3;

    -- Step 3: Simulated check — if copies go negative, abort
    DO $$
    BEGIN
        IF (SELECT copies_avail FROM library_book WHERE book_id = 3) < 0 THEN
            RAISE EXCEPTION 'Copies cannot be negative — rolling back';
        END IF;
    END $$;
COMMIT;    -- Only reached if all steps succeed

-- Rollback example:
-- BEGIN;
--   DELETE FROM student WHERE student_id = 1;
--   -- Oops, wrong student! Undo everything:
-- ROLLBACK;

-- ═══════════════════════════════════════════════════════════════
-- DEMO 2: SAVEPOINT — Partial rollback
-- ═══════════════════════════════════════════════════════════════
BEGIN;
    INSERT INTO payment (student_id, amount, type, ref)
    VALUES (1, 100.00, 'other', 'TEST-1');

    SAVEPOINT sp_before_booking;

    INSERT INTO event_booking (room_id, organizer_student_id,
                               start_time, end_time, purpose, status)
    VALUES (1, 1, '2026-06-01 10:00', '2026-06-01 12:00',
            'Test Event', 'pending');

    -- Suppose we want to undo only the booking but keep the payment:
    ROLLBACK TO SAVEPOINT sp_before_booking;

COMMIT;  -- Payment is committed; booking is not.

-- ═══════════════════════════════════════════════════════════════
-- DEMO 3: Isolation levels
-- PostgreSQL supports: READ COMMITTED (default),
-- REPEATABLE READ, SERIALIZABLE
-- ═══════════════════════════════════════════════════════════════

-- Show current isolation level:
SHOW transaction_isolation;

-- ── 3a: READ COMMITTED (default) ──
-- Session A reads data; Session B commits a change;
-- Session A re-reads and sees the new data (non-repeatable read).

-- ── 3b: REPEATABLE READ ──
-- SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
-- BEGIN;
--   SELECT copies_avail FROM library_book WHERE book_id = 1;
--   -- Another session updates copies_avail and commits.
--   SELECT copies_avail FROM library_book WHERE book_id = 1;
--   -- ^ Still sees original value (snapshot isolation).
-- COMMIT;

-- ── 3c: SERIALIZABLE ──
-- SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- Provides full serializability; may throw serialization failure error.

-- ═══════════════════════════════════════════════════════════════
-- DEMO 4: Lost Update Anomaly + Fix
-- ═══════════════════════════════════════════════════════════════

/*
  Scenario (pseudo-code for two sessions):

  SESSION A                              SESSION B
  ─────────────────────────────────────  ─────────────────────────────────────
  BEGIN;                                 BEGIN;
  SELECT copies_avail FROM               SELECT copies_avail FROM
    library_book WHERE book_id=1;          library_book WHERE book_id=1;
  -- reads 5                              -- reads 5
  UPDATE library_book                    
  SET copies_avail = 4                   UPDATE library_book
  WHERE book_id = 1;                     SET copies_avail = 4
                                         WHERE book_id = 1;
  COMMIT;                                COMMIT;
  -- Final: copies_avail = 4 (should be 3 if both decremented!)
  -- This is a LOST UPDATE.

  FIX: Use SELECT ... FOR UPDATE to obtain a row-level lock:

  SESSION A                              SESSION B
  ─────────────────────────────────────  ─────────────────────────────────────
  BEGIN;                                 BEGIN;
  SELECT copies_avail FROM               SELECT copies_avail FROM
    library_book WHERE book_id=1           library_book WHERE book_id=1
    FOR UPDATE;                            FOR UPDATE;
  -- gets lock, reads 5                   -- BLOCKS (waits for A's lock)
  UPDATE ... SET copies_avail=4 ...;
  COMMIT;                                -- lock released, B reads 4
                                         UPDATE ... SET copies_avail=3 ...;
                                         COMMIT;
  -- Final: copies_avail = 3 ✓
*/

-- ═══════════════════════════════════════════════════════════════
-- DEMO 5: Dirty Read Prevention
-- ═══════════════════════════════════════════════════════════════

/*
  PostgreSQL does NOT allow dirty reads even at READ COMMITTED.
  Demonstration (no dirty read occurs):

  SESSION A                              SESSION B
  ─────────────────────────────────────  ─────────────────────────────────────
  BEGIN;
  UPDATE library_book
  SET copies_avail = 0                   BEGIN;
  WHERE book_id = 1;                     SELECT copies_avail FROM
  -- NOT committed yet                     library_book WHERE book_id=1;
                                         -- Still sees original value (5),
                                         -- NOT 0 (no dirty read).
  ROLLBACK;                              COMMIT;
*/

-- ═══════════════════════════════════════════════════════════════
-- DEMO 6: Deadlock scenario
-- ═══════════════════════════════════════════════════════════════

/*
  SESSION A                              SESSION B
  ─────────────────────────────────────  ─────────────────────────────────────
  BEGIN;                                 BEGIN;
  UPDATE library_book                    UPDATE library_book
  SET copies_avail = copies_avail - 1    SET copies_avail = copies_avail - 1
  WHERE book_id = 1;                     WHERE book_id = 2;
  -- holds lock on book 1                -- holds lock on book 2

  UPDATE library_book                    UPDATE library_book
  SET copies_avail = copies_avail - 1    SET copies_avail = copies_avail - 1
  WHERE book_id = 2;                     WHERE book_id = 1;
  -- WAITS for book 2 lock               -- WAITS for book 1 lock

  -- DEADLOCK DETECTED by PostgreSQL!
  -- One session receives: ERROR: deadlock detected
  -- PostgreSQL automatically aborts one transaction.

  RESOLUTION STRATEGIES:
  1. Always lock resources in consistent order (e.g., by book_id ASC).
  2. Use shorter transactions.
  3. Use NOWAIT or lock_timeout to fail fast.
*/

-- ═══════════════════════════════════════════════════════════════
-- DEMO 7: Explicit locking examples
-- ═══════════════════════════════════════════════════════════════

-- Row-level lock (most common):
-- SELECT * FROM library_book WHERE book_id = 1 FOR UPDATE;

-- Row-level shared lock:
-- SELECT * FROM library_book WHERE book_id = 1 FOR SHARE;

-- Skip locked rows (useful for job queues):
-- SELECT * FROM event_booking WHERE status = 'pending'
-- FOR UPDATE SKIP LOCKED LIMIT 1;

-- Table-level lock (rare):
-- LOCK TABLE library_book IN EXCLUSIVE MODE;

-- Advisory lock (application-level):
-- SELECT pg_advisory_lock(42);
-- ... do work ...
-- SELECT pg_advisory_unlock(42);

-- ═══════════════════════════════════════════════════════════════
-- TCL Summary
-- ═══════════════════════════════════════════════════════════════
/*
  TCL Commands demonstrated:
  - BEGIN / START TRANSACTION
  - COMMIT
  - ROLLBACK
  - SAVEPOINT / ROLLBACK TO SAVEPOINT
  - SET TRANSACTION ISOLATION LEVEL
  - SELECT ... FOR UPDATE
  - SELECT ... FOR SHARE
  - LOCK TABLE
*/
