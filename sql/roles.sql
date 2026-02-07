-- =============================================================
-- UniOps DB — DCL: Roles & Grants
-- Demonstrates role-based access control.
-- =============================================================

-- ── Create roles ──
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'uniops_readonly') THEN
        CREATE ROLE uniops_readonly LOGIN PASSWORD 'readonly_pass';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'uniops_staff') THEN
        CREATE ROLE uniops_staff LOGIN PASSWORD 'staff_pass';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'uniops_app') THEN
        CREATE ROLE uniops_app LOGIN PASSWORD 'app_pass';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- ROLE 1: uniops_readonly — can only SELECT
-- ═══════════════════════════════════════════════════════════════
GRANT CONNECT ON DATABASE uniops_campus TO uniops_readonly;
GRANT USAGE ON SCHEMA public TO uniops_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO uniops_readonly;

-- Cannot INSERT, UPDATE, DELETE:
-- REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM uniops_readonly;

-- ═══════════════════════════════════════════════════════════════
-- ROLE 2: uniops_staff — SELECT + INSERT + UPDATE on operational tables
-- ═══════════════════════════════════════════════════════════════
GRANT CONNECT ON DATABASE uniops_campus TO uniops_staff;
GRANT USAGE ON SCHEMA public TO uniops_staff;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO uniops_staff;
GRANT INSERT, UPDATE ON student, enrollment, book_issue, event_booking, payment TO uniops_staff;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO uniops_staff;

-- Staff cannot modify schema or drop tables
-- Staff cannot access user_account passwords
REVOKE SELECT ON user_account FROM uniops_staff;
GRANT SELECT (user_id, email, role, created_at) ON user_account TO uniops_staff;

-- ═══════════════════════════════════════════════════════════════
-- ROLE 3: uniops_app — full DML for the application backend
-- ═══════════════════════════════════════════════════════════════
GRANT CONNECT ON DATABASE uniops_campus TO uniops_app;
GRANT USAGE ON SCHEMA public TO uniops_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO uniops_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO uniops_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO uniops_app;
GRANT EXECUTE ON ALL PROCEDURES IN SCHEMA public TO uniops_app;

-- ═══════════════════════════════════════════════════════════════
-- Summary of DCL commands used:
-- CREATE ROLE ... LOGIN PASSWORD
-- GRANT CONNECT, USAGE, SELECT, INSERT, UPDATE, DELETE, EXECUTE
-- REVOKE (column-level restriction on user_account)
-- ═══════════════════════════════════════════════════════════════
