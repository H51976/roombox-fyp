"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

const API = "http://localhost:8000/api/v1";

interface PaymentDetail {
  amount: number;
  type: string;
  completed_at?: string | null;
}

interface Booking {
  id: number;
  room_id: number;
  room_title: string;
  start_date: string;
  end_date?: string | null;
  days_left?: number | null;
  is_expired?: boolean;
  monthly_rent: number;
  security_deposit?: number;
  advance_payment?: number;
  status: string;
  tenancy_status?: string;
  tenant_message?: string;
  landlord_response?: string;
  created_at: string;
  total_paid?: number;
  payments?: PaymentDetail[];
}

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function fmtRs(n: number) { return `Rs. ${n.toLocaleString()}`; }

const STATUS: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  approved: { label: "Active", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  pending:  { label: "Pending Payment", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  cancelled:{ label: "Cancelled", bg: "bg-red-50", text: "text-red-600", dot: "bg-red-400" },
  completed:{ label: "Completed", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
  rejected: { label: "Rejected", bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400" },
};

export default function TenantBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const getToken = () => localStorage.getItem("auth_token") || "";

  const fetchBookings = useCallback(async () => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/bookings/my-bookings?user_type=tenant`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBookings(data.data || []);
      } else if (res.status === 401) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        router.push("/login");
      } else {
        toast.error(data.message || "Failed to load bookings");
      }
    } catch {
      toast.error("Connection error — is the server running?");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = getToken();
    const userStr = localStorage.getItem("user");
    if (!token || !userStr) { router.push("/login"); return; }
    fetchBookings();
  }, [router, fetchBookings]);

  /* Sort: active first, then pending, then rest */
  const sorted = [...bookings].sort((a, b) => {
    const order: Record<string, number> = { approved: 0, pending: 1, completed: 2, cancelled: 3, rejected: 4 };
    return (order[a.status] ?? 5) - (order[b.status] ?? 5);
  });

  const active = sorted.filter((b) => b.status === "approved");
  const pending = sorted.filter((b) => b.status === "pending");
  const past = sorted.filter((b) => !["approved", "pending"].includes(b.status));

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
          <div className="flex items-center gap-3 text-sm">
            <Link href="/tenant/search" className="text-gray-500 hover:text-gray-700">Search</Link>
            <Link href="/tenant/bookings" className="font-semibold text-blue-600">Bookings</Link>
            <Link href="/tenant/tracking" className="text-gray-500 hover:text-gray-700">Tracking</Link>
            <Link href="/tenant/messages" className="text-gray-500 hover:text-gray-700">Messages</Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <button onClick={fetchBookings} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-14 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">No bookings yet</p>
            <p className="text-gray-400 text-sm mt-1">Find a room to get started</p>
            <Link href="/tenant/search" className="mt-4 inline-block px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              Browse Rooms
            </Link>
          </div>
        ) : (
          <div className="space-y-8">

            {/* ── Active Bookings ── */}
            {active.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Active</h2>
                <div className="space-y-4">
                  {active.map((b) => <BookingCard key={b.id} booking={b} />)}
                </div>
              </section>
            )}

            {/* ── Pending (awaiting landlord confirmation) ── */}
            {pending.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Pending Payment
                  <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs normal-case font-medium">
                    {pending.length}
                  </span>
                </h2>
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    <strong>Paid via eSewa?</strong> Your landlord will confirm the payment from their dashboard. Once confirmed, your booking will become active.
                  </span>
                </div>
                <div className="space-y-4">
                  {pending.map((b) => <BookingCard key={b.id} booking={b} />)}
                </div>
              </section>
            )}

            {/* ── Past ── */}
            {past.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">History</h2>
                <div className="space-y-3">
                  {past.map((b) => <BookingCard key={b.id} booking={b} compact />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({
  booking: b, compact = false,
}: {
  booking: Booking;
  compact?: boolean;
}) {
  const s = STATUS[b.status] || STATUS.cancelled;
  const totalDue = (b.security_deposit || 0) + (b.advance_payment || 0);
  const isPending = b.status === "pending";
  const isActive = b.status === "approved";

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-shadow hover:shadow-sm ${
      isActive ? "border-emerald-200" : isPending ? "border-amber-200" : "border-gray-200"
    }`}>
      {/* Status bar */}
      <div className={`px-5 py-2.5 flex items-center justify-between ${s.bg}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${s.dot}`} />
          <span className={`text-xs font-semibold ${s.text}`}>{s.label}</span>
        </div>
        <span className="text-xs text-gray-400">#{b.id} · {fmt(b.created_at)}</span>
      </div>

      <div className="px-5 py-4">
        {/* Room title */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-gray-900 text-base leading-snug">{b.room_title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Move-in: {fmt(b.start_date)}{b.end_date ? ` · Move-out: ${fmt(b.end_date)}` : ""}</p>
          </div>
          <Link href={`/tenant/room/${b.room_id}`}
            className="shrink-0 text-xs text-blue-600 hover:text-blue-700 font-medium border border-blue-200 px-2.5 py-1 rounded-lg">
            View
          </Link>
        </div>

        {!compact && (
          <>
            {/* Days left / progress for active */}
            {isActive && b.days_left !== null && b.days_left !== undefined && b.end_date && (
              <div className="mb-4 p-3 bg-emerald-50 rounded-xl flex items-center justify-between">
                <span className="text-sm text-emerald-700 font-medium">
                  {b.is_expired ? "Tenancy expired" : `${b.days_left} days remaining`}
                </span>
                <Link href="/tenant/tracking"
                  className="text-xs text-emerald-600 underline">Track →</Link>
              </div>
            )}

            {/* Financials grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-0.5">Monthly Rent</p>
                <p className="font-bold text-gray-900 text-sm">{fmtRs(b.monthly_rent)}</p>
              </div>
              {(b.security_deposit || 0) > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Security Dep.</p>
                  <p className="font-bold text-gray-900 text-sm">{fmtRs(b.security_deposit!)}</p>
                </div>
              )}
              {(b.advance_payment || 0) > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Advance</p>
                  <p className="font-bold text-gray-900 text-sm">{fmtRs(b.advance_payment!)}</p>
                </div>
              )}
            </div>

            {/* Total paid / due */}
            {isActive && (b.total_paid || 0) > 0 && (
              <div className="flex justify-between items-center text-sm mb-4 pb-4 border-b border-gray-100">
                <span className="text-gray-500">Total Paid</span>
                <span className="font-bold text-emerald-600">{fmtRs(b.total_paid!)}</span>
              </div>
            )}
            {isPending && totalDue > 0 && (
              <div className="flex justify-between items-center text-sm mb-4 pb-4 border-b border-gray-100">
                <span className="text-gray-500">Amount to Pay</span>
                <span className="font-bold text-amber-600">{fmtRs(totalDue)}</span>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        {isPending && (
          <div className="flex items-center gap-2 mt-1 p-3 bg-amber-50 rounded-xl border border-amber-100">
            <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-amber-700">Awaiting landlord confirmation. Your landlord will approve this once payment is verified.</p>
          </div>
        )}

        {isActive && (
          <Link href="/tenant/tracking"
            className="block w-full py-2.5 text-center text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors mt-1">
            View Full Tracking →
          </Link>
        )}

        {b.landlord_response && (
          <p className="mt-3 text-xs text-gray-400 italic border-t border-gray-100 pt-3">
            Note: {b.landlord_response}
          </p>
        )}
      </div>
    </div>
  );
}
