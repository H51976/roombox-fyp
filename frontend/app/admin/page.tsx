"use client";

import { useEffect, useState, useCallback } from "react";

const API = "http://localhost:8000/api/v1/admin";

function authHeader() {
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Stats {
  users: { total: number; tenants: number; landlords: number; active: number; new_this_month: number };
  rooms: { total: number; available: number; occupied: number; new_this_month: number };
  bookings: { total: number; pending: number; approved: number };
  revenue: { total: number };
}

interface MonthStat { short: string; users: number; bookings: number }

interface Analytics {
  revenue_monthly: { short: string; month: string; amount: number }[];
  payment_breakdown: { type: string; count: number; total: number }[];
  top_landlords: { landlord_id: number; name: string; revenue: number; transactions: number }[];
  recent_payments: { id: number; amount: number; type: string; tenant_name: string; room_title: string; completed_at: string | null }[];
  booking_breakdown: { status: string; count: number }[];
  room_breakdown: { status: string; count: number }[];
  city_breakdown: { city: string; count: number }[];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon }: {
  label: string; value: number | string; sub?: string; color: string; icon: React.ReactNode
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-400 text-sm font-medium">{label}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function InsightCard({ title, value, note, tone }: {
  title: string; value: string; note: string; tone: "good" | "neutral" | "warn";
}) {
  const toneClass = tone === "good"
    ? "text-emerald-400"
    : tone === "warn"
      ? "text-amber-400"
      : "text-blue-400";
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <p className="text-gray-500 text-xs uppercase tracking-wide">{title}</p>
      <p className={`text-2xl font-bold mt-2 ${toneClass}`}>{value}</p>
      <p className="text-gray-400 text-xs mt-1">{note}</p>
    </div>
  );
}

