// =============================================================
// UniOps DB — MongoDB Indexes
// Run: mongosh mongodb://localhost:27017/uniops_nosql indexes.js
// =============================================================

db = db.getSiblingDB("uniops_nosql");

// Unique index on ticketId
db.tickets.createIndex({ ticketId: 1 }, { unique: true });

// Index for filtering by status
db.tickets.createIndex({ status: 1 });

// Index for filtering by category
db.tickets.createIndex({ category: 1 });

// Compound index for student + status queries
db.tickets.createIndex({ studentId: 1, status: 1 });

// Index for date range queries
db.tickets.createIndex({ createdAt: -1 });

// Text index for full-text search on title and description
db.tickets.createIndex({ title: "text", description: "text" });

// Index on tags array for tag-based filtering
db.tickets.createIndex({ tags: 1 });

// Index on priority for priority-based queries
db.tickets.createIndex({ priority: 1 });

print("✅ All indexes created on uniops_nosql.tickets");
print("Indexes:");
printjson(db.tickets.getIndexes());
