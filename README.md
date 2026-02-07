# UniOps DB — Campus Operations Suite

> **DS2009 DBMS Mini-Project** | RDBMS (PostgreSQL) + NoSQL (MongoDB)

A production-grade, two-tier campus operations management system covering student registration, library management, room/event booking, helpdesk ticketing (MongoDB), and role-based access with audit logging.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Relational DB | PostgreSQL 16 |
| NoSQL DB | MongoDB 7 |
| Backend API | Python 3.11 · FastAPI · SQLAlchemy · PyMongo |
| Frontend GUI | Next.js 14 · React 18 · Tailwind CSS |
| Containers | Docker Compose |

---

## Quick Start

### Prerequisites

- **Docker Desktop** (includes Docker Compose)
- **Python 3.11+**
- **Node.js 18+** & npm

### 1. Clone & configure environment

```bash
git clone <repo-url> uniops-dbms
cd uniops-dbms
cp .env.example .env          # edit if needed
```

### 2. Start databases

```bash
docker-compose up -d
```

This spins up PostgreSQL (port 5432) and MongoDB (port 27017) and auto-runs the SQL init scripts.

### 3. Seed MongoDB

```bash
# Using mongosh (bundled with MongoDB or install separately)
mongosh mongodb://localhost:27017/uniops_nosql mongo/seed.js
```

### 4. Start backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
python -m app.scripts.init_db  # optional re-seed
uvicorn app.main:app --reload --port 8000
```

API docs auto-available at **http://localhost:8000/docs** (Swagger UI).

### 5. Start frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Repository Structure

```
uniops-dbms/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Settings (env variables)
│   │   ├── api/                 # Route modules
│   │   ├── auth/                # JWT auth helpers
│   │   ├── db/                  # DB connection layers
│   │   ├── models/              # Pydantic schemas
│   │   ├── services/            # Business logic
│   │   └── scripts/             # DB init, concurrency demo
│   └── requirements.txt
├── frontend/
│   ├── app/                     # Next.js app router pages
│   ├── components/              # Reusable React components
│   └── lib/                     # API helpers
├── sql/
│   ├── schema.sql               # DDL: tables, constraints
│   ├── seed.sql                 # DML: sample data
│   ├── queries.sql              # Complex queries showcase
│   ├── views.sql                # Views (updatable + non-updatable)
│   ├── procedures.sql           # Stored procedures & functions
│   ├── triggers.sql             # Before/after triggers
│   ├── roles.sql                # DCL: roles & grants
│   └── transactions.sql         # TCL: ACID, concurrency demos
├── mongo/
│   ├── seed.js                  # MongoDB sample data
│   ├── queries.js               # 10+ NoSQL queries
│   └── indexes.js               # MongoDB indexes
├── docs/
│   ├── er_eer_diagram.md        # ER/EER design & mapping
│   ├── normalization.md         # FDs, minimal cover, 3NF
│   ├── transaction_demo.md      # ACID & concurrency notes
│   └── query_optimization.md    # Index impact & EXPLAIN
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Modules

| Module | DB | Description |
|--------|----|-------------|
| Student Registration | PostgreSQL | CRUD students, departments, enrollment |
| Library Management | PostgreSQL | Book catalog, issue/return with fine calculation |
| Room & Event Booking | PostgreSQL | Hall scheduling with conflict prevention |
| Helpdesk Tickets | MongoDB | Unstructured complaints, attachments, comments |
| Payments | PostgreSQL | Fee/fine tracking linked to students |
| Auth & Audit | PostgreSQL | JWT login, role-based access, audit log triggers |

---

## PL/pgSQL ↔ PL/SQL Mapping

This project uses **PL/pgSQL** (PostgreSQL's procedural language), which maps directly to PL/SQL syllabus concepts:

| PL/SQL Concept | PL/pgSQL Equivalent |
|----------------|-------------------|
| `CREATE PROCEDURE` | `CREATE OR REPLACE PROCEDURE` |
| `CREATE FUNCTION` | `CREATE OR REPLACE FUNCTION` |
| `CURSOR ... IS SELECT` | `DECLARE cur CURSOR FOR SELECT` |
| `BEFORE INSERT TRIGGER` | Same syntax |
| `RAISE_APPLICATION_ERROR` | `RAISE EXCEPTION` |
| `DBMS_OUTPUT.PUT_LINE` | `RAISE NOTICE` |
| `BEGIN ... EXCEPTION ... END` | Same structure |

---

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@uni.edu | admin123 |
| Student | alice@uni.edu | student123 |
| Staff | staff@uni.edu | staff123 |

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|---------|------|-------------|
| POST | `/api/auth/login` | No | JWT login |
| POST | `/api/auth/register` | No | Register new user |
| GET/POST | `/api/students` | Yes | List / create students |
| GET | `/api/students/{id}` | Yes | Get student detail |
| GET | `/api/courses` | Yes | List courses |
| POST | `/api/courses/enroll` | Yes | Enroll student |
| GET/POST | `/api/library/books` | Yes | List / add books |
| POST | `/api/library/issue` | Yes | Issue book (stored proc) |
| POST | `/api/library/return` | Yes | Return book |
| GET | `/api/rooms` | Yes | List rooms |
| POST | `/api/bookings` | Yes | Create booking |
| PATCH | `/api/bookings/{id}` | Yes | Approve/reject booking |
| GET/POST | `/api/tickets` | Yes | List / create tickets (Mongo) |
| GET | `/api/tickets/{id}` | Yes | Ticket detail (Mongo) |
| POST | `/api/tickets/{id}/comment` | Yes | Add comment (Mongo) |
| GET | `/api/payments` | Yes | List payments |

---

## Documentation

- [ER/EER Diagram & Mapping](docs/er_eer_diagram.md)
- [Normalization (3NF)](docs/normalization.md)
- [Transaction & Concurrency Demo](docs/transaction_demo.md)
- [Query Optimization](docs/query_optimization.md)

---

## License

MIT — Built for academic purposes (DS2009).
