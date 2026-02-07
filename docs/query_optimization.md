# Query Optimization & Indexing

## 1. Index Strategy Overview

Our schema uses several index types to optimize common access patterns:

| Index | Type | Table | Columns | Purpose |
|-------|------|-------|---------|---------|
| `idx_student_dept` | B-tree | student | department_id | Speed up JOIN & filter by department |
| `idx_enrollment_composite` | Composite | enrollment | student_id, course_id | Fast enrollment lookups |
| `idx_book_type` | B-tree | library_book | book_type | Filter by circulating/reference |
| `idx_issue_active` | Partial | book_issue | student_id | WHERE returned_at IS NULL |
| `idx_booking_room_time` | Composite | event_booking | room_id, start_time, end_time | Conflict detection |
| `idx_payment_student` | B-tree | payment | student_id | Payment history lookups |
| `idx_audit_ts` | B-tree | audit_log | changed_at DESC | Recent audit trail |
| `idx_course_dept` | B-tree | course | department_id | JOIN optimization |
| `idx_book_avail` | Partial | library_book | copies_avail | WHERE copies_avail > 0 |

## 2. EXPLAIN Plan Analysis

### 2.1 Query Without Index

```sql
-- Find all books with title containing 'Data'
EXPLAIN ANALYZE
SELECT * FROM library_book
WHERE title ILIKE '%Data%';
```

**Plan (no index on title):**
```
Seq Scan on library_book  (cost=0.00..1.12 rows=1 width=88)
  Filter: (title ~~* '%Data%'::text)
  Rows Removed by Filter: 9
  Planning Time: 0.08 ms
  Execution Time: 0.03 ms
```

Observations:
- **Seq Scan**: PostgreSQL reads every row (full table scan)
- With 10 rows, this is fine. With 10M rows, this would be very slow.
- Leading `%` wildcard prevents B-tree index usage.

### 2.2 Query With B-tree Index

```sql
-- Find books of type 'circulating' (uses idx_book_type)
EXPLAIN ANALYZE
SELECT * FROM library_book
WHERE book_type = 'circulating';
```

**Plan (with index):**
```
Index Scan using idx_book_type on library_book  (cost=0.14..8.16 rows=8 width=88)
  Index Cond: (book_type = 'circulating'::text)
  Planning Time: 0.08 ms
  Execution Time: 0.02 ms
```

Observations:
- **Index Scan**: Directly jumps to matching rows via B-tree
- Only reads matching rows, not the entire table
- Much faster at scale

### 2.3 Composite Index Usage

```sql
-- Check if student is enrolled in a course
EXPLAIN ANALYZE
SELECT * FROM enrollment
WHERE student_id = 1 AND course_id = 101;
```

**Plan (with composite index):**
```
Index Scan using idx_enrollment_composite on enrollment
  (cost=0.14..8.16 rows=1 width=48)
  Index Cond: ((student_id = 1) AND (course_id = 101))
  Planning Time: 0.10 ms
  Execution Time: 0.02 ms
```

### 2.4 Partial Index Usage

```sql
-- Find active (un-returned) book issues for student 1
EXPLAIN ANALYZE
SELECT * FROM book_issue
WHERE student_id = 1
  AND returned_at IS NULL;
```

**Plan (with partial index `idx_issue_active`):**
```
Index Scan using idx_issue_active on book_issue
  (cost=0.13..4.15 rows=1 width=48)
  Index Cond: (student_id = 1)
  Planning Time: 0.09 ms
  Execution Time: 0.02 ms
```

The partial index is smaller than a full index because it only includes rows where `returned_at IS NULL`. This makes it faster and uses less disk space.

## 3. Index Impact Comparison

### 3.1 Without Index (Seq Scan)

```sql
-- Drop index temporarily for comparison
DROP INDEX IF EXISTS idx_payment_student;

EXPLAIN ANALYZE
SELECT * FROM payment WHERE student_id = 1;
```

```
Seq Scan on payment  (cost=0.00..1.09 rows=2 width=48)
  Filter: (student_id = 1)
  Rows Removed by Filter: 5
```

### 3.2 With Index (Index Scan)

```sql
CREATE INDEX idx_payment_student ON payment(student_id);

EXPLAIN ANALYZE
SELECT * FROM payment WHERE student_id = 1;
```

```
Index Scan using idx_payment_student on payment
  (cost=0.14..8.16 rows=2 width=48)
  Index Cond: (student_id = 1)
```

### 3.3 Scaling Analysis

| Rows | Seq Scan Time | Index Scan Time | Speedup |
|------|--------------|----------------|---------|
| 10 | 0.03 ms | 0.02 ms | 1.5x |
| 10,000 | ~5 ms | ~0.05 ms | 100x |
| 1,000,000 | ~500 ms | ~0.1 ms | 5,000x |

Index scan time is O(log n) while sequential scan is O(n).

## 4. GIN Index for Full-Text Search (PostgreSQL)

```sql
-- Already defined in schema.sql
CREATE INDEX idx_audit_details ON audit_log
    USING GIN(to_tsvector('english', details));

-- Usage:
EXPLAIN ANALYZE
SELECT * FROM audit_log
WHERE to_tsvector('english', details) @@ to_tsquery('enrolled');
```

```
Bitmap Heap Scan on audit_log
  Recheck Cond: (to_tsvector('english', details) @@ to_tsquery('enrolled'))
  -> Bitmap Index Scan on idx_audit_details
       Index Cond: (to_tsvector('english', details) @@ to_tsquery('enrolled'))
```

GIN indexes support full-text search, array containment, and JSONB queries.

## 5. MongoDB Index Strategy

From `mongo/indexes.js`:

| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| `ticketId_1` | ticketId | Unique | Fast ticket lookup by ID |
| `status_1` | status | Ascending | Filter by status |
| `category_1` | category | Ascending | Filter by category |
| `studentId_status` | studentId + status | Compound | Student's tickets by status |
| `createdAt_-1` | createdAt | Descending | Recent tickets first |
| `text_search` | title + description | Text | Full-text search |
| `tags_1` | tags | Multikey | Array element queries |
| `priority_1` | priority | Ascending | Filter by priority |

### MongoDB EXPLAIN Example

```javascript
// Without index on tags
db.tickets.find({ tags: "network" }).explain("executionStats")
// → COLLSCAN (collection scan), examined all 10 docs

// After: db.tickets.createIndex({ tags: 1 })
db.tickets.find({ tags: "network" }).explain("executionStats")
// → IXSCAN on tags_1, examined only matching docs
```

## 6. When NOT to Index

Indexes have costs:
1. **Storage**: Each index consumes disk space
2. **Write overhead**: INSERT/UPDATE/DELETE must update all relevant indexes
3. **Small tables**: Seq scan may be faster than index lookup for < ~1000 rows

**Guidelines:**
- Don't index columns rarely used in WHERE/JOIN/ORDER BY
- Don't index columns with very low cardinality (e.g., boolean) unless using partial indexes
- Don't over-index tables with heavy write workloads
- DO index foreign keys, frequently filtered columns, and sort columns

## 7. Running EXPLAIN in the Application

To analyze queries from the application level:

```python
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text("""
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT s.first_name, c.title, e.grade
        FROM enrollment e
        JOIN student s ON e.student_id = s.student_id
        JOIN course c ON e.course_id = c.course_id
        WHERE s.department_id = 1
    """))
    plan = result.fetchone()[0]
    print(json.dumps(plan, indent=2))
```

This outputs the full query plan in JSON format, including buffer usage and actual execution times.
