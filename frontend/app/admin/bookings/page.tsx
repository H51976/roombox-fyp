"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

const API = "http://localhost:8000/api/v1/admin";

function authHeader() {
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

interface Booking {
  id: number;
  status: string;
  monthly_rent: number;
  start_date: string | null;
  created_at: string | null;
  tenant: { id: number; full_name: string; email: string } | null;
  landlord: { id: number; full_name: string; email: string } | null;
  room: { id: number; title: string; city: string } | null;
}

interface Pagination { page: number; limit: number; total: number; total_pages: number }

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-900/40 text-amber-400 border-amber-700/30",
  approved: "bg-emerald-900/40 text-emerald-400 border-emerald-700/30",
  rejected: "bg-red-900/40 text-red-400 border-red-700/30",
  cancelled: "bg-gray-800 text-gray-500 border-gray-700",
  completed: "bg-blue-900/40 text-blue-400 border-blue-700/30",
};

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-400",
  approved: "bg-emerald-400",
  rejected: "bg-red-400",
  cancelled: "bg-gray-500",
  completed: "bg-blue-400",
};

const FILTER_TABS = ["", "pending", "approved", "rejected", "cancelled", "completed"];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: number; type: "cancel" | "delete" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("booking_status", statusFilter);
      const res = await fetch(`${API}/bookings?${params}`, { headers: authHeader() });
      const data = await res.json();
      if (data.success) {
        setBookings(data.data.bookings);
        setPagination(data.data.pagination);
      }
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const cancelBooking = async (id: number) => {
    setActing(id);
    try {
      const res = await fetch(`${API}/bookings/${id}/cancel`, { method: "PATCH", headers: authHeader() });
      const data = await res.json();
      if (data.success) {
        setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: "cancelled" } : b));
        toast.success("Booking cancelled");
      } else {
        toast.error(data.message || "Failed to cancel");
      }
    } catch { toast.error("Action failed"); }
    finally { setActing(null); setConfirmAction(null); }
  };

  const deleteBooking = async (id: number) => {
    setActing(id);
    try {
      const res = await fetch(`${API}/bookings/${id}`, { method: "DELETE", headers: authHeader() });
      const data = await res.json();
      if (data.success) {
        setBookings((prev) => prev.filter((b) => b.id !== id));
        toast.success("Booking deleted");
      }
    } catch { toast.error("Delete failed"); }
    finally { setActing(null); setConfirmAction(null); }
  };

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString() : "—";

  const canCancel = (status: string) => ["pending", "approved"].includes(status);

  // Counts per status across current page
  const counts = bookings.reduce<Record<string, number>>((a, b) => {
    a[b.status] = (a[b.status] || 0) + 1;
    return a;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Bookings</h1>
        <p className="text-gray-400 text-sm mt-1">{pagination.total} total bookings</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              statusFilter === s
                ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/20"
                : "bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-gray-300"
            }`}
          >
            {s !== "" && <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === s ? "bg-white" : STATUS_DOT[s]}`} />}
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-4">#</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-4">Room</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-4">Tenant</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-4">Landlord</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-4">Rent/mo</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-4">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-4">Start</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-4">Created</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-gray-800 rounded animate-pulse w-16" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <svg className="w-10 h-10 text-gray-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500">No bookings found</p>
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className={`hover:bg-gray-800/40 transition-colors ${acting === booking.id ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <td className="px-5 py-4 text-gray-600 text-sm">#{booking.id}</td>
                    <td className="px-5 py-4">
                      <div className="max-w-[150px]">
                        <p className="text-white text-sm font-medium truncate">{booking.room?.title ?? "—"}</p>
                        <p className="text-gray-500 text-xs">{booking.room?.city}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-gray-300 text-sm whitespace-nowrap">{booking.tenant?.full_name ?? "—"}</p>
                        <p className="text-gray-600 text-xs truncate max-w-[130px]">{booking.tenant?.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-gray-300 text-sm whitespace-nowrap">{booking.landlord?.full_name ?? "—"}</p>
                        <p className="text-gray-600 text-xs truncate max-w-[130px]">{booking.landlord?.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-300 text-sm font-medium whitespace-nowrap">
                      Rs. {booking.monthly_rent.toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border capitalize ${STATUS_BADGE[booking.status] || "bg-gray-800 text-gray-400 border-gray-700"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[booking.status] || "bg-gray-500"}`} />
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-sm whitespace-nowrap">{fmt(booking.start_date)}</td>
                    <td className="px-5 py-4 text-gray-500 text-sm whitespace-nowrap">{fmt(booking.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {canCancel(booking.status) && (
                          <button
                            onClick={() => setConfirmAction({ id: booking.id, type: "cancel" })}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-900/30 text-amber-400 hover:bg-amber-900/50 transition-all whitespace-nowrap"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmAction({ id: booking.id, type: "delete" })}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-800 text-gray-400 hover:bg-red-900/30 hover:text-red-400 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
            <p className="text-gray-500 text-sm">
              Page {pagination.page} of {pagination.total_pages} · {pagination.total} bookings
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-all">
                Previous
              </button>
              <button onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))} disabled={page === pagination.total_pages}
                className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-all">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {confirmAction !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            {confirmAction.type === "cancel" ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-900/40 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Cancel Booking #{confirmAction.id}?</h3>
                    <p className="text-gray-500 text-xs">Room will be set back to available</p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-6">The tenant and landlord will be notified that this booking was cancelled by admin.</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmAction(null)}
                    className="flex-1 py-2.5 px-4 bg-gray-800 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-700 transition-all">
                    Keep it
                  </button>
                  <button onClick={() => cancelBooking(confirmAction.id)}
                    className="flex-1 py-2.5 px-4 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-500 transition-all">
                    Cancel Booking
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-900/40 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Delete Booking #{confirmAction.id}?</h3>
                    <p className="text-gray-500 text-xs">This cannot be undone</p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-6">All payment records linked to this booking will also be deleted permanently.</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmAction(null)}
                    className="flex-1 py-2.5 px-4 bg-gray-800 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-700 transition-all">
                    Cancel
                  </button>
                  <button onClick={() => deleteBooking(confirmAction.id)}
                    className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-500 transition-all">
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
