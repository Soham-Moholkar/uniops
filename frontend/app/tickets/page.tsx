"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Ticket {
  _id: string;
  ticketId: string;
  studentName: string;
  studentEmail: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
  tags: string[];
  comments: { author: string; role: string; text: string; createdAt: string }[];
  attachments: { filename: string; contentType: string; size: number }[];
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState({
    studentId: 1, studentName: "", studentEmail: "",
    category: "infrastructure", title: "", description: "",
    priority: "medium", tags: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchTickets = async () => {
    const params: any = {};
    if (statusFilter) params.status = statusFilter;
    const { data } = await api.get("/tickets", { params });
    setTickets(data);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, [statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      await api.post("/tickets", {
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        attachments: [],
      });
      setSuccess("Ticket created!");
      setShowForm(false);
      setForm({ studentId: 1, studentName: "", studentEmail: "", category: "infrastructure", title: "", description: "", priority: "medium", tags: "" });
      fetchTickets();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed");
    }
  };

  const handleComment = async () => {
    if (!selected || !commentText.trim()) return;
    setError("");
    try {
      await api.post(`/tickets/${selected.ticketId}/comment`, { text: commentText });
      setCommentText("");
      // Refresh selected ticket
      const { data } = await api.get(`/tickets/${selected.ticketId}`);
      setSelected(data);
      fetchTickets();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to add comment");
    }
  };

  const handleStatusUpdate = async (ticketId: string, status: string) => {
    try {
      await api.patch(`/tickets/${ticketId}`, { status });
      fetchTickets();
      if (selected?.ticketId === ticketId) {
        const { data } = await api.get(`/tickets/${ticketId}`);
        setSelected(data);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Update failed");
    }
  };

  const priorityBadge = (p: string) => {
    const cls = p === "critical" ? "badge-red" : p === "high" ? "badge-yellow" : p === "medium" ? "badge-blue" : "badge-gray";
    return <span className={cls}>{p}</span>;
  };

  const statusBadge = (s: string) => {
    const cls = s === "open" ? "badge-blue" : s === "in-progress" ? "badge-yellow" : s === "resolved" ? "badge-green" : "badge-gray";
    return <span className={cls}>{s}</span>;
  };

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-indigo-700">Helpdesk Tickets <span className="text-sm font-normal text-gray-400">(MongoDB)</span></h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New Ticket"}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">{success}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Student ID</label>
            <input className="input" type="number" min={1} value={form.studentId}
              onChange={(e) => setForm({...form, studentId: Number(e.target.value)})} required />
          </div>
          <div>
            <label className="label">Student Name</label>
            <input className="input" value={form.studentName} onChange={(e) => setForm({...form, studentName: e.target.value})} required />
          </div>
          <div>
            <label className="label">Student Email</label>
            <input className="input" type="email" value={form.studentEmail}
              onChange={(e) => setForm({...form, studentEmail: e.target.value})} required />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}>
              {["infrastructure", "academic", "hostel", "library", "transport"].map((c) =>
                <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})}>
              {["low", "medium", "high", "critical"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tags (comma-separated)</label>
            <input className="input" value={form.tags} onChange={(e) => setForm({...form, tags: e.target.value})} placeholder="wifi, urgent" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required minLength={5} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea className="input h-24" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} required minLength={10} />
          </div>
          <div><button type="submit" className="btn-primary">Submit Ticket</button></div>
        </form>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {["", "open", "in-progress", "resolved", "closed"].map((s) => (
          <button key={s} className={`btn text-sm ${statusFilter === s ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setStatusFilter(s)}>
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ticket list */}
        <div className="lg:col-span-2 space-y-3">
          {tickets.map((t) => (
            <div key={t.ticketId}
              className={`card cursor-pointer transition-colors ${selected?.ticketId === t.ticketId ? "border-indigo-500 ring-2 ring-indigo-200" : ""}`}
              onClick={() => setSelected(t)}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs text-gray-400 font-mono">{t.ticketId}</span>
                  <h3 className="font-medium">{t.title}</h3>
                  <p className="text-sm text-gray-500">{t.studentName} · {t.category}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {statusBadge(t.status)}
                  {priorityBadge(t.priority)}
                </div>
              </div>
              <div className="flex gap-1 mt-2">
                {t.tags.map((tag) => <span key={tag} className="badge-gray text-xs">{tag}</span>)}
              </div>
            </div>
          ))}
          {tickets.length === 0 && <p className="text-gray-400 text-center py-8">No tickets found</p>}
        </div>

        {/* Ticket detail */}
        <div className="lg:col-span-1">
          {selected ? (
            <div className="card sticky top-20">
              <h3 className="font-bold text-lg mb-1">{selected.title}</h3>
              <div className="flex gap-2 mb-3">
                {statusBadge(selected.status)}
                {priorityBadge(selected.priority)}
              </div>
              <p className="text-sm text-gray-600 mb-3">{selected.description}</p>
              <p className="text-xs text-gray-400 mb-1">By: {selected.studentName} ({selected.studentEmail})</p>
              <p className="text-xs text-gray-400 mb-4">Created: {new Date(selected.createdAt).toLocaleString()}</p>

              {/* Status actions */}
              <div className="flex gap-1 mb-4">
                {selected.status !== "resolved" && (
                  <button className="text-xs btn-success px-2 py-1" onClick={() => handleStatusUpdate(selected.ticketId, "resolved")}>Resolve</button>
                )}
                {selected.status !== "in-progress" && selected.status !== "resolved" && (
                  <button className="text-xs btn-primary px-2 py-1" onClick={() => handleStatusUpdate(selected.ticketId, "in-progress")}>In Progress</button>
                )}
              </div>

              {/* Attachments */}
              {selected.attachments.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold mb-1">Attachments</h4>
                  {selected.attachments.map((a, i) => (
                    <div key={i} className="text-xs text-gray-500">📎 {a.filename} ({(a.size / 1024).toFixed(0)} KB)</div>
                  ))}
                </div>
              )}

              {/* Comments */}
              <h4 className="text-sm font-semibold mb-2">Comments ({selected.comments.length})</h4>
              <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
                {selected.comments.map((c, i) => (
                  <div key={i} className="bg-gray-50 rounded p-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{c.author}</span>
                      <span className="badge-gray text-xs">{c.role}</span>
                    </div>
                    <p className="text-gray-700 mt-1">{c.text}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(c.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="input text-sm" placeholder="Add comment..." value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleComment()} />
                <button className="btn-primary text-sm" onClick={handleComment}>Send</button>
              </div>
            </div>
          ) : (
            <div className="card text-center text-gray-400 py-12">
              Select a ticket to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
