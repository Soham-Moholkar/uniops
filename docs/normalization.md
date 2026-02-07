# Normalization to 3NF

## Relation 1: Enrollment (with denormalized view)

### Step 1: Identify the "universal" relation

Consider a denormalized enrollment view:

```
EnrollmentFull(enroll_id, student_id, student_name, student_email, student_phone,
               dept_id, dept_name, course_id, course_code, course_name, credits,
               semester, grade)
```

### Step 2: Functional Dependencies (FDs)

```
FD1: enroll_id → student_id, course_id, semester, grade
FD2: student_id → student_name, student_email, student_phone, dept_id
FD3: dept_id → dept_name
FD4: course_id → course_code, course_name, credits, dept_id
FD5: student_email → student_id
FD6: course_code → course_id
```

### Step 3: Candidate Keys

- **enroll_id** is a candidate key (determines all attributes via FD1 → FD2 → FD3, FD1 → FD4)
- `{student_id, course_id, semester}` is also a candidate key (unique constraint)

### Step 4: Attribute Closure

Closure of `{enroll_id}`:

```
{enroll_id}⁺
  = {enroll_id}                                    (start)
  ∪ {student_id, course_id, semester, grade}       (by FD1)
  ∪ {student_name, student_email, student_phone, dept_id}  (by FD2)
  ∪ {dept_name}                                    (by FD3)
  ∪ {course_code, course_name, credits}            (by FD4, dept_id already in)
  = ALL ATTRIBUTES ✓
```

So `{enroll_id}` is indeed a superkey.

### Step 5: Minimal Cover

Start: F = {FD1, FD2, FD3, FD4, FD5, FD6}

**5a. Decompose right-hand sides (canonical form):**
```
FD1a: enroll_id → student_id
FD1b: enroll_id → course_id
FD1c: enroll_id → semester
FD1d: enroll_id → grade
FD2a: student_id → student_name
FD2b: student_id → student_email
FD2c: student_id → student_phone
FD2d: student_id → dept_id
FD3:  dept_id → dept_name
FD4a: course_id → course_code
FD4b: course_id → course_name
FD4c: course_id → credits
FD4d: course_id → dept_id
FD5:  student_email → student_id
FD6:  course_code → course_id
```

**5b. Remove redundant FDs:**
- Check FD2d (student_id → dept_id): Not derivable from other FDs without FD2d. Keep.
- Check FD4d (course_id → dept_id): Not derivable from others. Keep.
- All FDs are non-redundant.

**5c. Remove extraneous LHS attributes:**
- All LHS attributes are single-attribute. No extraneous attributes to remove.

**Minimal cover Fc:**
```
{enroll_id → student_id, enroll_id → course_id, enroll_id → semester, enroll_id → grade,
 student_id → student_name, student_id → student_email, student_id → student_phone, student_id → dept_id,
 dept_id → dept_name,
 course_id → course_code, course_id → course_name, course_id → credits, course_id → dept_id,
 student_email → student_id, course_code → course_id}
```

### Step 6: Check Normal Forms

**1NF:** ✓ All attributes are atomic.

**2NF check (no partial dependencies on candidate key):**
- CK = {enroll_id}. All non-prime attributes depend on entire CK.
- But `student_name` depends on `student_id` (partial dependency via student_id which is a proper subset of another CK {student_id, course_id, semester}).
- **Violates 2NF** with respect to composite candidate key.

**3NF check (no transitive dependencies):**
- `enroll_id → student_id → student_name` (transitive). **Violates 3NF.**
- `enroll_id → student_id → dept_id → dept_name` (transitive). **Violates 3NF.**
- `enroll_id → course_id → course_name` (transitive). **Violates 3NF.**

### Step 7: 3NF Decomposition (Synthesis Algorithm)

Group FDs by their LHS determinant:

