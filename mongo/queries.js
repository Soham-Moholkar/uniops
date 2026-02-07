// =============================================================
// UniOps DB — MongoDB Queries (10+ queries)
// Run: mongosh mongodb://localhost:27017/uniops_nosql queries.js
// =============================================================

db = db.getSiblingDB("uniops_nosql");

// ─────────────────────────────────────────────────────────────
// Q1: find — All open tickets
// ─────────────────────────────────────────────────────────────
print("=== Q1: All open tickets ===");
printjson(db.tickets.find({ status: "open" }).toArray());

// ─────────────────────────────────────────────────────────────
// Q2: findOne — Specific ticket by ticketId
// ─────────────────────────────────────────────────────────────
print("\n=== Q2: findOne TKT-003 ===");
printjson(db.tickets.findOne({ ticketId: "TKT-003" }));

// ─────────────────────────────────────────────────────────────
// Q3: Projection — Only title, status, priority for all tickets
// ─────────────────────────────────────────────────────────────
print("\n=== Q3: Projection (title, status, priority) ===");
printjson(
  db.tickets.find(
    {},
    { _id: 0, ticketId: 1, title: 1, status: 1, priority: 1 }
  ).toArray()
);

// ─────────────────────────────────────────────────────────────
// Q4: Filter — High priority tickets that are NOT resolved
// ─────────────────────────────────────────────────────────────
print("\n=== Q4: High priority, not resolved ===");
printjson(
  db.tickets.find({
    priority: "high",
    status: { $nin: ["resolved", "closed"] }
  }).toArray()
);

// ─────────────────────────────────────────────────────────────
// Q5: Sort + Limit — 3 most recent tickets
// ─────────────────────────────────────────────────────────────
print("\n=== Q5: 3 most recent tickets ===");
printjson(
  db.tickets.find({}, { _id: 0, ticketId: 1, title: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .limit(3)
    .toArray()
);

// ─────────────────────────────────────────────────────────────
// Q6: Regex — Tickets mentioning "wifi" or "network"
// ─────────────────────────────────────────────────────────────
print("\n=== Q6: Regex search (wifi|network) ===");
printjson(
  db.tickets.find({
    $or: [
      { title: { $regex: /wifi|network/i } },
      { description: { $regex: /wifi|network/i } }
    ]
  }, { _id: 0, ticketId: 1, title: 1 }).toArray()
);

// ─────────────────────────────────────────────────────────────
// Q7: Array query — Tickets tagged with "hostel"
// ─────────────────────────────────────────────────────────────
print("\n=== Q7: Tickets tagged 'hostel' ===");
printjson(
  db.tickets.find(
    { tags: "hostel" },
    { _id: 0, ticketId: 1, title: 1, tags: 1 }
  ).toArray()
);

// ─────────────────────────────────────────────────────────────
// Q8: Date range — Tickets created in January 2026
// ─────────────────────────────────────────────────────────────
print("\n=== Q8: Tickets created in January 2026 ===");
printjson(
  db.tickets.find({
    createdAt: {
      $gte: new Date("2026-01-01"),
      $lt:  new Date("2026-02-01")
    }
  }, { _id: 0, ticketId: 1, title: 1, createdAt: 1 }).toArray()
);

// ─────────────────────────────────────────────────────────────
// Q9: Aggregation — Count tickets by category
// ─────────────────────────────────────────────────────────────
print("\n=== Q9: Aggregation — tickets per category ===");
printjson(
  db.tickets.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray()
);

// ─────────────────────────────────────────────────────────────
// Q10: Aggregation — Count by status
// ─────────────────────────────────────────────────────────────
print("\n=== Q10: Aggregation — tickets per status ===");
printjson(
  db.tickets.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray()
);

// ─────────────────────────────────────────────────────────────
// Q11: Aggregation pipeline — Avg attachments per category
// ─────────────────────────────────────────────────────────────
print("\n=== Q11: Avg attachments per category ===");
printjson(
  db.tickets.aggregate([
    { $project: { category: 1, attachmentCount: { $size: "$attachments" } } },
    { $group: { _id: "$category", avgAttachments: { $avg: "$attachmentCount" } } },
    { $sort: { avgAttachments: -1 } }
  ]).toArray()
);

// ─────────────────────────────────────────────────────────────
// Q12: Aggregation — Tickets per student with unwind comments
// ─────────────────────────────────────────────────────────────
print("\n=== Q12: Total comments per student ===");
printjson(
  db.tickets.aggregate([
    { $unwind: { path: "$comments", preserveNullAndEmptyArrays: true } },
    { $group: {
        _id: "$studentName",
        ticketCount: { $addToSet: "$ticketId" },
        totalComments: { $sum: { $cond: [{ $ifNull: ["$comments", false] }, 1, 0] } }
    }},
    { $project: {
        studentName: "$_id",
        ticketCount: { $size: "$ticketCount" },
        totalComments: 1,
        _id: 0
    }},
    { $sort: { totalComments: -1 } }
  ]).toArray()
);

// ─────────────────────────────────────────────────────────────
// Q13: Update — Add a comment to TKT-003
// ─────────────────────────────────────────────────────────────
print("\n=== Q13: Update — add comment to TKT-003 ===");
db.tickets.updateOne(
  { ticketId: "TKT-003" },
  {
    $push: {
      comments: {
        author: "admin@uni.edu",
        role: "admin",
        text: "Plumbing team dispatched. Expected fix by tonight.",
        createdAt: new Date()
      }
    },
    $set: { updatedAt: new Date(), status: "in-progress" }
  }
);
printjson(db.tickets.findOne({ ticketId: "TKT-003" }, { _id: 0, ticketId: 1, status: 1, comments: 1 }));

// ─────────────────────────────────────────────────────────────
// Q14: Delete — Remove closed tickets older than 60 days
// ─────────────────────────────────────────────────────────────
print("\n=== Q14: Delete old closed tickets (demo) ===");
const deleteResult = db.tickets.deleteMany({
  status: "closed",
  resolvedAt: { $lt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) }
});
print("Deleted: " + deleteResult.deletedCount);

// ─────────────────────────────────────────────────────────────
// Q15: $exists — Tickets that have been resolved
// ─────────────────────────────────────────────────────────────
print("\n=== Q15: Tickets with resolvedAt field ===");
printjson(
  db.tickets.find(
    { resolvedAt: { $exists: true } },
    { _id: 0, ticketId: 1, title: 1, resolvedAt: 1 }
  ).toArray()
);

print("\n✅ All queries executed successfully.");
