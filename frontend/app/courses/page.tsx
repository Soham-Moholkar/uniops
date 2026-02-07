"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Course {
  course_id: number;
  dept_id: number;
  code: string;
  name: string;
  credits: number;
}

interface Enrollment {
  enroll_id: number;
  student_id: number;
  course_id: number;
  course_code: string;
  course_name: string;
  semester: string;
  grade: string | null;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnroll, setShowEnroll] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ student_id: 1, course_id: 1, semester: "S2026" });
  const [viewStudentId, setViewStudentId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api.get("/courses").then((r) => {
      setCourses(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const fetchEnrollments = async (sid: number) => {
    const { data } = await api.get(`/courses/enrollments/${sid}`);
    setEnrollments(data);
    setViewStudentId(sid);
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      await api.post("/courses/enroll", enrollForm);
      setSuccess("Enrolled successfully!");
      setShowEnroll(false);
      if (viewStudentId) fetchEnrollments(viewStudentId);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Enrollment failed");
    }
  };

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-indigo-700">Courses</h1>
        <button className="btn-primary" onClick={() => setShowEnroll(!showEnroll)}>
          {showEnroll ? "Cancel" : "Enroll Student"}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">{success}</div>}

      {showEnroll && (
        <form onSubmit={handleEnroll} className="card mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Student ID</label>
            <input className="input" type="number" min={1} value={enrollForm.student_id}
              onChange={(e) => setEnrollForm({...enrollForm, student_id: Number(e.target.value)})} required />
          </div>
          <div>
            <label className="label">Course</label>
            <select className="input" value={enrollForm.course_id}
              onChange={(e) => setEnrollForm({...enrollForm, course_id: Number(e.target.value)})}>
              {courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.code} — {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Semester</label>
            <input className="input" value={enrollForm.semester}
              onChange={(e) => setEnrollForm({...enrollForm, semester: e.target.value})} required />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary">Enroll</button>
          </div>
        </form>
      )}

      <div className="card table-container mb-6">
        <table>
          <thead>
            <tr><th>Code</th><th>Name</th><th>Credits</th></tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.course_id}>
                <td className="font-mono font-medium">{c.code}</td>
                <td>{c.name}</td>
                <td>{c.credits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Enrollment viewer */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">View Student Enrollments</h2>
        <div className="flex gap-2 mb-4">
          <input
            className="input w-40"
            type="number"
            min={1}
            placeholder="Student ID"
            onChange={(e) => e.target.value && fetchEnrollments(Number(e.target.value))}
          />
        </div>
        {viewStudentId && (
          <table>
            <thead>
              <tr><th>Course</th><th>Name</th><th>Semester</th><th>Grade</th></tr>
            </thead>
            <tbody>
              {enrollments.map((en) => (
                <tr key={en.enroll_id}>
                  <td className="font-mono">{en.course_code}</td>
                  <td>{en.course_name}</td>
                  <td>{en.semester}</td>
                  <td>{en.grade || <span className="text-gray-400">In Progress</span>}</td>
                </tr>
              ))}
              {enrollments.length === 0 && (
                <tr><td colSpan={4} className="text-center text-gray-400 py-4">No enrollments</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
