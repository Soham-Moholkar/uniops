"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Book {
  book_id: number;
  isbn: string;
  title: string;
  author: string;
  copies_total: number;
  copies_avail: number;
  book_type: string;
}

interface Issue {
  issue_id: number;
  student_id: number;
  student_name: string;
  book_id: number;
  book_title: string;
  issued_at: string;
  due_at: string;
  returned_at: string | null;
  fine_amount: number;
}

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [tab, setTab] = useState<"books" | "issues">("books");
  const [loading, setLoading] = useState(true);

  // Issue form
  const [issueForm, setIssueForm] = useState({ student_id: 1, book_id: 1 });
  const [returnIssueId, setReturnIssueId] = useState<number>(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Add book form
  const [showAddBook, setShowAddBook] = useState(false);
  const [bookForm, setBookForm] = useState({ isbn: "", title: "", author: "", copies_total: 1, book_type: "circulating" });

  const fetchBooks = () => api.get("/library/books").then((r) => setBooks(r.data));
  const fetchIssues = () => api.get("/library/issues").then((r) => setIssues(r.data));

  useEffect(() => {
    Promise.all([fetchBooks(), fetchIssues()]).finally(() => setLoading(false));
  }, []);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      const { data } = await api.post("/library/issue", issueForm);
      setSuccess(data.message);
      fetchBooks(); fetchIssues();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Issue failed");
    }
  };

  const handleReturn = async (issueId: number) => {
    setError(""); setSuccess("");
    try {
      const { data } = await api.post("/library/return", { issue_id: issueId });
      setSuccess(`${data.message}. Fine: ₹${data.fine}`);
      fetchBooks(); fetchIssues();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Return failed");
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      await api.post("/library/books", bookForm);
      setSuccess("Book added!");
      setShowAddBook(false);
      setBookForm({ isbn: "", title: "", author: "", copies_total: 1, book_type: "circulating" });
      fetchBooks();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to add book");
    }
  };

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-indigo-700 mb-4">Library</h1>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">{success}</div>}

      {/* Issue / Return forms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <form onSubmit={handleIssue} className="card">
          <h3 className="font-semibold mb-3">Issue Book</h3>
          <div className="flex gap-2">
            <input className="input" type="number" min={1} placeholder="Student ID"
              value={issueForm.student_id} onChange={(e) => setIssueForm({...issueForm, student_id: Number(e.target.value)})} />
            <select className="input" value={issueForm.book_id}
              onChange={(e) => setIssueForm({...issueForm, book_id: Number(e.target.value)})}>
              {books.filter(b => b.book_type === "circulating" && b.copies_avail > 0).map((b) => (
                <option key={b.book_id} value={b.book_id}>{b.title} ({b.copies_avail} avail)</option>
              ))}
            </select>
            <button type="submit" className="btn-primary whitespace-nowrap">Issue</button>
          </div>
        </form>
        <div className="card">
          <h3 className="font-semibold mb-3">Return Book</h3>
          <div className="flex gap-2">
            <select className="input" value={returnIssueId}
              onChange={(e) => setReturnIssueId(Number(e.target.value))}>
              <option value={0}>Select active issue...</option>
              {issues.filter(i => !i.returned_at).map((i) => (
                <option key={i.issue_id} value={i.issue_id}>
                  #{i.issue_id} — {i.student_name}: {i.book_title}
                </option>
              ))}
            </select>
            <button className="btn-success whitespace-nowrap" disabled={!returnIssueId}
              onClick={() => handleReturn(returnIssueId)}>Return</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button className={`btn ${tab === "books" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("books")}>
          Books Catalog
        </button>
        <button className={`btn ${tab === "issues" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("issues")}>
          Issue Records
        </button>
        <button className="btn-secondary ml-auto" onClick={() => setShowAddBook(!showAddBook)}>
          {showAddBook ? "Cancel" : "+ Add Book"}
        </button>
      </div>

      {showAddBook && (
        <form onSubmit={handleAddBook} className="card mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">ISBN *</label>
            <input className="input" value={bookForm.isbn} onChange={(e) => setBookForm({...bookForm, isbn: e.target.value})} required />
          </div>
          <div>
            <label className="label">Title *</label>
            <input className="input" value={bookForm.title} onChange={(e) => setBookForm({...bookForm, title: e.target.value})} required />
          </div>
          <div>
            <label className="label">Author *</label>
            <input className="input" value={bookForm.author} onChange={(e) => setBookForm({...bookForm, author: e.target.value})} required />
          </div>
          <div>
            <label className="label">Copies</label>
            <input className="input" type="number" min={1} value={bookForm.copies_total}
              onChange={(e) => setBookForm({...bookForm, copies_total: Number(e.target.value)})} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={bookForm.book_type} onChange={(e) => setBookForm({...bookForm, book_type: e.target.value})}>
              <option value="circulating">Circulating</option>
              <option value="reference">Reference (non-issuable)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary">Add Book</button>
          </div>
        </form>
      )}

      {tab === "books" && (
        <div className="card table-container">
          <table>
            <thead>
              <tr><th>ID</th><th>ISBN</th><th>Title</th><th>Author</th><th>Total</th><th>Available</th><th>Type</th></tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b.book_id}>
                  <td>{b.book_id}</td>
                  <td className="font-mono text-xs">{b.isbn}</td>
                  <td className="font-medium">{b.title}</td>
                  <td>{b.author}</td>
                  <td>{b.copies_total}</td>
                  <td className={b.copies_avail === 0 ? "text-red-600 font-bold" : ""}>{b.copies_avail}</td>
                  <td>{b.book_type === "reference" ? <span className="badge-yellow">Reference</span> : <span className="badge-green">Circulating</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "issues" && (
        <div className="card table-container">
          <table>
            <thead>
              <tr><th>#</th><th>Student</th><th>Book</th><th>Issued</th><th>Due</th><th>Returned</th><th>Fine</th></tr>
            </thead>
            <tbody>
              {issues.map((i) => (
                <tr key={i.issue_id}>
                  <td>{i.issue_id}</td>
                  <td>{i.student_name}</td>
                  <td>{i.book_title}</td>
                  <td className="text-xs">{new Date(i.issued_at).toLocaleDateString()}</td>
                  <td className="text-xs">{new Date(i.due_at).toLocaleDateString()}</td>
                  <td>{i.returned_at ? <span className="badge-green">{new Date(i.returned_at).toLocaleDateString()}</span> : <span className="badge-yellow">Active</span>}</td>
                  <td>{i.fine_amount > 0 ? <span className="text-red-600 font-medium">₹{i.fine_amount}</span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
