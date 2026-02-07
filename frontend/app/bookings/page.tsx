"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Room {
  room_id: number;
  name: string;
  building: string;
  capacity: number;
}

interface Booking {
  booking_id: number;
  room_id: number;
  room_name: string;
  organizer_student_id: number;
  organizer_name: string;
  start_time: string;
  end_time: string;
  purpose: string;
  status: string;
  created_at: string;
}

export default function BookingsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    room_id: 1, organizer_student_id: 1,
    start_time: "", end_time: "", purpose: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchAll = async () => {
    const [roomRes, bookRes] = await Promise.all([
      api.get("/rooms"), api.get("/bookings"),
    ]);
    setRooms(roomRes.data);
    setBookings(bookRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      await api.post("/bookings", form);
      setSuccess("Booking created!");
      setShowForm(false);
      fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create booking");
    }
  };

  const handleStatusChange = async (bookingId: number, status: string) => {
    setError(""); setSuccess("");
    try {
      const { data } = await api.patch(`/bookings/${bookingId}`, { status });
      setSuccess(data.message);
      fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Update failed");
    }
  };

  const statusBadge = (s: string) => {
    const cls = s === "approved" ? "badge-green" : s === "pending" ? "badge-yellow" : s === "rejected" ? "badge-red" : "badge-gray";
    return <span className={cls}>{s}</span>;
  };

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-indigo-700">Room Bookings</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New Booking"}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">{success}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Room</label>
            <select className="input" value={form.room_id}
              onChange={(e) => setForm({...form, room_id: Number(e.target.value)})}>
              {rooms.map((r) => <option key={r.room_id} value={r.room_id}>{r.name} — {r.building} (cap: {r.capacity})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Organizer Student ID</label>
            <input className="input" type="number" min={1} value={form.organizer_student_id}
              onChange={(e) => setForm({...form, organizer_student_id: Number(e.target.value)})} required />
          </div>
          <div>
            <label className="label">Start Time</label>
            <input className="input" type="datetime-local" value={form.start_time}
              onChange={(e) => setForm({...form, start_time: e.target.value})} required />
          </div>
          <div>
            <label className="label">End Time</label>
            <input className="input" type="datetime-local" value={form.end_time}
              onChange={(e) => setForm({...form, end_time: e.target.value})} required />
          </div>
          <div className="md:col-span-2">
            <label className="label">Purpose</label>
            <input className="input" value={form.purpose}
              onChange={(e) => setForm({...form, purpose: e.target.value})} required minLength={5} />
          </div>
          <div>
            <button type="submit" className="btn-primary">Create Booking</button>
          </div>
        </form>
      )}

      {/* Rooms */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-3">Available Rooms</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {rooms.map((r) => (
            <div key={r.room_id} className="border rounded p-3 text-center">
              <div className="font-medium">{r.name}</div>
              <div className="text-xs text-gray-500">{r.building}</div>
              <div className="text-sm">Cap: {r.capacity}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bookings */}
      <div className="card table-container">
        <table>
          <thead>
            <tr><th>#</th><th>Room</th><th>Organizer</th><th>Time</th><th>Purpose</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.booking_id}>
                <td>{b.booking_id}</td>
                <td>{b.room_name}</td>
                <td>{b.organizer_name}</td>
                <td className="text-xs">
                  {new Date(b.start_time).toLocaleString()} —<br />
                  {new Date(b.end_time).toLocaleString()}
                </td>
                <td className="max-w-xs truncate">{b.purpose}</td>
                <td>{statusBadge(b.status)}</td>
                <td>
                  {b.status === "pending" && (
                    <div className="flex gap-1">
                      <button className="text-xs btn-success px-2 py-1" onClick={() => handleStatusChange(b.booking_id, "approved")}>Approve</button>
                      <button className="text-xs btn-danger px-2 py-1" onClick={() => handleStatusChange(b.booking_id, "rejected")}>Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
