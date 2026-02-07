-- =============================================================
-- UniOps DB — Campus Operations Suite
-- DDL Script: Tables, Constraints, Indexes
-- Target: PostgreSQL 16 (PL/pgSQL)
-- =============================================================

-- ── Extensions ──
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid(), crypt()

-- ── Cleanup (dev only) ──
DROP TABLE IF EXISTS audit_log        CASCADE;
DROP TABLE IF EXISTS payment          CASCADE;
DROP TABLE IF EXISTS event_booking    CASCADE;
DROP TABLE IF EXISTS room             CASCADE;
DROP TABLE IF EXISTS book_issue       CASCADE;
DROP TABLE IF EXISTS library_book     CASCADE;
DROP TABLE IF EXISTS enrollment       CASCADE;
DROP TABLE IF EXISTS course           CASCADE;
DROP TABLE IF EXISTS student          CASCADE;
DROP TABLE IF EXISTS department       CASCADE;
DROP TABLE IF EXISTS user_account     CASCADE;

-- ═══════════════════════════════════════════════════════════════
-- 1. user_account  (EER superclass)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE user_account (
    user_id       SERIAL PRIMARY KEY,
    email         VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(256) NOT NULL,
    role          VARCHAR(20)  NOT NULL
                     CHECK (role IN ('admin','student','staff')),
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  user_account IS 'EER superclass — specialised via role discriminator into Admin / StudentUser / Staff';
COMMENT ON COLUMN user_account.role IS 'Discriminator for EER total, disjoint specialisation';

-- ═══════════════════════════════════════════════════════════════
-- 2. department
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE department (
    dept_id   SERIAL PRIMARY KEY,
    name      VARCHAR(100) NOT NULL UNIQUE
);

-- ═══════════════════════════════════════════════════════════════
-- 3. student
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE student (
    student_id  SERIAL PRIMARY KEY,
    user_id     INT REFERENCES user_account(user_id) ON DELETE SET NULL,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(120) NOT NULL UNIQUE,
    phone       VARCHAR(15),
    dept_id     INT NOT NULL REFERENCES department(dept_id) ON DELETE RESTRICT,
    year        INT NOT NULL CHECK (year BETWEEN 1 AND 5),
    status      VARCHAR(20) NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','graduated','suspended')),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_dept ON student(dept_id);
CREATE INDEX idx_student_email ON student(email);

-- ═══════════════════════════════════════════════════════════════
-- 4. course
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE course (
    course_id   SERIAL PRIMARY KEY,
    dept_id     INT NOT NULL REFERENCES department(dept_id) ON DELETE CASCADE,
    code        VARCHAR(10) NOT NULL UNIQUE,
    name        VARCHAR(150) NOT NULL,
    credits     INT NOT NULL CHECK (credits BETWEEN 1 AND 6)
);

CREATE INDEX idx_course_dept ON course(dept_id);

-- ═══════════════════════════════════════════════════════════════
-- 5. enrollment  (M:N: student ↔ course)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE enrollment (
    enroll_id   SERIAL PRIMARY KEY,
    student_id  INT NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
    course_id   INT NOT NULL REFERENCES course(course_id) ON DELETE CASCADE,
    semester    VARCHAR(10) NOT NULL,      -- e.g. 'F2025', 'S2026'
    grade       VARCHAR(2) DEFAULT NULL,   -- NULL = in progress
    UNIQUE(student_id, course_id, semester)
);

CREATE INDEX idx_enroll_student ON enrollment(student_id);
CREATE INDEX idx_enroll_course  ON enrollment(course_id);

-- ═══════════════════════════════════════════════════════════════
-- 6. library_book  (EER specialisation via book_type)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE library_book (
    book_id       SERIAL PRIMARY KEY,
    isbn          VARCHAR(20) NOT NULL UNIQUE,
    title         VARCHAR(250) NOT NULL,
    author        VARCHAR(150) NOT NULL,
    copies_total  INT NOT NULL CHECK (copies_total >= 0),
    copies_avail  INT NOT NULL CHECK (copies_avail >= 0),
    book_type     VARCHAR(15) NOT NULL DEFAULT 'circulating'
                     CHECK (book_type IN ('circulating','reference')),
    CONSTRAINT chk_copies CHECK (copies_avail <= copies_total)
);

COMMENT ON COLUMN library_book.book_type IS 'EER specialisation: ReferenceBook (non-issuable) vs CirculatingBook';

CREATE INDEX idx_book_title ON library_book USING gin(to_tsvector('english', title));

-- ═══════════════════════════════════════════════════════════════
-- 7. book_issue  (M:N over time: student ↔ book)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE book_issue (
    issue_id     SERIAL PRIMARY KEY,
    student_id   INT NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
    book_id      INT NOT NULL REFERENCES library_book(book_id) ON DELETE CASCADE,
    issued_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    due_at       TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
    returned_at  TIMESTAMP DEFAULT NULL,
    fine_amount  NUMERIC(8,2) NOT NULL DEFAULT 0.00
);

CREATE INDEX idx_issue_student ON book_issue(student_id);
CREATE INDEX idx_issue_book    ON book_issue(book_id);
CREATE INDEX idx_issue_due     ON book_issue(due_at) WHERE returned_at IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- 8. room
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE room (
    room_id   SERIAL PRIMARY KEY,
    name      VARCHAR(50) NOT NULL,
    building  VARCHAR(100) NOT NULL,
    capacity  INT NOT NULL CHECK (capacity > 0)
);

-- ═══════════════════════════════════════════════════════════════
-- 9. event_booking
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE event_booking (
    booking_id           SERIAL PRIMARY KEY,
    room_id              INT NOT NULL REFERENCES room(room_id) ON DELETE CASCADE,
    organizer_student_id INT NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
    start_time           TIMESTAMP NOT NULL,
    end_time             TIMESTAMP NOT NULL,
    purpose              VARCHAR(300) NOT NULL,
    status               VARCHAR(15) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','approved','rejected','cancelled')),
    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_booking_room   ON event_booking(room_id, start_time, end_time);
CREATE INDEX idx_booking_status ON event_booking(status);

-- ═══════════════════════════════════════════════════════════════
-- 10. payment
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE payment (
    payment_id  SERIAL PRIMARY KEY,
    student_id  INT NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
    amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    type        VARCHAR(20) NOT NULL
                   CHECK (type IN ('tuition','library_fine','event_fee','other')),
    paid_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    ref         VARCHAR(100) DEFAULT NULL
);

CREATE INDEX idx_payment_student ON payment(student_id);

-- ═══════════════════════════════════════════════════════════════
-- 11. audit_log  (populated by triggers)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE audit_log (
    log_id      SERIAL PRIMARY KEY,
    table_name  VARCHAR(50)  NOT NULL,
    operation   VARCHAR(10)  NOT NULL,   -- INSERT / UPDATE / DELETE
    row_id      INT,
    old_data    JSONB,
    new_data    JSONB,
    changed_by  VARCHAR(120),
    changed_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_table ON audit_log(table_name, changed_at);
