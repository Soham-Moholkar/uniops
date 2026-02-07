"""
Concurrency Demo — Two connections performing interleaved operations.
Demonstrates lost update anomaly and fix with SELECT FOR UPDATE.

Usage: python -m app.scripts.concurrency_demo

Requires PostgreSQL running with seed data.
"""

import threading
import time
from sqlalchemy import create_engine, text
from app.config import get_settings

settings = get_settings()
URL = settings.DATABASE_URL

BOOK_ID = 1  # "Database System Concepts"


def banner(msg: str):
    print(f"\n{'='*60}\n  {msg}\n{'='*60}")


# ─────────────────────────────────────────────────────────────
# DEMO 1: Lost Update (no locking)
# ─────────────────────────────────────────────────────────────
def demo_lost_update():
    banner("DEMO 1: Lost Update Anomaly (no locking)")

    eng = create_engine(URL, isolation_level="READ COMMITTED")

    # Reset copies_avail to 5
    with eng.connect() as c:
        c.execute(text("UPDATE library_book SET copies_avail = 5 WHERE book_id = :b"), {"b": BOOK_ID})
        c.commit()
        print(f"  Initial copies_avail = 5")

    results = {}

    def session_a():
        with eng.connect() as conn:
            conn = conn.execution_options(isolation_level="READ COMMITTED")
            tx = conn.begin()
            row = conn.execute(text("SELECT copies_avail FROM library_book WHERE book_id = :b"), {"b": BOOK_ID}).fetchone()
            current = row[0]
            print(f"  [A] Read copies_avail = {current}")
            time.sleep(0.5)  # Simulate delay
            new_val = current - 1
            conn.execute(text("UPDATE library_book SET copies_avail = :v WHERE book_id = :b"), {"v": new_val, "b": BOOK_ID})
            tx.commit()
            print(f"  [A] Wrote copies_avail = {new_val}")
            results["a"] = new_val

    def session_b():
        time.sleep(0.1)  # Start slightly after A
        with eng.connect() as conn:
            conn = conn.execution_options(isolation_level="READ COMMITTED")
            tx = conn.begin()
            row = conn.execute(text("SELECT copies_avail FROM library_book WHERE book_id = :b"), {"b": BOOK_ID}).fetchone()
            current = row[0]
            print(f"  [B] Read copies_avail = {current}")
            time.sleep(0.1)
            new_val = current - 1
            conn.execute(text("UPDATE library_book SET copies_avail = :v WHERE book_id = :b"), {"v": new_val, "b": BOOK_ID})
            tx.commit()
            print(f"  [B] Wrote copies_avail = {new_val}")
            results["b"] = new_val

    t1 = threading.Thread(target=session_a)
    t2 = threading.Thread(target=session_b)
    t1.start(); t2.start()
    t1.join(); t2.join()

    with eng.connect() as c:
        final = c.execute(text("SELECT copies_avail FROM library_book WHERE book_id = :b"), {"b": BOOK_ID}).fetchone()[0]
    print(f"\n  Final copies_avail = {final}")
    print(f"  Expected = 3 (5 - 2 decrements), Got = {final}")
    if final == 4:
        print("  ⚠ LOST UPDATE detected: one decrement was lost!")
    else:
        print("  (Timing may vary; run again to observe anomaly)")

    eng.dispose()


