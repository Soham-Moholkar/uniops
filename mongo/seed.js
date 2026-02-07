// =============================================================
// UniOps DB — MongoDB Seed Data
// Collection: tickets (Helpdesk / Complaints)
// Run: mongosh mongodb://localhost:27017/uniops_nosql seed.js
// =============================================================

db = db.getSiblingDB("uniops_nosql");

// Drop existing collection
db.tickets.drop();

// Insert seed tickets
db.tickets.insertMany([
  {
    ticketId: "TKT-001",
    studentId: 1,
    studentName: "Alice Johnson",
    studentEmail: "alice@uni.edu",
    category: "infrastructure",
    title: "Broken projector in CS Block Lab 301",
    description: "The projector in Lab 301 has been flickering and shutting off randomly during lectures. It needs immediate replacement or repair.",
    priority: "high",
    status: "open",
    createdAt: new Date("2026-01-15T09:30:00Z"),
    updatedAt: new Date("2026-01-15T09:30:00Z"),
    tags: ["projector", "lab", "cs-block", "urgent"],
    comments: [
      {
        author: "staff@uni.edu",
        role: "staff",
        text: "Assigned to maintenance team. Will inspect by Jan 17.",
        createdAt: new Date("2026-01-15T14:00:00Z")
      },
      {
        author: "alice@uni.edu",
        role: "student",
        text: "Thank you. We have a lab exam on Jan 20, please prioritize.",
        createdAt: new Date("2026-01-15T16:00:00Z")
      }
    ],
    attachments: [
      {
        filename: "projector_error.jpg",
        contentType: "image/jpeg",
        size: 245760,
        uploadedAt: new Date("2026-01-15T09:30:00Z")
      }
    ]
  },
  {
    ticketId: "TKT-002",
    studentId: 2,
    studentName: "Bob Smith",
    studentEmail: "bob@uni.edu",
    category: "academic",
    title: "Grade discrepancy in CS301 midterm",
    description: "My CS301 Database Systems midterm grade shows B but I believe there's an error in Q3 evaluation. I've attached my answer sheet scan.",
    priority: "medium",
    status: "in-progress",
    createdAt: new Date("2026-01-18T11:00:00Z"),
    updatedAt: new Date("2026-01-20T10:00:00Z"),
    tags: ["grade", "cs301", "midterm", "reevaluation"],
    comments: [
      {
        author: "staff@uni.edu",
        role: "staff",
        text: "Forwarded to Prof. Kumar for review.",
        createdAt: new Date("2026-01-19T09:00:00Z")
      }
    ],
    attachments: [
      {
        filename: "midterm_answer_sheet.pdf",
        contentType: "application/pdf",
        size: 1048576,
        uploadedAt: new Date("2026-01-18T11:00:00Z")
      }
    ]
  },
  {
    ticketId: "TKT-003",
    studentId: 3,
    studentName: "Carol Davis",
    studentEmail: "carol@uni.edu",
    category: "hostel",
    title: "Water supply issue in Block C",
    description: "No water supply in Block C, Floor 3 since yesterday morning. Multiple students affected.",
    priority: "critical",
    status: "open",
    createdAt: new Date("2026-01-20T07:00:00Z"),
    updatedAt: new Date("2026-01-20T07:00:00Z"),
    tags: ["water", "hostel", "block-c", "critical"],
    comments: [],
    attachments: []
  },
  {
    ticketId: "TKT-004",
    studentId: 1,
    studentName: "Alice Johnson",
    studentEmail: "alice@uni.edu",
    category: "library",
    title: "Request for extended library hours during exams",
    description: "Requesting library to stay open until midnight during the exam period (Feb 1-15). Many students need the study space.",
    priority: "low",
    status: "resolved",
    createdAt: new Date("2026-01-10T15:00:00Z"),
    updatedAt: new Date("2026-01-22T12:00:00Z"),
    resolvedAt: new Date("2026-01-22T12:00:00Z"),
    tags: ["library", "hours", "exams", "request"],
    comments: [
      {
        author: "staff@uni.edu",
        role: "staff",
        text: "Library committee has approved extended hours: 7 AM - 11 PM during Feb 1-15.",
        createdAt: new Date("2026-01-22T12:00:00Z")
      }
    ],
    attachments: [
      {
        filename: "petition_signatures.pdf",
        contentType: "application/pdf",
        size: 512000,
        uploadedAt: new Date("2026-01-10T15:00:00Z")
      }
    ]
  },
  {
    ticketId: "TKT-005",
    studentId: 4,
    studentName: "Dave Wilson",
    studentEmail: "dave@uni.edu",
    category: "infrastructure",
    title: "WiFi connectivity issues in Mechanical Block",
    description: "WiFi has been extremely slow in the Mechanical Engineering block for the past week. Download speeds below 1 Mbps during peak hours.",
    priority: "high",
    status: "in-progress",
    createdAt: new Date("2026-01-25T10:00:00Z"),
    updatedAt: new Date("2026-01-26T14:00:00Z"),
    tags: ["wifi", "network", "mechanical-block", "slow"],
    comments: [
      {
        author: "admin@uni.edu",
        role: "admin",
        text: "IT team has been notified. Running diagnostics on the access points.",
        createdAt: new Date("2026-01-25T16:00:00Z")
      },
      {
        author: "staff@uni.edu",
        role: "staff",
        text: "Found faulty access point on Floor 2. Replacement ordered.",
        createdAt: new Date("2026-01-26T14:00:00Z")
      }
    ],
    attachments: [
      {
        filename: "speed_test_results.png",
        contentType: "image/png",
        size: 184320,
        uploadedAt: new Date("2026-01-25T10:00:00Z")
      }
    ]
  },
  {
    ticketId: "TKT-006",
    studentId: 5,
    studentName: "Eve Martinez",
    studentEmail: "eve@uni.edu",
    category: "academic",
    title: "Course registration system error",
    description: "Unable to register for MA301 Probability & Stats. The system shows 'section full' but the professor confirmed seats are available.",
    priority: "high",
    status: "resolved",
    createdAt: new Date("2026-01-08T09:00:00Z"),
    updatedAt: new Date("2026-01-09T11:00:00Z"),
    resolvedAt: new Date("2026-01-09T11:00:00Z"),
    tags: ["registration", "course", "system-error"],
    comments: [
      {
        author: "admin@uni.edu",
        role: "admin",
        text: "Cache issue in registration system. Cleared and enrollment processed manually.",
        createdAt: new Date("2026-01-09T11:00:00Z")
      }
    ],
    attachments: [
      {
        filename: "error_screenshot.png",
        contentType: "image/png",
        size: 102400,
        uploadedAt: new Date("2026-01-08T09:00:00Z")
      },
      {
        filename: "prof_email_confirmation.pdf",
        contentType: "application/pdf",
        size: 65536,
        uploadedAt: new Date("2026-01-08T09:05:00Z")
      }
    ]
  },
  {
    ticketId: "TKT-007",
    studentId: 2,
    studentName: "Bob Smith",
    studentEmail: "bob@uni.edu",
    category: "hostel",
    title: "Noisy construction near Block A at night",
    description: "Construction work near Block A continues past 10 PM, making it impossible to study or sleep. Requesting enforcement of quiet hours.",
    priority: "medium",
    status: "open",
    createdAt: new Date("2026-01-28T22:00:00Z"),
    updatedAt: new Date("2026-01-28T22:00:00Z"),
    tags: ["noise", "hostel", "construction", "block-a"],
    comments: [],
    attachments: [
      {
        filename: "noise_video.mp4",
        contentType: "video/mp4",
        size: 5242880,
        uploadedAt: new Date("2026-01-28T22:00:00Z")
      }
    ]
  },
  {
    ticketId: "TKT-008",
    studentId: 3,
    studentName: "Carol Davis",
    studentEmail: "carol@uni.edu",
    category: "transport",
    title: "Bus Route 5 timing change request",
    description: "Route 5 bus arrives at 8:45 AM but my first class starts at 8:30 AM. Could the schedule be adjusted to 8:15 AM?",
    priority: "low",
    status: "closed",
    createdAt: new Date("2025-12-15T08:00:00Z"),
    updatedAt: new Date("2025-12-20T10:00:00Z"),
    resolvedAt: new Date("2025-12-20T10:00:00Z"),
    tags: ["transport", "bus", "schedule"],
    comments: [
      {
        author: "staff@uni.edu",
        role: "staff",
        text: "Route 5 has been rescheduled to depart 15 minutes earlier starting Jan 1.",
        createdAt: new Date("2025-12-20T10:00:00Z")
      }
    ],
    attachments: []
  },
  {
    ticketId: "TKT-009",
    studentId: 5,
    studentName: "Eve Martinez",
    studentEmail: "eve@uni.edu",
    category: "infrastructure",
    title: "Broken chair in Lecture Hall 2, Row G",
    description: "Chair G-14 in Lecture Hall 2 is broken — the seat wobbles dangerously. Please fix before someone gets hurt.",
    priority: "medium",
    status: "open",
    createdAt: new Date("2026-02-01T13:00:00Z"),
    updatedAt: new Date("2026-02-01T13:00:00Z"),
    tags: ["furniture", "lecture-hall", "safety"],
    comments: [],
    attachments: [
      {
        filename: "broken_chair.jpg",
        contentType: "image/jpeg",
        size: 307200,
        uploadedAt: new Date("2026-02-01T13:00:00Z")
      }
    ]
  },
  {
    ticketId: "TKT-010",
    studentId: 4,
    studentName: "Dave Wilson",
    studentEmail: "dave@uni.edu",
    category: "academic",
    title: "Attendance discrepancy in ME201",
    description: "My attendance shows 72% in ME201 but I have been present for all classes except 2 (out of 30). Expected ~93%. Please verify biometric records.",
    priority: "high",
    status: "in-progress",
    createdAt: new Date("2026-02-03T11:00:00Z"),
    updatedAt: new Date("2026-02-04T09:00:00Z"),
    tags: ["attendance", "me201", "biometric", "discrepancy"],
    comments: [
      {
        author: "staff@uni.edu",
        role: "staff",
        text: "Checking biometric logs. Will cross-reference with manual attendance sheet.",
        createdAt: new Date("2026-02-04T09:00:00Z")
      }
    ],
    attachments: []
  }
]);

print("✅ Inserted " + db.tickets.countDocuments() + " tickets into uniops_nosql.tickets");
