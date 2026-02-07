"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Payment {
  payment_id: number;
  student_id: number;
  student_name: string;
  amount: number;
  type: string;
  paid_at: string;
  ref: string | null;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    const params: any = {};
    if (typeFilter) params.payment_type = typeFilter;
    api.get("/payments", { params }).then((r) => {
      setPayments(r.data);
      setLoading(false);
    });
  }, [typeFilter]);

  const typeBadge = (t: string) => {
    const cls = t === "tuition" ? "badge-blue" : t === "library_fine" ? "badge-red" : t === "event_fee" ? "badge-yellow" : "badge-gray";
    return <span className={cls}>{t.replace("_", " ")}</span>;
  };

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  const total = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-indigo-700 mb-4">Payments</h1>

      <div className="flex gap-2 mb-4">
        {["", "tuition", "library_fine", "event_fee", "other"].map((t) => (
          <button key={t} className={`btn text-sm ${typeFilter === t ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTypeFilter(t)}>
            {t ? t.replace("_", " ") : "All"}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-500 self-center">
          Total: <span className="font-bold text-green-700">₹{total.toLocaleString()}</span>
        </span>
      </div>

      <div className="card table-container">
        <table>
          <thead>
            <tr><th>#</th><th>Student</th><th>Amount</th><th>Type</th><th>Date</th><th>Reference</th></tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.payment_id}>
                <td>{p.payment_id}</td>
                <td>{p.student_name}</td>
                <td className="font-medium">₹{p.amount.toLocaleString()}</td>
                <td>{typeBadge(p.type)}</td>
                <td className="text-xs">{new Date(p.paid_at).toLocaleDateString()}</td>
                <td className="font-mono text-xs">{p.ref || "—"}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-400 py-8">No payments found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
