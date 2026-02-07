# ER/EER Diagram & Relational Mapping

## 1. Entity-Relationship Diagram

```
┌──────────────┐        ┌──────────────┐
│  Department  │        │  UserAccount │
│──────────────│        │──────────────│
│ PK dept_id   │        │ PK user_id   │
│    name      │        │    email     │
└──────┬───────┘        │    password  │
       │ 1              │    role (d)  │
       │                └──────┬───────┘
       │                       │
       │ M                     │ EER Specialization
       │                       │ (Total, Disjoint)
┌──────┴───────┐        ┌──────┴───────────────┐
│   Student    │        │                      │
│──────────────│   ┌────┴────┐  ┌──────┐  ┌───┴──┐
│ PK student_id│   │  Admin  │  │Staff │  │Stud- │
│ FK user_id   │   │         │  │      │  │User  │
│ FK dept_id   │   └─────────┘  └──────┘  └──────┘
│    name      │
│    email     │
│    phone     │
│    year      │
│    status    │
└──┬───┬───┬───┘
   │   │   │
   │   │   │ M                  M
   │   │   └─────── Enrollment ────────┐
   │   │            │ PK enroll_id │    │
   │   │            │ FK student_id│    │
   │   │            │ FK course_id │    │
   │   │            │    semester  │    │
   │   │            │    grade     │    │
   │   │            └──────────────┘    │
   │   │                                │
   │   │                         ┌──────┴──────┐
   │   │                         │   Course    │
   │   │                         │─────────────│
   │   │                         │ PK course_id│
   │   │                         │ FK dept_id  │
   │   │                         │    code     │
   │   │                         │    name     │
   │   │                         │    credits  │
   │   │                         └─────────────┘
   │   │
   │   │ M (over time)
   │   └─────── BookIssue ──────┐
   │            │ PK issue_id  │ │
   │            │ FK student_id│ │
   │            │ FK book_id   │ │
   │            │    issued_at │ │
   │            │    due_at    │ │
   │            │    returned  │ │
   │            │    fine_amt  │ │
   │            └──────────────┘ │
   │                             │
   │                      ┌──────┴───────┐
   │                      │ LibraryBook  │
   │                      │──────────────│
   │                      │ PK book_id   │
   │                      │    isbn      │
   │                      │    title     │
   │                      │    author    │
   │                      │    copies    │
   │                      │    book_type │
   │                      └──────┬───────┘
   │                             │
   │                             │ EER Specialization
   │                             │ (Total, Disjoint)
   │                      ┌──────┴──────────────┐
   │                      │                     │
   │                ┌─────┴──────┐  ┌───────────┴──┐
   │                │Circulating │  │ Reference    │
   │                │   Book     │  │   Book       │
   │                │(issuable)  │  │(non-issuable)│
   │                └────────────┘  └──────────────┘
   │
   │ 1
   │
   ├─────── EventBooking ──────── Room
   │        │ PK booking_id │     │ PK room_id │
   │        │ FK room_id    │     │    name     │
   │        │ FK student_id │     │    building │
   │        │    start_time │     │    capacity │
   │        │    end_time   │     └─────────────┘
   │        │    purpose    │
   │        │    status     │
   │        └───────────────┘
   │
   │ 1
   └─────── Payment
            │ PK payment_id │
            │ FK student_id │
            │    amount     │
            │    type       │
            │    paid_at    │
            │    ref        │
            └───────────────┘

         ┌──────────────┐
         │  AuditLog    │
         │──────────────│
         │ PK log_id    │
         │   table_name │
         │   operation  │
         │   row_id     │
         │   old_data   │
         │   new_data   │
         │   changed_by │
         │   changed_at │
         └──────────────┘
```

## 2. Relationships Summary

| Relationship | Type | Participation |
|-------------|------|---------------|
| Student — Department | M:1 | Total (every student has a dept) |
| Student — Course (Enrollment) | M:N | Partial |
| Student — LibraryBook (BookIssue) | M:N (temporal) | Partial |
| Student — EventBooking | 1:M | Partial |
| Room — EventBooking | 1:M | Partial |
| Student — Payment | 1:M | Partial |
| UserAccount — Student | 1:1 | Partial |
| Course — Department | M:1 | Total |

## 3. EER Features

### 3.1 UserAccount Specialization (Total, Disjoint)

**Superclass:** `UserAccount(user_id, email, password_hash, role, created_at)`

**Subclasses** (discriminated by `role` attribute):
- **Admin** — role = 'admin': full system access
- **StudentUser** — role = 'student': student portal access
- **Staff** — role = 'staff': operational management access

**Mapping to Relational:** Single-table inheritance strategy. The `role` column acts as a discriminator. All subclass instances are stored in `user_account` with the `role` column distinguishing types. This is appropriate because subclasses share the same attributes and differ only in permissions.

### 3.2 LibraryBook Specialization (Total, Disjoint)

**Superclass:** `LibraryBook(book_id, isbn, title, author, copies_total, copies_avail, book_type)`

**Subclasses** (discriminated by `book_type` attribute):
- **CirculatingBook** — book_type = 'circulating': can be issued to students
- **ReferenceBook** — book_type = 'reference': non-issuable, in-library use only

**Mapping to Relational:** Single-table inheritance. The `book_type` column discriminates between subclasses. A `BEFORE INSERT` trigger on `book_issue` enforces the constraint that reference books cannot be issued.

## 4. EER-to-Relational Mapping Rules Applied

| EER Concept | Mapping Strategy | Justification |
|------------|-----------------|---------------|
| Regular entity | Direct table | Each entity → one table |
| 1:M relationship | FK in child | `student.dept_id → department.dept_id` |
| M:N relationship | Junction table | `enrollment(student_id, course_id)` |
| M:N temporal relationship | Junction table + timestamps | `book_issue(student_id, book_id, issued_at, ...)` |
| Total/Disjoint specialization | Single-table with discriminator | `user_account.role`, `library_book.book_type` |
| Multi-valued attribute (MongoDB) | Separate collection with arrays | `tickets.tags[]`, `tickets.comments[]` |
| Weak entity | N/A (not used) | All entities have natural keys |

## 5. Cardinality Constraints (min, max notation)

| Entity A | | Entity B | Constraint |
|---------|---|---------|-----------|
| Department | — Student | (1,1) to (0,N) |
| Department | — Course | (1,1) to (0,N) |
| Student | — Enrollment | (0,N) to (1,1) |
| Course | — Enrollment | (0,N) to (1,1) |
| Student | — BookIssue | (0,N) to (1,1) |
| LibraryBook | — BookIssue | (0,N) to (1,1) |
| Student | — EventBooking | (0,N) to (1,1) |
| Room | — EventBooking | (0,N) to (1,1) |
| Student | — Payment | (0,N) to (1,1) |
| UserAccount | — Student | (0,1) to (0,1) |

## 6. Integrity Constraints Implemented

1. **Entity integrity:** All tables have PRIMARY KEY (NOT NULL + UNIQUE).
2. **Referential integrity:** All FK columns have REFERENCES with ON DELETE actions.
3. **Domain constraints:** CHECK constraints on `role`, `status`, `year`, `credits`, `book_type`, `capacity`.
4. **Key constraints:** UNIQUE on `email`, `isbn`, `code`, and composite `(student_id, course_id, semester)`.
5. **Semantic constraints:** Triggers enforce business rules (no reference book issue, no double-booking).
