"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import Chat from "@/components/Chat";

interface User {
  id: string;
  email: string;
  full_name?: string;
  user_type?: string;
}

function daysLeft(endDateStr: string | null | undefined): number | null {
  if (!endDateStr) return null;
  const diff = Math.ceil((new Date(endDateStr).getTime() - Date.now()) / 86400000);
  return diff;
}

export default function LandlordDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [income, setIncome] = useState<any>(null);
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "listings" | "tenants" | "bookings" | "income" | "chat">("overview");
  const [renewModal, setRenewModal] = useState<{ id: number; title: string } | null>(null);
  const [renewDays, setRenewDays] = useState("30");
  const [vacateModal, setVacateModal] = useState<{ roomId: number; roomTitle: string; tenantName: string; isExpired: boolean } | null>(null);
  const [vacating, setVacating] = useState(false);
  const [openChat, setOpenChat] = useState<{ chatRoomId: number; otherName: string; roomTitle: string } | null>(null);
  const [pagination, setPagination] = useState({
    page: 1, limit: 12, total: 0, total_pages: 1, has_next: false, has_prev: false,
  });

  useEffect(() => {
    // Check if user is logged in and is a landlord
    const token = localStorage.getItem("auth_token");
    const userStr = localStorage.getItem("user");
    
    if (!token || !userStr) {
      router.push("/login");
      return;
    }
    
    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
      
      // Check if user is landlord
      if (userData.user_type?.toLowerCase() !== "landlord") {
        toast.error("Access denied", {
          description: "This page is only for landlords.",
        });
        router.push("/");
        return;
      }
      
      fetchListings();
      fetchBookings();
      fetchIncome();
      fetchChatRooms(userData.id);
    } catch (error) {
      console.error("Error parsing user data:", error);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  }, [router, pagination.page]);

  const fetchListings = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`http://localhost:8000/api/v1/rooms/my-listings?page=${pagination.page}&limit=${pagination.limit}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        if (data.data?.listings) {
          // New paginated response
          setListings(data.data.listings || []);
          setPagination(data.data.pagination || {
            page: 1,
            limit: 12,
            total: 0,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          });
        } else {
          // Fallback for non-paginated response
          setListings(data.data || []);
        }
      } else {
        toast.error("Failed to fetch listings", {
          description: data.message || "An error occurred.",
        });
      }
    } catch (error) {
      console.error("Error fetching listings:", error);
      toast.error("Network error", {
        description: "Could not connect to the server to fetch listings.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivate = async (listingId: number, listingTitle: string) => {
    if (!confirm(`Deactivate "${listingTitle}"? Your listing will be set to inactive and hidden from tenants. You can reactivate it anytime.`)) {
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`http://localhost:8000/api/v1/rooms/${listingId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ new_status: "inactive" }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Listing deactivated");
        fetchListings();
      } else {
        toast.error("Failed to deactivate listing", {
          description: data.message || "Please try again.",
        });
      }
    } catch (error) {
      console.error("Error deactivating listing:", error);
      toast.error("Connection error", {
        description: "Cannot connect to server. Please try again.",
      });
    }
  };

  const handleToggleStatus = async (listingId: number, currentStatus: string) => {
    const newStatus = currentStatus === "available" ? "inactive" : "available";

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`http://localhost:8000/api/v1/rooms/${listingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ new_status: newStatus }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Listing marked as ${newStatus}`);
        fetchListings();
      } else {
        toast.error("Failed to update status", { description: data.message || "Please try again." });
      }
    } catch (error) {
      toast.error("Connection error");
    }
  };

  const handleVacateTenant = async () => {
    if (!vacateModal) return;
    setVacating(true);
    const endpoint = vacateModal.isExpired
      ? `http://localhost:8000/api/v1/bookings/rooms/${vacateModal.roomId}/expire-tenant`
      : `http://localhost:8000/api/v1/bookings/rooms/${vacateModal.roomId}/vacate-tenant`;
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Room has been freed and is now available.");
        setVacateModal(null);
        fetchListings();
        fetchBookings();
      } else {
        toast.error(data.message || "Could not vacate tenant.");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setVacating(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("http://localhost:8000/api/v1/bookings/my-bookings?user_type=landlord", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setBookings(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  const fetchIncome = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/v1/bookings/landlord/income");
      const data = await response.json();
      
      if (response.ok && data.success) {
        setIncome(data.data);
      }
    } catch (error) {
      console.error("Error fetching income:", error);
    }
  };

  const handleApproveBooking = async (bookingId: number) => {
    if (!confirm("Confirm that payment has been received for this booking? This will activate the tenancy and mark the room as occupied.")) return;
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`http://localhost:8000/api/v1/bookings/${bookingId}/manual-verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Payment confirmed — booking is now active!");
        fetchBookings();
        fetchListings();
      } else {
        toast.error("Failed to confirm payment", {
          description: data.message || "Please try again.",
        });
      }
    } catch (error) {
      console.error("Error confirming booking:", error);
      toast.error("Connection error");
    }
  };

  const handleRejectBooking = async (bookingId: number) => {
    const reason = prompt("Reason for rejection (optional):");
    
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/bookings/${bookingId}/reject`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            landlord_response: reason || null,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Booking rejected");
        fetchBookings();
      } else {
        toast.error("Failed to reject booking", {
          description: data.message || "Please try again.",
        });
      }
    } catch (error) {
      console.error("Error rejecting booking:", error);
      toast.error("Connection error");
    }
  };

  const fetchChatRooms = async (userId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/chat/rooms?user_id=${userId}`);
      const data = await res.json();
      if (data.success) setChatRooms(data.data || []);
    } catch {}
  };

  const handleRenewTenant = async () => {
    if (!renewModal) return;
    const days = parseInt(renewDays);
    if (!days || days < 1) { toast.error("Enter valid number of days"); return; }
    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/bookings/rooms/${renewModal.id}/renew-tenant?extra_days=${days}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(`Tenancy extended by ${days} days`);
        fetchListings();
        setRenewModal(null);
        setRenewDays("30");
      } else {
        toast.error(data.message || "Failed to renew");
      }
    } catch { toast.error("Connection error"); }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    setUser(null);
    toast.success("Logged out successfully");
    router.push("/");
  };

  /* ── derived stats ── */
  const totalListings = listings.length;
  const occupiedListings = listings.filter((l) => l.status === "occupied").length;
  const availableListings = listings.filter((l) => l.status === "available").length;
  const totalIncome = income?.total_income || 0;
  const occupiedWithTenant = listings.filter((l) => l.status === "occupied" && l.active_tenant);
  const expiringCount = occupiedWithTenant.filter((l) => l.tenant_days_remaining !== null && l.tenant_days_remaining <= 30 && !l.is_tenant_expired).length;
  const expiredCount = occupiedWithTenant.filter((l) => l.is_tenant_expired).length;
  const unreadChats = chatRooms.reduce((a: number, c: any) => a + (c.unread_count || 0), 0);

  const Tab = ({ id, label, badge }: { id: string; label: string; badge?: number }) => (
    <button
      onClick={() => setActiveTab(id as any)}
      className={`flex items-center gap-1.5 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
        activeTab === id
          ? "border-blue-500 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
      }`}
    >
      {label}
      {!!badge && <span className="bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">{badge}</span>}
    </button>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">RoomBox</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{user?.full_name || user?.email}</p>
              <p className="text-xs text-gray-400">Landlord</p>
            </div>
            <Link href="/landlord/list-property" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              + New Listing
            </Link>
            <button onClick={handleLogout} className="px-3 py-2 text-sm text-gray-600 hover:text-red-600 transition-colors font-medium">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        {/* Tab bar */}
        <div className="border-b border-gray-200 mb-6 overflow-x-auto">
          <nav className="flex gap-6 min-w-max">
            <Tab id="overview" label="Overview" />
            <Tab id="listings" label={`Listings (${totalListings})`} />
            <Tab id="tenants" label="Tenants" badge={expiredCount || undefined} />
            <Tab id="bookings" label="Bookings" />
            <Tab id="income" label="Income" />
            <Tab id="chat" label="Messages" badge={unreadChats || undefined} />
          </nav>
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Listings", value: totalListings, color: "bg-blue-50 text-blue-700", icon: "🏠" },
                { label: "Occupied", value: occupiedListings, color: "bg-emerald-50 text-emerald-700", icon: "👥" },
                { label: "Available", value: availableListings, color: "bg-amber-50 text-amber-700", icon: "🔑" },
                { label: "Total Income", value: `Rs. ${totalIncome.toLocaleString()}`, color: "bg-purple-50 text-purple-700", icon: "💰" },
              ].map((s) => (
                <div key={s.label} className={`${s.color} rounded-xl p-4`}>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <p className="text-xs font-medium opacity-70 uppercase tracking-wide">{s.label}</p>
                  <p className="text-2xl font-bold mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Alerts */}
            {(expiringCount > 0 || expiredCount > 0) && (
              <div className="space-y-2">
                {expiredCount > 0 && (
                  <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <span className="text-red-500 text-lg">⚠️</span>
                    <p className="text-red-700 text-sm font-medium">{expiredCount} tenant stay(s) expired — free those rooms from the Tenants tab.</p>
                    <button onClick={() => setActiveTab("tenants")} className="ml-auto text-xs text-red-600 underline">View</button>
                  </div>
                )}
                {expiringCount > 0 && (
                  <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <span className="text-amber-500 text-lg">🕐</span>
                    <p className="text-amber-700 text-sm font-medium">{expiringCount} tenant stay(s) expiring within 30 days.</p>
                    <button onClick={() => setActiveTab("tenants")} className="ml-auto text-xs text-amber-600 underline">Review</button>
                  </div>
                )}
              </div>
            )}

            {/* Recent income */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Recent Payments</h3>
              {income?.payments?.length > 0 ? (
                <div className="space-y-3">
                  {income.payments.slice(0, 5).map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{p.room_title}</p>
                        <p className="text-xs text-gray-400">{p.tenant_name} · {p.payment_type.replace(/_/g, " ")}</p>
                      </div>
                      <p className="text-sm font-bold text-emerald-600">+Rs. {p.amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-sm">No payments yet.</p>}
            </div>
          </div>
        )}

        {/* ── TENANTS (occupancy & renewal) ── */}
        {activeTab === "tenants" && (
          <div className="space-y-4">
            <p className="text-gray-500 text-sm">{occupiedWithTenant.length} occupied rooms</p>
            {occupiedWithTenant.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">No occupied rooms right now.</div>
            ) : occupiedWithTenant.map((listing) => {
              const t = listing.active_tenant;
              const totalDays = t.start_date && t.end_date
                ? Math.max(Math.ceil((new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) / 86400000), 1)
                : null;
              const elapsed = t.start_date ? Math.ceil((Date.now() - new Date(t.start_date).getTime()) / 86400000) : 0;
              const progress = totalDays ? Math.min(Math.max((elapsed / totalDays) * 100, 0), 100) : null;
              const isExpired = listing.is_tenant_expired;
              const daysLeft = listing.tenant_days_remaining;

              return (
                <div key={listing.id} className={`bg-white rounded-xl border overflow-hidden ${isExpired ? "border-red-300" : daysLeft !== null && daysLeft <= 30 ? "border-amber-300" : "border-gray-200"}`}>
                  <div className={`px-5 py-3 flex items-center justify-between ${isExpired ? "bg-red-50" : daysLeft !== null && daysLeft <= 30 ? "bg-amber-50" : "bg-gray-50"}`}>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{listing.title}</p>
                      <p className="text-xs text-gray-500">{listing.city}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isExpired ? "bg-red-100 text-red-700" : daysLeft !== null && daysLeft <= 30 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {isExpired ? "EXPIRED" : daysLeft !== null ? `${daysLeft}d left` : "Active"}
                    </span>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="flex flex-wrap gap-4">
                      <div>
                        <p className="text-xs text-gray-400">Tenant</p>
                        <p className="text-sm font-semibold text-gray-800">{t.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Move-in</p>
                        <p className="text-sm font-medium text-gray-700">{t.start_date ? new Date(t.start_date).toLocaleDateString() : "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Move-out</p>
                        <p className="text-sm font-medium text-gray-700">{t.end_date ? new Date(t.end_date).toLocaleDateString() : "Open-ended"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Monthly Rent</p>
                        <p className="text-sm font-bold text-blue-600">Rs. {listing.price_per_month?.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {progress !== null && (
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Tenancy used</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${progress >= 90 ? "bg-red-500" : progress >= 70 ? "bg-amber-400" : "bg-blue-500"}`} style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {isExpired ? (
                        <button
                          onClick={() => setVacateModal({ roomId: listing.id, roomTitle: listing.title, tenantName: t.name, isExpired: true })}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                        >
                          ✓ Free Room (Expired)
                        </button>
                      ) : (
                        <button
                          onClick={() => { setRenewModal({ id: listing.id, title: listing.title }); setRenewDays("30"); }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          Renew / Extend Stay
                        </button>
                      )}
                      {!isExpired && (
                        <button
                          onClick={() => setVacateModal({ roomId: listing.id, roomTitle: listing.title, tenantName: t.name, isExpired: false })}
                          className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                        >
                          Vacate Tenant
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── LISTINGS ── */}
        {activeTab === "listings" && (
          <>
            {listings.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-lg font-semibold text-gray-900 mb-2">No listings yet</p>
                <Link href="/landlord/list-property" className="inline-block mt-3 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium">List Your First Property</Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {listings.map((listing) => (
                  <div key={listing.id} className={`bg-white rounded-xl border overflow-hidden ${listing.admin_deactivated ? "border-red-200" : "border-gray-200 hover:shadow-md"} transition-shadow`}>
                    {listing.admin_deactivated && (
                      <div className="bg-red-50 border-b border-red-200 px-4 py-2.5">
                        <p className="text-xs font-semibold text-red-700">Admin Deactivated</p>
                        {listing.admin_deactivation_reason && <p className="text-xs text-red-500 mt-0.5">{listing.admin_deactivation_reason}</p>}
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900 text-base leading-tight">{listing.title}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${listing.status === "available" ? "bg-emerald-100 text-emerald-700" : listing.status === "occupied" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                          {listing.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">{listing.city}</p>
                      <p className="text-xl font-bold text-blue-600 mb-4">Rs. {listing.price_per_month?.toLocaleString()}<span className="text-xs font-normal text-gray-400">/mo</span></p>

                      {/* Tenant info for occupied */}
                      {listing.status === "occupied" && listing.active_tenant && (
                        <div className="bg-blue-50 rounded-lg px-3 py-2 mb-3 text-xs">
                          <p className="font-medium text-blue-800">{listing.active_tenant.name}</p>
                          {listing.active_tenant.end_date && (
                            <p className={`mt-0.5 ${listing.is_tenant_expired ? "text-red-600 font-semibold" : "text-blue-600"}`}>
                              {listing.is_tenant_expired ? "Stay expired" : `${listing.tenant_days_remaining}d remaining`}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="space-y-2 pt-3 border-t border-gray-100">
                        {listing.admin_deactivated ? (
                          <div className="text-xs text-center text-gray-400 py-2">Actions locked by admin</div>
                        ) : listing.status === "occupied" ? (
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => { setRenewModal({ id: listing.id, title: listing.title }); setRenewDays("30"); }} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">Extend</button>
                            {listing.is_tenant_expired ? (
                              <button
                                onClick={() => setVacateModal({ roomId: listing.id, roomTitle: listing.title, tenantName: listing.active_tenant?.name || "Tenant", isExpired: true })}
                                className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                              >Free Room</button>
                            ) : (
                              <button
                                onClick={() => setVacateModal({ roomId: listing.id, roomTitle: listing.title, tenantName: listing.active_tenant?.name || "Tenant", isExpired: false })}
                                className="flex-1 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                              >Vacate</button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex gap-2">
                              <Link href={`/landlord/edit-property/${listing.id}`} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium text-center hover:bg-blue-700 transition-colors">Edit</Link>
                              <button onClick={() => handleToggleStatus(listing.id, listing.status)} className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${listing.status === "available" ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                                {listing.status === "available" ? "Make Inactive" : "Make Available"}
                              </button>
                            </div>
                            <button onClick={() => handleDeactivate(listing.id, listing.title)} className="w-full px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">Deactivate</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {pagination.total_pages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                <button disabled={!pagination.has_prev} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))} className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40">Previous</button>
                <span className="px-4 py-2 text-sm text-gray-600">Page {pagination.page} / {pagination.total_pages}</span>
                <button disabled={!pagination.has_next} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))} className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40">Next</button>
              </div>
            )}
          </>
        )}

        {/* ── BOOKINGS ── */}
        {activeTab === "bookings" && (
          <div className="space-y-4">
            {/* Pending bookings needing action */}
            {bookings.filter((b: any) => b.status === "pending").length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-2 mb-2">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span><strong>Pending bookings below:</strong> If a tenant has already paid via eSewa, click <em>"Confirm Payment Received"</em> to activate their tenancy.</span>
              </div>
            )}
            {bookings.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">No bookings yet.</div>
            ) : bookings.map((b: any) => (
              <div key={b.id} className={`bg-white rounded-xl border overflow-hidden ${b.status === "pending" ? "border-amber-300" : b.status === "approved" ? "border-emerald-200" : "border-gray-200"}`}>
                {/* Status bar */}
                <div className={`px-5 py-2.5 flex items-center justify-between ${b.status === "pending" ? "bg-amber-50" : b.status === "approved" ? "bg-emerald-50" : "bg-gray-50"}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${b.status === "pending" ? "bg-amber-500" : b.status === "approved" ? "bg-emerald-500" : "bg-gray-400"}`} />
                    <span className={`text-xs font-semibold ${b.status === "pending" ? "text-amber-700" : b.status === "approved" ? "text-emerald-700" : "text-gray-600"}`}>
                      {b.status === "pending" ? "Pending Payment Confirmation" : b.status === "approved" ? "Active" : b.status}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">#{b.id} · {new Date(b.start_date).toLocaleDateString()}</span>
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{b.room_title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">Tenant: <strong>{b.tenant_name}</strong></p>
                      {b.end_date && <p className="text-xs text-gray-400 mt-0.5">Until: {new Date(b.end_date).toLocaleDateString()}</p>}
                    </div>
                  </div>
                  {/* Financials */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-gray-400">Monthly Rent</p>
                      <p className="font-bold text-gray-900 text-sm">Rs. {b.monthly_rent?.toLocaleString()}</p>
                    </div>
                    {b.security_deposit > 0 && (
                      <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                        <p className="text-xs text-gray-400">Security Dep.</p>
                        <p className="font-bold text-gray-900 text-sm">Rs. {b.security_deposit?.toLocaleString()}</p>
                      </div>
                    )}
                    {b.advance_payment > 0 && (
                      <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                        <p className="text-xs text-gray-400">Advance</p>
                        <p className="font-bold text-gray-900 text-sm">Rs. {b.advance_payment?.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  {b.status === "pending" && (
                    <div className="flex justify-between items-center text-sm mb-3 pb-3 border-b border-gray-100">
                      <span className="text-gray-500 font-medium">Amount Paid by Tenant</span>
                      <span className="font-bold text-amber-600">Rs. {((b.security_deposit || 0) + (b.advance_payment || 0)).toLocaleString()}</span>
                    </div>
                  )}
                  {b.tenant_message && <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 mb-3">"{b.tenant_message}"</div>}
                  {b.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveBooking(b.id)}
                        className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Confirm Payment Received
                      </button>
                      <button onClick={() => handleRejectBooking(b.id)} className="px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">Reject</button>
                    </div>
                  )}
                  {b.status === "approved" && b.landlord_response && (
                    <p className="text-xs text-gray-400 italic">{b.landlord_response}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── INCOME ── */}
        {activeTab === "income" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 rounded-xl p-5">
                <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Total Income</p>
                <p className="text-3xl font-bold text-emerald-700 mt-1">Rs. {totalIncome.toLocaleString()}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-5">
                <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Payments</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{income?.payment_count || 0}</p>
              </div>
            </div>
            {income?.payments?.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {income.payments.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.room_title}</p>
                      <p className="text-xs text-gray-400">{p.tenant_name} · {p.payment_type.replace(/_/g, " ")} {p.payment_month && `(${p.payment_month})`}</p>
                      <p className="text-xs text-gray-400">{new Date(p.completed_at).toLocaleDateString()}</p>
                    </div>
                    <p className="text-base font-bold text-emerald-600">Rs. {p.amount.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : <div className="bg-white rounded-xl border p-12 text-center text-gray-400">No payments yet.</div>}
          </div>
        )}

        {/* ── CHAT ── */}
        {activeTab === "chat" && (
          <div className="space-y-3">
            {chatRooms.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">No conversations yet. Tenants can message you from room listings.</div>
            ) : chatRooms.map((cr: any) => (
              <button
                key={cr.id}
                onClick={() => setOpenChat({ chatRoomId: cr.id, otherName: cr.tenant_name, roomTitle: cr.room_title || "Chat" })}
                className="w-full bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4 hover:border-blue-300 hover:shadow-sm transition-all text-left"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-blue-600 font-bold text-sm">{cr.tenant_name?.[0]?.toUpperCase() || "?"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-900 text-sm">{cr.tenant_name}</p>
                    {cr.last_message_time && <p className="text-xs text-gray-400">{new Date(cr.last_message_time).toLocaleDateString()}</p>}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{cr.room_title}</p>
                  {cr.last_message && <p className="text-xs text-gray-500 truncate mt-0.5">{cr.last_message}</p>}
                </div>
                {cr.unread_count > 0 && (
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{cr.unread_count}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Renewal modal */}
      {renewModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-1">Extend Tenancy</h3>
            <p className="text-sm text-gray-500 mb-4 truncate">{renewModal.title}</p>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Extra days</label>
            <input
              type="number"
              min="1"
              value={renewDays}
              onChange={(e) => setRenewDays(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="e.g. 30"
            />
            <div className="flex gap-3">
              <button onClick={() => setRenewModal(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleRenewTenant} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">Extend</button>
            </div>
          </div>
        </div>
      )}

      {/* Vacate Tenant Modal */}
      {vacateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{vacateModal.isExpired ? "Free Room" : "Vacate Tenant"}</h3>
                <p className="text-xs text-gray-500 truncate">{vacateModal.roomTitle}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-700 font-medium">Tenant: <span className="text-gray-900">{vacateModal.tenantName}</span></p>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              {vacateModal.isExpired
                ? "The tenant's stay has ended. Mark this room as available for new bookings?"
                : "Are you sure you want to remove this tenant? Their stay will be ended immediately and the room will be available for new bookings."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setVacateModal(null)}
                disabled={vacating}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVacateTenant}
                disabled={vacating}
                className={`flex-1 py-2.5 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${vacateModal.isExpired ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
              >
                {vacating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                {vacateModal.isExpired ? "Yes, Free Room" : "Yes, Vacate Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat modal */}
      {openChat && user && (
        <Chat
          chatRoomId={openChat.chatRoomId}
          currentUserId={parseInt(user.id)}
          otherUserName={openChat.otherName}
          roomTitle={openChat.roomTitle}
          onClose={() => { setOpenChat(null); fetchChatRooms(user.id); }}
        />
      )}
    </div>
  );
}