| Group | LHS | Attributes |
|-------|-----|-----------|
| R1 | enroll_id | student_id, course_id, semester, grade |
| R2 | student_id | student_name, student_email, student_phone, dept_id |
| R3 | dept_id | dept_name |
| R4 | course_id | course_code, course_name, credits, dept_id |

(FD5 and FD6 are captured by unique constraints.)

**Resulting decomposition:**

```sql
-- R1: enrollment(enroll_id PK, student_id FK, course_id FK, semester, grade)
-- R2: student(student_id PK, student_name, student_email, student_phone, dept_id FK)
-- R3: department(dept_id PK, dept_name)
-- R4: course(course_id PK, course_code, course_name, credits, dept_id FK)
```

### Step 8: Verification

**Lossless Join:**
- R1 ∩ R2 = {student_id} → R2 (student_id is key of R2) ✓
- R1 ∩ R4 = {course_id} → R4 (course_id is key of R4) ✓
- R2 ∩ R3 = {dept_id} → R3 (dept_id is key of R3) ✓
- All pairwise joins are lossless. ✓

**Dependency Preservation:**
- All FDs from Fc are preserved within the decomposed relations.
- FD1 → in R1, FD2 → in R2, FD3 → in R3, FD4 → in R4. ✓

**3NF Verification per relation:**
- R1: Key = {enroll_id}. Non-key attrs (student_id, course_id, semester, grade) depend only on the key. ✓ 3NF
- R2: Key = {student_id}. No transitive dependencies. ✓ 3NF
- R3: Key = {dept_id}. Only one non-key attr. ✓ 3NF (trivially BCNF)
- R4: Key = {course_id}. No transitive. ✓ 3NF

---

## Relation 2: BookIssue (with denormalized view)

### Universal Relation

```
BookIssueFull(issue_id, student_id, student_name, student_email,
              book_id, isbn, title, author, book_type,
              issued_at, due_at, returned_at, fine_amount)
```

### Functional Dependencies

```
FD1: issue_id → student_id, book_id, issued_at, due_at, returned_at, fine_amount
FD2: student_id → student_name, student_email
FD3: book_id → isbn, title, author, book_type
FD4: isbn → book_id
FD5: student_email → student_id
```

### Candidate Key

- `{issue_id}` is a candidate key.
- Closure: `{issue_id}⁺ = ALL ATTRIBUTES` ✓

### Minimal Cover

Already in canonical form. No redundant FDs. No extraneous LHS.

```
Fc = {issue_id → student_id, issue_id → book_id, issue_id → issued_at,
      issue_id → due_at, issue_id → returned_at, issue_id → fine_amount,
      student_id → student_name, student_id → student_email,
      book_id → isbn, book_id → title, book_id → author, book_id → book_type,
      isbn → book_id, student_email → student_id}
```

### 3NF Violation

- `issue_id → student_id → student_name` (transitive) — violates 3NF.
- `issue_id → book_id → title` (transitive) — violates 3NF.

### 3NF Decomposition

```sql
-- R1: book_issue(issue_id PK, student_id FK, book_id FK, issued_at, due_at, returned_at, fine_amount)
-- R2: student(student_id PK, student_name, student_email)   [reuses existing]
-- R3: library_book(book_id PK, isbn, title, author, book_type) [reuses existing]
```

### Verification

- **Lossless:** R1 ∩ R2 = {student_id} is key of R2 ✓; R1 ∩ R3 = {book_id} is key of R3 ✓
- **Dependency preservation:** All FDs preserved within decomposed tables ✓
- **3NF per table:** Each table: non-key → only depends on full key ✓

---

## Summary

| Relation | Original NF | Decomposed Into | Final NF |
|----------|------------|-----------------|----------|
| EnrollmentFull | 1NF | enrollment + student + department + course | 3NF |
| BookIssueFull | 1NF | book_issue + student + library_book | 3NF |

All decompositions are **lossless join** and **dependency preserving**.

The schema as implemented in `schema.sql` already reflects the 3NF decomposition.
