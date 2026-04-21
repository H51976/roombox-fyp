"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

const API = "http://localhost:8000/api/v1";

interface Payment {
  id: number;
  amount: number;
  type: string;
  month: string | null;
  status: string;
  created_at: string | null;
  completed_at: string | null;
  ref_id: string | null;
}

interface ActiveBooking {
  booking_id: number;
  room_id: number;
  room_title: string;
  room_address: string | null;
  room_city: string | null;
  landlord_name: string;
  landlord_id: number;
  monthly_rent: number;
  security_deposit: number | null;
  advance_payment: number | null;
  start_date: string;
  end_date: string | null;
  days_left: number | null;
  is_expired: boolean;
  tenancy_progress: number | null;
  next_payment_date: string;
  days_until_next_payment: number;
  total_paid: number;
  payment_count: number;
  payment_history: Payment[];
}

interface PastBooking {
  booking_id: number;
  room_title: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  total_paid: number;
}

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function fmtRs(n: number) {
  return `Rs. ${n.toLocaleString()}`;
}

function daysBadge(days: number) {
  if (days <= 3) return "bg-red-100 text-red-700";
  if (days <= 10) return "bg-amber-100 text-amber-700";
  return "bg-green-100 text-green-700";
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function TenantTrackingPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [active, setActive] = useState<ActiveBooking[]>([]);
  const [past, setPast] = useState<PastBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dropping, setDropping] = useState<number | null>(null);
  const [dropModal, setDropModal] = useState<{ bookingId: number; roomTitle: string } | null>(null);
  const [dropReason, setDropReason] = useState("");
  const [expandedBooking, setExpandedBooking] = useState<number | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("auth_token");
    const u = localStorage.getItem("user");
    if (!t || !u) { router.push("/login"); return; }
    setToken(t);
  }, [router]);

  const load = useCallback(async (t: string) => {
    try {
      const res = await fetch(`${API}/bookings/tenant/tracking`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (data.success) {
        setActive(data.data.active_bookings || []);
        setPast(data.data.past_bookings || []);
      }
    } catch { toast.error("Failed to load tracking data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (token) load(token); }, [token, load]);

  const handleDropRoom = async () => {
    if (!dropModal) return;
    setDropping(dropModal.bookingId);
    try {
      const res = await fetch(`${API}/bookings/${dropModal.bookingId}/drop-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: dropReason }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Room vacated successfully");
        setDropModal(null);
        setDropReason("");
        load(token);
      } else {
        toast.error(data.message || "Failed to drop room");
      }
    } catch { toast.error("Connection error"); }
    finally { setDropping(null); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/tenant/search" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">RoomBox</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/tenant/search" className="text-gray-500 hover:text-gray-700">Search</Link>
            <Link href="/tenant/bookings" className="text-gray-500 hover:text-gray-700">Bookings</Link>
            <Link href="/tenant/tracking" className="font-semibold text-blue-600">Tracking</Link>
            <Link href="/tenant/messages" className="text-gray-500 hover:text-gray-700">Messages</Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Tenancy Tracker</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor your active stays, payments & schedules</p>
        </div>

        {/* Active Bookings */}
        {active.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center mb-6">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">No active tenancies</p>
            <p className="text-gray-400 text-sm mt-1">Book a room to start tracking your stay</p>
            <Link href="/tenant/search" className="mt-4 inline-block px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              Find Rooms
            </Link>
          </div>
        ) : (
          <div className="space-y-6 mb-8">
            {active.map((b) => (
              <div key={b.booking_id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Card Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-white font-bold text-lg">{b.room_title}</h2>
                      <p className="text-blue-200 text-sm mt-0.5">{b.room_address}{b.room_city ? `, ${b.room_city}` : ""}</p>
                      <p className="text-blue-200 text-xs mt-1">Landlord: {b.landlord_name}</p>
                    </div>
                    <Link
                      href={`/tenant/room/${b.room_id}`}
                      className="shrink-0 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      View Room
                    </Link>
                  </div>
                </div>

                <div className="p-6">
                  {/* Key Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-gray-500 font-medium mb-1">Monthly Rent</p>
                      <p className="text-lg font-bold text-gray-900">{fmtRs(b.monthly_rent)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-gray-500 font-medium mb-1">Total Paid</p>
                      <p className="text-lg font-bold text-emerald-600">{fmtRs(b.total_paid)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-gray-500 font-medium mb-1">Move-in</p>
                      <p className="text-sm font-bold text-gray-900">{fmt(b.start_date)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-gray-500 font-medium mb-1">
                        {b.end_date ? "Move-out" : "Duration"}
                      </p>
                      <p className="text-sm font-bold text-gray-900">{b.end_date ? fmt(b.end_date) : "Open-ended"}</p>
                    </div>
                  </div>

                  {/* Tenancy Progress */}
                  {b.tenancy_progress !== null && b.end_date && (
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Tenancy Progress</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">{b.tenancy_progress}%</span>
                          {b.days_left !== null && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.is_expired ? "bg-red-100 text-red-700" : daysBadge(b.days_left)}`}>
                              {b.is_expired ? "Expired" : `${b.days_left}d left`}
                            </span>
                          )}
                        </div>
                      </div>
                      <ProgressBar
                        pct={b.tenancy_progress}
                        color={b.tenancy_progress >= 90 ? "bg-red-500" : b.tenancy_progress >= 70 ? "bg-amber-500" : "bg-blue-500"}
                      />
                    </div>
                  )}

                  {/* Next Payment Banner */}
                  <div className={`rounded-xl p-4 mb-6 flex items-center justify-between gap-4 ${b.days_until_next_payment <= 5 ? "bg-red-50 border border-red-200" : b.days_until_next_payment <= 15 ? "bg-amber-50 border border-amber-200" : "bg-blue-50 border border-blue-200"}`}>
                    <div>
                      <p className={`text-sm font-semibold ${b.days_until_next_payment <= 5 ? "text-red-700" : b.days_until_next_payment <= 15 ? "text-amber-700" : "text-blue-700"}`}>
                        Next Rent Payment Due
                      </p>
                      <p className={`text-xs mt-0.5 ${b.days_until_next_payment <= 5 ? "text-red-500" : b.days_until_next_payment <= 15 ? "text-amber-500" : "text-blue-500"}`}>
                        {fmt(b.next_payment_date)} · {b.days_until_next_payment} day{b.days_until_next_payment !== 1 ? "s" : ""} away
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${b.days_until_next_payment <= 5 ? "text-red-700" : b.days_until_next_payment <= 15 ? "text-amber-700" : "text-blue-700"}`}>
                        {fmtRs(b.monthly_rent)}
                      </p>
                    </div>
                  </div>

                  {/* Payment History Toggle */}
                  <button
                    onClick={() => setExpandedBooking(expandedBooking === b.booking_id ? null : b.booking_id)}
                    className="w-full flex items-center justify-between py-3 border-t border-gray-100 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <span>Payment History ({b.payment_count} completed)</span>
                    <svg className={`w-4 h-4 transition-transform ${expandedBooking === b.booking_id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedBooking === b.booking_id && (
                    <div className="mt-3 space-y-2">
                      {b.payment_history.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-4">No payments recorded</p>
                      ) : (
                        b.payment_history.map((p) => (
                          <div key={p.id} className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${p.status === "completed" ? "bg-emerald-500" : p.status === "failed" ? "bg-red-500" : "bg-amber-400"}`} />
                              <div>
                                <p className="text-sm font-medium text-gray-800 capitalize">{p.type.replace("_", " ")}</p>
                                {p.month && <p className="text-xs text-gray-400">{p.month}</p>}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">{fmtRs(p.amount)}</p>
                              <p className="text-xs text-gray-400">{fmt(p.completed_at || p.created_at)}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Drop Room */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setDropModal({ bookingId: b.booking_id, roomTitle: b.room_title })}
                      className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Vacate / Drop this room
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Past Bookings */}
        {past.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Past Tenancies</h2>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Room</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Period</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Paid</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {past.map((p) => (
                    <tr key={p.booking_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 font-medium text-gray-900">{p.room_title}</td>
                      <td className="px-5 py-4 text-gray-500 hidden sm:table-cell">
                        {fmt(p.start_date)} — {p.end_date ? fmt(p.end_date) : "—"}
                      </td>
                      <td className="px-5 py-4 font-semibold text-emerald-600">{fmtRs(p.total_paid)}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                          p.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                          p.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Drop Room Modal */}
      {dropModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Vacate Room</h3>
                <p className="text-xs text-gray-500">{dropModal.roomTitle}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to vacate this room? This action cannot be undone. The room will be released back to the market.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason (optional)</label>
              <textarea
                value={dropReason}
                onChange={(e) => setDropReason(e.target.value)}
                rows={3}
                placeholder="e.g. Moving to another city, found another place..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setDropModal(null); setDropReason(""); }}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDropRoom}
                disabled={!!dropping}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {dropping ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                Vacate Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
