# Transaction & Concurrency Control Demo

## 1. ACID Properties Demonstrated

| Property | How Demonstrated | Script Reference |
|----------|-----------------|-----------------|
| **Atomicity** | Book issue transaction: INSERT + UPDATE wrapped in BEGIN/COMMIT. If copies go negative, RAISE EXCEPTION causes full rollback. | `transactions.sql` Demo 1 |
| **Consistency** | CHECK constraints ensure `copies_avail >= 0`, `copies_avail <= copies_total`. Triggers enforce business rules. | `schema.sql` constraints |
| **Isolation** | `READ COMMITTED` default prevents dirty reads. `FOR UPDATE` prevents lost updates. `REPEATABLE READ` prevents non-repeatable reads. | `transactions.sql` Demo 3-5 |
| **Durability** | After COMMIT, data survives crash (PostgreSQL WAL). Verified by reading committed data in separate session. | PostgreSQL default behavior |

## 2. Transaction Control Language (TCL) Commands

```sql
BEGIN;                                    -- Start transaction
COMMIT;                                   -- Make changes permanent
ROLLBACK;                                 -- Undo all changes
SAVEPOINT sp_name;                        -- Create savepoint
ROLLBACK TO SAVEPOINT sp_name;            -- Partial rollback
SET TRANSACTION ISOLATION LEVEL ...;      -- Set isolation
```

### Savepoint Demo (transactions.sql Demo 2)

```sql
BEGIN;
    INSERT INTO payment (...);            -- Step 1: succeeds
    SAVEPOINT sp_before_booking;
    INSERT INTO event_booking (...);      -- Step 2: insert
    ROLLBACK TO SAVEPOINT sp_before_booking;  -- Undo step 2 only
COMMIT;                                   -- Payment committed, booking undone
```

## 3. Isolation Levels in PostgreSQL

| Level | Dirty Read | Non-repeatable Read | Phantom Read |
|-------|-----------|-------------------|-------------|
| READ UNCOMMITTED* | No | Yes | Yes |
| READ COMMITTED (default) | No | Yes | Yes |
| REPEATABLE READ | No | No | No** |
| SERIALIZABLE | No | No | No |

*PostgreSQL treats READ UNCOMMITTED as READ COMMITTED (never allows dirty reads).
**PostgreSQL's REPEATABLE READ uses snapshot isolation, which also prevents phantoms.

## 4. Concurrency Anomalies & Fixes

### 4.1 Lost Update Anomaly

**Problem:** Two transactions read the same value, compute a new value, and write it. One update is lost.

```
Session A                          Session B
─────────                          ─────────
BEGIN;                             BEGIN;
SELECT copies_avail → 5           SELECT copies_avail → 5
UPDATE SET copies_avail = 4       UPDATE SET copies_avail = 4
COMMIT;                            COMMIT;
-- Final: 4 (should be 3!)
```

**Fix: SELECT ... FOR UPDATE**

```
Session A                          Session B
─────────                          ─────────
BEGIN;                             BEGIN;
SELECT ... FOR UPDATE → 5          SELECT ... FOR UPDATE → WAITS
UPDATE SET copies_avail = 4
COMMIT;                            → gets lock, reads 4
                                   UPDATE SET copies_avail = 3
                                   COMMIT;
-- Final: 3 ✓
```

### 4.2 Dirty Read Prevention

PostgreSQL never allows dirty reads, even at READ COMMITTED:

```
Session A                          Session B
─────────                          ─────────
BEGIN;
UPDATE copies_avail = 0
-- NOT committed                   SELECT copies_avail → 5
                                   (sees committed value, NOT 0)
ROLLBACK;
```

### 4.3 Deadlock

```
Session A                          Session B
─────────                          ─────────
BEGIN;                             BEGIN;
UPDATE book WHERE id=1             UPDATE book WHERE id=2
-- holds lock on 1                 -- holds lock on 2
UPDATE book WHERE id=2             UPDATE book WHERE id=1
-- WAITS for 2                     -- WAITS for 1
                                   -- DEADLOCK!
```

**PostgreSQL resolution:** Automatically detects deadlock after `deadlock_timeout` (default 1s) and aborts one transaction with `ERROR: deadlock detected`.

**Prevention strategies:**
1. Always acquire locks in consistent order (e.g., ascending PK)
2. Use shorter transactions
3. Use `lock_timeout` or `NOWAIT`

## 5. Python Concurrency Demo

The script `backend/app/scripts/concurrency_demo.py` demonstrates all three scenarios programmatically:

```bash
cd backend
python -m app.scripts.concurrency_demo
```

**Output:**
```
============================================================
  DEMO 1: Lost Update Anomaly (no locking)
============================================================
  Initial copies_avail = 5
  [A] Read copies_avail = 5
  [B] Read copies_avail = 5
  [A] Wrote copies_avail = 4
  [B] Wrote copies_avail = 4
  Final copies_avail = 4
  Expected = 3, Got = 4
  ⚠ LOST UPDATE detected!

============================================================
  DEMO 2: Fix with SELECT ... FOR UPDATE
============================================================
  Initial copies_avail = 5
  [A] Locked & read copies_avail = 5
  [B] Attempting to lock row (will wait for A)...
  [A] Wrote copies_avail = 4, released lock
  [B] Locked & read copies_avail = 4
  [B] Wrote copies_avail = 3
  Final copies_avail = 3
  Expected = 3, Got = 3
  ✓ No lost update!

============================================================
  DEMO 3: Dirty Read Prevention
============================================================
  [Writer] Updated copies_avail to 0 (NOT committed)
  [Reader] Read copies_avail = 5
  [Writer] Rolled back
  ✓ No dirty read!
```

## 6. Serializability

### Concept

A schedule is **serializable** if its result is equivalent to some serial execution of the same transactions.

### Conflict Serializability

Two operations conflict if they:
1. Belong to different transactions
2. Access the same data item
3. At least one is a WRITE

A schedule is conflict-serializable if its conflict-serializable precedence graph is acyclic.

### In Our System

The `issue_book()` procedure uses `SELECT ... FOR UPDATE`, which ensures that concurrent book issues are serialized — effectively creating a serial schedule for the critical section.

```sql
-- From procedures.sql
SELECT book_type, copies_avail
INTO   v_book_type, v_avail
FROM   library_book
WHERE  book_id = p_book_id
FOR UPDATE;  -- Acquires exclusive row lock
```

This guarantees that:
- T1: read → write is completed before T2 begins its read
- The resulting schedule is equivalent to T1 → T2 (serial)

## 7. Two-Phase Locking (2PL)

PostgreSQL implements **Strict 2PL** for row-level locks:
- **Growing phase:** Locks acquired during transaction
- **Shrinking phase:** All locks released at COMMIT/ROLLBACK (strict = held until end)

This guarantees conflict-serializability but may cause deadlocks (detected and resolved automatically).