# ─────────────────────────────────────────────────────────────
# DEMO 2: Fix with SELECT ... FOR UPDATE
# ─────────────────────────────────────────────────────────────
def demo_for_update_fix():
    banner("DEMO 2: Fix with SELECT ... FOR UPDATE")

    eng = create_engine(URL, isolation_level="READ COMMITTED")

    # Reset
    with eng.connect() as c:
        c.execute(text("UPDATE library_book SET copies_avail = 5 WHERE book_id = :b"), {"b": BOOK_ID})
        c.commit()
        print(f"  Initial copies_avail = 5")

    def session_a():
        with eng.connect() as conn:
            tx = conn.begin()
            row = conn.execute(
                text("SELECT copies_avail FROM library_book WHERE book_id = :b FOR UPDATE"),
                {"b": BOOK_ID}
            ).fetchone()
            current = row[0]
            print(f"  [A] Locked & read copies_avail = {current}")
            time.sleep(0.5)
            new_val = current - 1
            conn.execute(text("UPDATE library_book SET copies_avail = :v WHERE book_id = :b"), {"v": new_val, "b": BOOK_ID})
            tx.commit()
            print(f"  [A] Wrote copies_avail = {new_val}, released lock")

    def session_b():
        time.sleep(0.1)
        with eng.connect() as conn:
            tx = conn.begin()
            print(f"  [B] Attempting to lock row (will wait for A)...")
            row = conn.execute(
                text("SELECT copies_avail FROM library_book WHERE book_id = :b FOR UPDATE"),
                {"b": BOOK_ID}
            ).fetchone()
            current = row[0]
            print(f"  [B] Locked & read copies_avail = {current}")
            new_val = current - 1
            conn.execute(text("UPDATE library_book SET copies_avail = :v WHERE book_id = :b"), {"v": new_val, "b": BOOK_ID})
            tx.commit()
            print(f"  [B] Wrote copies_avail = {new_val}")

    t1 = threading.Thread(target=session_a)
    t2 = threading.Thread(target=session_b)
    t1.start(); t2.start()
    t1.join(); t2.join()

    with eng.connect() as c:
        final = c.execute(text("SELECT copies_avail FROM library_book WHERE book_id = :b"), {"b": BOOK_ID}).fetchone()[0]
    print(f"\n  Final copies_avail = {final}")
    print(f"  Expected = 3 (5 - 2), Got = {final}")
    if final == 3:
        print("  ✓ No lost update! FOR UPDATE serialized the access correctly.")

    eng.dispose()


# ─────────────────────────────────────────────────────────────
# DEMO 3: Dirty Read Prevention
# ─────────────────────────────────────────────────────────────
def demo_no_dirty_read():
    banner("DEMO 3: Dirty Read Prevention (PostgreSQL default)")

    eng = create_engine(URL, isolation_level="READ COMMITTED")

    with eng.connect() as c:
        c.execute(text("UPDATE library_book SET copies_avail = 5 WHERE book_id = :b"), {"b": BOOK_ID})
        c.commit()

    results = {}

    def writer():
        with eng.connect() as conn:
            tx = conn.begin()
            conn.execute(text("UPDATE library_book SET copies_avail = 0 WHERE book_id = :b"), {"b": BOOK_ID})
            print("  [Writer] Updated copies_avail to 0 (NOT committed)")
            time.sleep(1)
            tx.rollback()
            print("  [Writer] Rolled back")

    def reader():
        time.sleep(0.3)
        with eng.connect() as conn:
            row = conn.execute(
                text("SELECT copies_avail FROM library_book WHERE book_id = :b"), {"b": BOOK_ID}
            ).fetchone()
            results["read"] = row[0]
            print(f"  [Reader] Read copies_avail = {row[0]}")

    t1 = threading.Thread(target=writer)
    t2 = threading.Thread(target=reader)
    t1.start(); t2.start()
    t1.join(); t2.join()

    if results.get("read") == 5:
        print("  ✓ No dirty read! Reader saw committed value (5), not uncommitted (0).")
    else:
        print(f"  Reader saw: {results.get('read')}")

    eng.dispose()


if __name__ == "__main__":
    demo_lost_update()
    demo_for_update_fix()
    demo_no_dirty_read()

    # Reset to original
    eng = create_engine(URL)
    with eng.connect() as c:
        c.execute(text("UPDATE library_book SET copies_avail = 5 WHERE book_id = :b"), {"b": BOOK_ID})
        c.commit()
    eng.dispose()

    print("\n✅ All concurrency demos complete.")
