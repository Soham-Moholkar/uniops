"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Student {
  student_id: number;
  name: string;
  email: string;
  phone: string | null;
  dept_id: number;
  department_name: string;
  year: number;
  status: string;
  created_at: string;
}

interface Dept {
  dept_id: number;
  name: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", dept_id: 1, year: 1 });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchAll = async () => {
    try {
      const [stuRes, deptRes] = await Promise.all([
        api.get("/students"),
        api.get("/students/departments/list"),
      ]);
      setStudents(stuRes.data);
      setDepts(deptRes.data);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      await api.post("/students", form);
      setSuccess("Student created!");
      setShowForm(false);
      setForm({ name: "", email: "", phone: "", dept_id: 1, year: 1 });
      fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error creating student");
    }
  };

  const statusBadge = (s: string) => {
    const cls = s === "active" ? "badge-green" : s === "suspended" ? "badge-red" : "badge-gray";
    return <span className={cls}>{s}</span>;
  };

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-indigo-700">Students</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Add Student"}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">{success}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Full Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required minLength={2} />
          </div>
          <div>
            <label className="label">Email *</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
          </div>
          <div>
            <label className="label">Department *</label>
            <select className="input" value={form.dept_id} onChange={(e) => setForm({...form, dept_id: Number(e.target.value)})}>
              {depts.map((d) => <option key={d.dept_id} value={d.dept_id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Year *</label>
            <select className="input" value={form.year} onChange={(e) => setForm({...form, year: Number(e.target.value)})}>
              {[1,2,3,4,5].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary">Create Student</button>
          </div>
        </form>
      )}

      <div className="card table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Name</th><th>Email</th><th>Phone</th>
              <th>Department</th><th>Year</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.student_id}>
                <td>{s.student_id}</td>
                <td className="font-medium">{s.name}</td>
                <td>{s.email}</td>
                <td>{s.phone || "—"}</td>
                <td>{s.department_name}</td>
                <td>{s.year}</td>
                <td>{statusBadge(s.status)}</td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-400 py-8">No students found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