function BarChart({ data, maxVal, color }: { data: number[]; maxVal: number; color: string }) {
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div
            className={`w-full rounded-t-sm ${color} opacity-80 hover:opacity-100 transition-opacity`}
            style={{ height: maxVal > 0 ? `${Math.max(4, (v / maxVal) * 80)}px` : "4px" }}
          />
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total === 0) return <div className="text-gray-500 text-xs text-center py-6">No data</div>;
  let offset = 0;
  const r = 40;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-6">
      <svg width="100" height="100" viewBox="0 0 100 100">
        {segments.map((seg, i) => {
          const dash = (seg.value / total) * circ;
          const el = (
            <circle
              key={i}
              cx="50" cy="50" r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="18"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
            />
          );
          offset += dash;
          return el;
        })}
        <circle cx="50" cy="50" r="31" fill="#111827" />
        <text x="50" y="54" textAnchor="middle" className="text-xs font-bold" fill="white" fontSize="12">{total}</text>
      </svg>
      <div className="space-y-2 flex-1">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-gray-400 text-xs capitalize">{seg.label}</span>
            </div>
            <span className="text-white text-xs font-semibold">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmtRs(n: number) { return `Rs. ${n.toLocaleString()}`; }
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function pctChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [monthly, setMonthly] = useState<MonthStat[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "analytics">("overview");

  const load = useCallback(async () => {
    try {
      const [sRes, mRes, aRes] = await Promise.all([
        fetch(`${API}/stats`, { headers: authHeader() }),
        fetch(`${API}/monthly-stats`, { headers: authHeader() }),
        fetch(`${API}/analytics`, { headers: authHeader() }),
      ]);
      const [sData, mData, aData] = await Promise.all([sRes.json(), mRes.json(), aRes.json()]);
      if (sData.success) setStats(sData.data);
      if (mData.success) setMonthly(mData.data.monthly);
      if (aData.success) setAnalytics(aData.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const maxUsers = Math.max(...monthly.map((m) => m.users), 1);
  const maxBookings = Math.max(...monthly.map((m) => m.bookings), 1);
  const maxRevenue = Math.max(...(analytics?.revenue_monthly.map((m) => m.amount) || []), 1);

  const roomSegments = (analytics?.room_breakdown || []).map((r) => ({
    label: r.status,
    value: r.count,
    color: r.status === "available" ? "#10b981" : r.status === "occupied" ? "#ef4444" : r.status === "reserved" ? "#f59e0b" : "#6b7280",
  }));

  const bookingSegments = (analytics?.booking_breakdown || []).map((b) => ({
    label: b.status,
    value: b.count,
    color: b.status === "approved" ? "#10b981" : b.status === "pending" ? "#f59e0b" : b.status === "cancelled" ? "#ef4444" : "#6b7280",
  }));
  const revSeries = analytics?.revenue_monthly || [];
  const currentRevenue = revSeries[revSeries.length - 1]?.amount || 0;
  const previousRevenue = revSeries[revSeries.length - 2]?.amount || 0;
  const revenueChange = pctChange(currentRevenue, previousRevenue);
  const occupancyRate = stats?.rooms.total ? ((stats.rooms.occupied / stats.rooms.total) * 100) : 0;
  const approvalRate = stats?.bookings.total ? ((stats.bookings.approved / stats.bookings.total) * 100) : 0;
  const topCity = analytics?.city_breakdown?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Full analytics overview of RoomBox platform</p>
        </div>
        <button
          onClick={() => { setLoading(true); load(); }}
          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={stats?.users.total ?? "—"}
          sub={`+${stats?.users.new_this_month ?? 0} this month · ${stats?.users.active ?? 0} active`}
          color="bg-blue-600/20"
          icon={<svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <StatCard
          label="Total Rooms"
          value={stats?.rooms.total ?? "—"}
          sub={`${stats?.rooms.available ?? 0} available · ${stats?.rooms.occupied ?? 0} occupied`}
          color="bg-emerald-600/20"
          icon={<svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
        />
        <StatCard
          label="Total Bookings"
          value={stats?.bookings.total ?? "—"}
          sub={`${stats?.bookings.pending ?? 0} pending · ${stats?.bookings.approved ?? 0} approved`}
          color="bg-amber-600/20"
          icon={<svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
        <StatCard
          label="Total Revenue"
          value={`Rs. ${(stats?.revenue.total ?? 0).toLocaleString()}`}
          sub="From all completed payments"
          color="bg-purple-600/20"
          icon={<svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* Analytics + Insights strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <InsightCard
          title="Revenue Trend"
          value={`${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}%`}
          note={`Vs previous month (${fmtRs(previousRevenue)})`}
          tone={revenueChange >= 0 ? "good" : "warn"}
        />
        <InsightCard
          title="Occupancy Rate"
          value={`${occupancyRate.toFixed(1)}%`}
          note={`${stats?.rooms.occupied ?? 0} occupied out of ${stats?.rooms.total ?? 0} rooms`}
          tone={occupancyRate >= 60 ? "good" : "neutral"}
        />
        <InsightCard
          title="Booking Approval"
          value={`${approvalRate.toFixed(1)}%`}
          note={`${stats?.bookings.approved ?? 0} approved bookings`}
          tone={approvalRate >= 50 ? "good" : "warn"}
        />
        <InsightCard
          title="Top Listing City"
          value={topCity?.city || "—"}
          note={topCity ? `${topCity.count} active listings` : "No city data yet"}
          tone="neutral"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {(["overview", "analytics", "payments"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${activeTab === tab ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-white font-semibold">User Registrations</h2>
                  <p className="text-gray-500 text-xs mt-0.5">Last 6 months</p>
                </div>
                <span className="text-blue-400 text-sm font-medium">{stats?.users.total} total</span>
              </div>
              <BarChart data={monthly.map((m) => m.users)} maxVal={maxUsers} color="bg-blue-500" />
              <div className="flex justify-between mt-2">
                {monthly.map((m, i) => <span key={i} className="flex-1 text-center text-gray-600 text-xs">{m.short}</span>)}
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-white font-semibold">Bookings</h2>
                  <p className="text-gray-500 text-xs mt-0.5">Last 6 months</p>
                </div>
                <span className="text-amber-400 text-sm font-medium">{stats?.bookings.total} total</span>
              </div>
              <BarChart data={monthly.map((m) => m.bookings)} maxVal={maxBookings} color="bg-amber-500" />
              <div className="flex justify-between mt-2">
                {monthly.map((m, i) => <span key={i} className="flex-1 text-center text-gray-600 text-xs">{m.short}</span>)}
              </div>
            </div>
          </div>

          {/* Breakdown Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-5">User Breakdown</h3>
              <DonutChart segments={[
                { label: "Tenants", value: stats?.users.tenants ?? 0, color: "#3b82f6" },
                { label: "Landlords", value: stats?.users.landlords ?? 0, color: "#10b981" },
              ]} />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-5">Room Status</h3>
              <DonutChart segments={roomSegments} />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-5">Booking Status</h3>
              <DonutChart segments={bookingSegments} />
            </div>
          </div>

          {/* Cities */}
          {analytics?.city_breakdown && analytics.city_breakdown.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-5">Top Cities by Listings</h3>
              <div className="space-y-3">
                {analytics.city_breakdown.map((c, i) => {
                  const max = Math.max(...analytics.city_breakdown.map((x) => x.count), 1);
                  return (
                    <div key={c.city} className="flex items-center gap-4">
                      <span className="text-gray-500 text-xs w-4 text-right">{i + 1}</span>
                      <span className="text-gray-300 text-sm w-24 truncate">{c.city}</span>
                      <div className="flex-1 bg-gray-800 rounded-full h-2">
                        <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${(c.count / max) * 100}%` }} />
                      </div>
                      <span className="text-gray-400 text-xs w-8 text-right">{c.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Revenue Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-white font-semibold">Monthly Revenue</h2>
                <p className="text-gray-500 text-xs mt-0.5">Last 6 months</p>
              </div>
              <span className="text-purple-400 text-sm font-medium">{fmtRs(stats?.revenue.total ?? 0)} total</span>
            </div>
            <BarChart data={(analytics?.revenue_monthly || []).map((m) => m.amount)} maxVal={maxRevenue} color="bg-purple-500" />
            <div className="flex justify-between mt-2">
              {(analytics?.revenue_monthly || []).map((m, i) => <span key={i} className="flex-1 text-center text-gray-600 text-xs">{m.short}</span>)}
            </div>
            <div className="flex justify-between mt-1">
              {(analytics?.revenue_monthly || []).map((m, i) => (
                <span key={i} className="flex-1 text-center text-purple-400 text-xs font-medium">{m.amount > 0 ? fmtRs(m.amount) : ""}</span>
              ))}
            </div>
          </div>

          {/* Payment Breakdown + Top Landlords */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-5">Payment Type Breakdown</h3>
              <div className="space-y-3">
                {(analytics?.payment_breakdown || []).map((p) => (
                  <div key={p.type} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <div>
                      <p className="text-gray-300 text-sm font-medium capitalize">{p.type.replace("_", " ")}</p>
                      <p className="text-gray-600 text-xs">{p.count} transaction{p.count !== 1 ? "s" : ""}</p>
                    </div>
                    <span className="text-emerald-400 font-semibold text-sm">{fmtRs(p.total)}</span>
                  </div>
                ))}
                {(!analytics?.payment_breakdown || analytics.payment_breakdown.length === 0) && (
                  <p className="text-gray-600 text-sm text-center py-4">No payment data yet</p>
                )}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-5">Top Landlords by Revenue</h3>
              <div className="space-y-3">
                {(analytics?.top_landlords || []).map((l, i) => (
                  <div key={l.landlord_id} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                      <span className="text-gray-300 text-xs font-bold">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-300 text-sm font-medium truncate">{l.name}</p>
                      <p className="text-gray-600 text-xs">{l.transactions} transactions</p>
                    </div>
                    <span className="text-emerald-400 font-semibold text-sm">{fmtRs(l.revenue)}</span>
                  </div>
                ))}
                {(!analytics?.top_landlords || analytics.top_landlords.length === 0) && (
                  <p className="text-gray-600 text-sm text-center py-4">No landlord data yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PAYMENTS TAB ── */}
      {activeTab === "payments" && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h3 className="text-white font-semibold">Recent Payments</h3>
            <p className="text-gray-500 text-xs mt-0.5">Latest 10 completed transactions</p>
          </div>
          {(analytics?.recent_payments || []).length === 0 ? (
            <div className="py-16 text-center text-gray-600 text-sm">No payments recorded yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-6 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wide">ID</th>
                    <th className="text-left px-6 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wide">Tenant</th>
                    <th className="text-left px-6 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wide hidden md:table-cell">Room</th>
                    <th className="text-left px-6 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wide">Type</th>
                    <th className="text-left px-6 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wide">Amount</th>
                    <th className="text-left px-6 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wide hidden lg:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {(analytics?.recent_payments || []).map((p) => (
                    <tr key={p.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-3.5 text-gray-500 text-xs">#{p.id}</td>
                      <td className="px-6 py-3.5 text-gray-300 font-medium">{p.tenant_name}</td>
                      <td className="px-6 py-3.5 text-gray-400 hidden md:table-cell">{p.room_title}</td>
                      <td className="px-6 py-3.5">
                        <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded text-xs capitalize">
                          {p.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-emerald-400 font-semibold">{fmtRs(p.amount)}</td>
                      <td className="px-6 py-3.5 text-gray-500 text-xs hidden lg:table-cell">{fmtDate(p.completed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-6 py-3 border-t border-gray-800 text-center">
            <a href="/admin/payments" className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors">
              View all payments →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
