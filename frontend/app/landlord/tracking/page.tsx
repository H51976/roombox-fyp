"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

const API = "http://localhost:8000/api/v1";

interface PaymentRecord {
  id: number;
  amount: number;
  type: string;
  month: string | null;
  status: string;
  completed_at: string | null;
}

interface TenantTracking {
  booking_id: number;
  room_id: number;
  room_title: string;
  room_address: string | null;
  tenant_id: number;
  tenant_name: string;
  tenant_email: string | null;
  tenant_phone: string | null;
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
  payment_history: PaymentRecord[];
}

interface MonthlyIncome {
  month: string;
  short: string;
  amount: number;
}

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function fmtRs(n: number) {
  return `Rs. ${n.toLocaleString()}`;
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
      <div className={`h-2.5 rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function MiniBarChart({ data }: { data: MonthlyIncome[] }) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  return (
    <div className="flex items-end gap-2 h-20">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-emerald-500 rounded-t-sm opacity-80 transition-all hover:opacity-100"
            style={{ height: `${Math.max(4, (d.amount / max) * 72)}px` }}
            title={`${d.month}: ${fmtRs(d.amount)}`}
          />
          <span className="text-xs text-gray-400">{d.short}</span>
        </div>
      ))}
    </div>
  );
}

export default function LandlordTrackingPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [tenants, setTenants] = useState<TenantTracking[]>([]);
  const [incomeMonthly, setIncomeMonthly] = useState<MonthlyIncome[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedTenant, setExpandedTenant] = useState<number | null>(null);
  const [renewModal, setRenewModal] = useState<{ bookingId: number; roomId: number; tenantName: string } | null>(null);
  const [renewDays, setRenewDays] = useState("30");
  const [renewing, setRenewing] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("auth_token");
    if (!t) { router.push("/login"); return; }
    setToken(t);
  }, [router]);

  const load = useCallback(async (t: string) => {
    try {
      const res = await fetch(`${API}/bookings/landlord/tracking`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (data.success) {
        setTenants(data.data.active_tenants || []);
        setIncomeMonthly(data.data.income_monthly || []);
        setTotalRevenue(data.data.total_revenue || 0);
      }
    } catch { toast.error("Failed to load tracking data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (token) load(token); }, [token, load]);

  const handleRenew = async () => {
    if (!renewModal) return;
    const days = parseInt(renewDays);
    if (!days || days < 1) { toast.error("Enter valid days"); return; }
    setRenewing(true);
    try {
      const res = await fetch(`${API}/bookings/rooms/${renewModal.roomId}/renew-tenant?extra_days=${days}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Stay extended by ${days} days`);
        setRenewModal(null);
        setRenewDays("30");
        load(token);
      } else {
        toast.error(data.message || "Failed to renew");
      }
    } catch { toast.error("Connection error"); }
    finally { setRenewing(false); }
  };

  const handleExpire = async (roomId: number) => {
    try {
      const res = await fetch(`${API}/bookings/rooms/${roomId}/expire-tenant`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Room freed successfully");
        load(token);
      } else {
        toast.error(data.message || "Failed to expire tenant");
      }
    } catch { toast.error("Connection error"); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const expiredCount = tenants.filter((t) => t.is_expired).length;
  const soonCount = tenants.filter((t) => !t.is_expired && t.days_left !== null && t.days_left <= 10).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/landlord/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">RoomBox</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/landlord/dashboard" className="text-gray-500 hover:text-gray-700">Dashboard</Link>
            <Link href="/landlord/tracking" className="font-semibold text-emerald-600">Tracking</Link>
            <Link href="/landlord/list-property" className="text-gray-500 hover:text-gray-700">Add Listing</Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tenant & Payment Tracker</h1>
            <p className="text-gray-500 text-sm mt-1">Track all active tenants, payment schedules, and rental income</p>
          </div>
          {(expiredCount > 0 || soonCount > 0) && (
            <div className="flex gap-2 flex-wrap">
              {expiredCount > 0 && (
                <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                  {expiredCount} expired tenancy
                </span>
              )}
              {soonCount > 0 && (
                <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                  {soonCount} expiring soon
                </span>
              )}
            </div>
          )}
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active Tenants", value: tenants.length, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Total Revenue", value: fmtRs(totalRevenue), color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Expired Stays", value: expiredCount, color: "text-red-600", bg: "bg-red-50" },
            { label: "Expiring Soon", value: soonCount, color: "text-amber-600", bg: "bg-amber-50" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                <div className={`w-3 h-3 rounded-full ${s.color.replace("text-", "bg-")}`} />
              </div>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Income Chart */}
        {incomeMonthly.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-gray-900">Monthly Rental Income</h2>
                <p className="text-gray-400 text-xs mt-0.5">Last 6 months</p>
              </div>
              <p className="text-emerald-600 font-bold text-lg">{fmtRs(totalRevenue)}</p>
            </div>
            <MiniBarChart data={incomeMonthly} />
            <div className="mt-4 grid grid-cols-6 gap-2">
              {incomeMonthly.map((m, i) => (
                <div key={i} className="text-center">
                  <p className="text-xs font-medium text-gray-900">{fmtRs(m.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tenant Cards */}
        {tenants.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">No active tenants</p>
            <p className="text-gray-400 text-sm mt-1">Tenants will appear here after booking</p>
          </div>
        ) : (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-gray-900">Active Tenants</h2>
            {tenants.map((t) => (
              <div key={t.booking_id} className={`bg-white rounded-2xl border overflow-hidden ${t.is_expired ? "border-red-200" : t.days_left !== null && t.days_left <= 10 ? "border-amber-200" : "border-gray-200"}`}>
                {/* Alert bar for expired / expiring */}
                {(t.is_expired || (t.days_left !== null && t.days_left <= 10 && !t.is_expired)) && (
                  <div className={`px-5 py-2 text-xs font-semibold ${t.is_expired ? "bg-red-600 text-white" : "bg-amber-500 text-white"}`}>
                    {t.is_expired ? "⚠ Tenancy Expired — Please free the room" : `⏰ Tenancy expiring in ${t.days_left} day${t.days_left !== 1 ? "s" : ""}`}
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
                    {/* Tenant + Room Info */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0">
                        <span className="text-white font-bold text-lg">{t.tenant_name[0]?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{t.tenant_name}</p>
                        <p className="text-sm text-gray-500">{t.tenant_email}</p>
                        {t.tenant_phone && <p className="text-xs text-gray-400">{t.tenant_phone}</p>}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setRenewModal({ bookingId: t.booking_id, roomId: t.room_id, tenantName: t.tenant_name })}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-medium transition-colors"
                      >
                        Extend Stay
                      </button>
                      {t.is_expired && (
                        <button
                          onClick={() => handleExpire(t.room_id)}
                          className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-medium transition-colors"
                        >
                          Free Room
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Room info */}
                  <div className="mb-5 pb-5 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">{t.room_title}</p>
                    {t.room_address && <p className="text-xs text-gray-400 mt-0.5">{t.room_address}</p>}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Monthly Rent</p>
                      <p className="font-bold text-gray-900 text-sm">{fmtRs(t.monthly_rent)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Total Collected</p>
                      <p className="font-bold text-emerald-600 text-sm">{fmtRs(t.total_paid)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Move-in</p>
                      <p className="font-bold text-gray-900 text-xs">{fmt(t.start_date)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Move-out</p>
                      <p className="font-bold text-gray-900 text-xs">{t.end_date ? fmt(t.end_date) : "Open-ended"}</p>
                    </div>
                  </div>

                  {/* Tenancy Progress */}
                  {t.tenancy_progress !== null && t.end_date && (
                    <div className="mb-5">
                      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                        <span>Tenancy Progress</span>
                        <span className="font-medium">
                          {t.is_expired ? (
                            <span className="text-red-600 font-semibold">Expired</span>
                          ) : t.days_left !== null ? (
                            `${t.days_left} days left`
                          ) : null}
                        </span>
                      </div>
                      <ProgressBar
                        pct={t.tenancy_progress}
                        color={t.is_expired ? "bg-red-500" : t.tenancy_progress >= 80 ? "bg-amber-500" : "bg-emerald-500"}
                      />
                    </div>
                  )}

                  {/* Next Payment Due */}
                  <div className={`rounded-xl p-3 mb-4 flex items-center justify-between ${t.days_until_next_payment <= 5 ? "bg-red-50 border border-red-200" : t.days_until_next_payment <= 15 ? "bg-amber-50 border border-amber-200" : "bg-emerald-50 border border-emerald-200"}`}>
                    <div>
                      <p className={`text-xs font-semibold ${t.days_until_next_payment <= 5 ? "text-red-700" : t.days_until_next_payment <= 15 ? "text-amber-700" : "text-emerald-700"}`}>
                        Next Rent Due
                      </p>
                      <p className={`text-xs mt-0.5 ${t.days_until_next_payment <= 5 ? "text-red-500" : t.days_until_next_payment <= 15 ? "text-amber-500" : "text-emerald-500"}`}>
                        {fmt(t.next_payment_date)} · {t.days_until_next_payment}d away
                      </p>
                    </div>
                    <p className={`font-bold text-base ${t.days_until_next_payment <= 5 ? "text-red-700" : t.days_until_next_payment <= 15 ? "text-amber-700" : "text-emerald-700"}`}>
                      {fmtRs(t.monthly_rent)}
                    </p>
                  </div>

                  {/* Payment History Toggle */}
                  <button
                    onClick={() => setExpandedTenant(expandedTenant === t.booking_id ? null : t.booking_id)}
                    className="w-full flex items-center justify-between py-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <span>{t.payment_count} payment{t.payment_count !== 1 ? "s" : ""} recorded</span>
                    <svg className={`w-3.5 h-3.5 transition-transform ${expandedTenant === t.booking_id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedTenant === t.booking_id && (
                    <div className="mt-3 space-y-1.5">
                      {t.payment_history.map((p) => (
                        <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${p.status === "completed" ? "bg-emerald-500" : p.status === "failed" ? "bg-red-500" : "bg-amber-400"}`} />
                            <span className="font-medium text-gray-700 capitalize">{p.type.replace("_", " ")}</span>
                            {p.month && <span className="text-gray-400">{p.month}</span>}
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-gray-900">{fmtRs(p.amount)}</span>
                            <span className="text-gray-400 ml-2">{fmt(p.completed_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Renew Modal */}
      {renewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-900 mb-1">Extend Stay</h3>
            <p className="text-xs text-gray-500 mb-5">{renewModal.tenantName}</p>
            <label className="block text-sm font-medium text-gray-700 mb-2">Extra Days</label>
            <input
              type="number"
              value={renewDays}
              min="1"
              onChange={(e) => setRenewDays(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRenewModal(null)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRenew}
                disabled={renewing}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {renewing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Extend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
