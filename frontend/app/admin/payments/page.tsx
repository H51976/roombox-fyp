"use client";

import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:8000/api/v1/admin";

function authHeader() {
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : "";
  return { Authorization: `Bearer ${token}` };
}

interface Payment {
  id: number;
  booking_id: number;
  amount: number;
  type: string;
  status: string;
  transaction_uuid: string | null;
  esewa_ref_id: string | null;
  tenant: { id: number; name: string } | null;
  landlord: { id: number; name: string } | null;
  room: { id: number; title: string } | null;
  created_at: string | null;
  completed_at: string | null;
}

function fmtRs(n: number) { return `Rs. ${n.toLocaleString()}`; }
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-900/50 text-emerald-400 border-emerald-800",
  pending: "bg-amber-900/50 text-amber-400 border-amber-800",
  failed: "bg-red-900/50 text-red-400 border-red-800",
  refunded: "bg-blue-900/50 text-blue-400 border-blue-800",
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("payment_status", statusFilter);
      const res = await fetch(`${API}/payments?${params}`, { headers: authHeader() });
      const data = await res.json();
      if (data.success) {
        setPayments(data.data.payments || []);
        setTotalPages(data.data.pagination.total_pages || 1);
        setTotal(data.data.pagination.total || 0);
      }
    } catch {}
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const totalAmount = payments
    .filter((p) => p.status === "completed")
    .reduce((a, p) => a + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Payments</h1>
          <p className="text-gray-400 text-sm mt-1">{total} total transactions</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Shown on Page", value: payments.length },
          { label: "Completed Amount", value: fmtRs(totalAmount) },
          { label: "Total Records", value: total },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs">{s.label}</p>
            <p className="text-white font-bold text-lg mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center text-gray-600">No payments found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {["ID", "Tenant", "Landlord", "Room", "Type", "Amount", "Status", "Date"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-5 py-3.5 text-gray-500 text-xs font-mono">#{p.id}</td>
                    <td className="px-5 py-3.5 text-gray-300 font-medium">{p.tenant?.name || "—"}</td>
                    <td className="px-5 py-3.5 text-gray-400">{p.landlord?.name || "—"}</td>
                    <td className="px-5 py-3.5 text-gray-400 max-w-[140px] truncate">{p.room?.title || "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded text-xs capitalize">
                        {p.type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-emerald-400 font-semibold">{fmtRs(p.amount)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 border rounded text-xs font-medium capitalize ${STATUS_COLORS[p.status] || "bg-gray-800 text-gray-400 border-gray-700"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">{fmtDate(p.completed_at || p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800">
            <span className="text-gray-500 text-xs">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-700 transition-colors"
              >
                ← Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-700 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
