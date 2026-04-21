"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";

const API = "http://localhost:8000/api/v1/admin";

function authHeader() {
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

interface Room {
  id: number;
  title: string;
  city: string;
  address: string;
  room_type: string;
  price_per_month: number;
  status: string;
  is_verified: boolean;
  admin_deactivated: boolean;
  admin_deactivation_reason: string | null;
  admin_deactivated_at: string | null;
  created_at: string | null;
  owner: { id: number; full_name: string; email: string } | null;
}

interface Pagination { page: number; limit: number; total: number; total_pages: number }

const STATUS_BADGE: Record<string, string> = {
  available: "bg-emerald-900/40 text-emerald-400",
  occupied: "bg-red-900/40 text-red-400",
  reserved: "bg-amber-900/40 text-amber-400",
  under_maintenance: "bg-orange-900/40 text-orange-400",
  inactive: "bg-gray-800 text-gray-400",
};

const STATUS_OPTIONS = [
  { value: "available", label: "Available", color: "text-emerald-400" },
  { value: "inactive", label: "Delist (Inactive)", color: "text-gray-400" },
  { value: "under_maintenance", label: "Under Maintenance", color: "text-orange-400" },
  { value: "occupied", label: "Occupied", color: "text-red-400" },
  { value: "reserved", label: "Reserved", color: "text-amber-400" },
];

function ActionMenu({
  room,
  onVerify,
  onSetStatus,
  onAdminDeactivate,
  onAdminReactivate,
  onDelete,
}: {
  room: Room;
  onVerify: () => void;
  onSetStatus: (s: string) => void;
  onAdminDeactivate: () => void;
  onAdminReactivate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-all"
      >
        Actions
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-20 overflow-hidden">
          {/* Verify toggle */}
          <button
            onClick={() => { onVerify(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-700 transition-colors text-left"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${room.is_verified ? "bg-gray-400" : "bg-emerald-400"}`} />
            <span className={room.is_verified ? "text-gray-400" : "text-emerald-400"}>
              {room.is_verified ? "Unverify listing" : "Verify listing"}
            </span>
          </button>

          <div className="h-px bg-gray-700 mx-2" />

          {/* Admin deactivate / reactivate */}
          {room.admin_deactivated ? (
            <button
              onClick={() => { onAdminReactivate(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-400 hover:bg-emerald-900/20 transition-colors text-left"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Lift Admin Ban (Reactivate)
            </button>
          ) : (
            <button
              onClick={() => { onAdminDeactivate(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-orange-400 hover:bg-orange-900/20 transition-colors text-left"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Admin Deactivate (with reason)
            </button>
          )}

          {!room.admin_deactivated && (
            <>
              <div className="h-px bg-gray-700 mx-2" />
              {/* Status options */}
              <div className="px-3 py-1.5">
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Set Status</p>
              </div>
              {STATUS_OPTIONS.filter((o) => o.value !== room.status).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onSetStatus(opt.value); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-700 transition-colors text-left"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    opt.value === "available" ? "bg-emerald-400" :
                    opt.value === "inactive" ? "bg-gray-400" :
                    opt.value === "under_maintenance" ? "bg-orange-400" :
                    opt.value === "occupied" ? "bg-red-400" : "bg-amber-400"
                  }`} />
                  <span className={opt.color}>{opt.label}</span>
                </button>
              ))}
            </>
          )}

          <div className="h-px bg-gray-700 mx-2" />

          {/* Delete */}
          <button
            onClick={() => { onDelete(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/30 transition-colors text-left"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete permanently
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [acting, setActing] = useState<number | null>(null);
  const [deactivateModal, setDeactivateModal] = useState<{ id: number; title: string } | null>(null);
  const [deactivateReason, setDeactivateReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("room_status", statusFilter);
      const res = await fetch(`${API}/rooms?${params}`, { headers: authHeader() });
      const data = await res.json();
      if (data.success) {
        setRooms(data.data.rooms);
        setPagination(data.data.pagination);
      }
    } catch {
      toast.error("Failed to load rooms");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const toggleVerify = async (id: number) => {
    setActing(id);
    try {
      const res = await fetch(`${API}/rooms/${id}/verify`, { method: "PATCH", headers: authHeader() });
      const data = await res.json();
      if (data.success) {
        setRooms((prev) => prev.map((r) => r.id === id ? { ...r, is_verified: data.data.is_verified } : r));
        toast.success(data.message);
      }
    } catch { toast.error("Action failed"); }
    finally { setActing(null); }
  };

  const setStatus = async (id: number, newStatus: string) => {
    setActing(id);
    try {
      const res = await fetch(`${API}/rooms/${id}/status`, {
        method: "PATCH",
        headers: authHeader(),
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setRooms((prev) => prev.map((r) => r.id === id ? { ...r, status: data.data.status } : r));
        toast.success(data.message);
      } else {
        toast.error(data.message || "Failed to update status");
      }
    } catch { toast.error("Action failed"); }
    finally { setActing(null); }
  };

  const adminDeactivate = async () => {
    if (!deactivateModal) return;
    if (!deactivateReason.trim()) { toast.error("Please enter a reason"); return; }
    setActing(deactivateModal.id);
    try {
      const res = await fetch(`${API}/rooms/${deactivateModal.id}/admin-deactivate`, {
        method: "PATCH",
        headers: authHeader(),
        body: JSON.stringify({ reason: deactivateReason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setRooms((prev) => prev.map((r) => r.id === deactivateModal.id
          ? { ...r, status: "inactive", admin_deactivated: true, admin_deactivation_reason: deactivateReason.trim() }
          : r));
        toast.success("Room admin-deactivated");
      } else {
        toast.error(data.message || "Failed");
      }
    } catch { toast.error("Action failed"); }
    finally { setActing(null); setDeactivateModal(null); setDeactivateReason(""); }
  };

  const adminReactivate = async (id: number) => {
    setActing(id);
    try {
      const res = await fetch(`${API}/rooms/${id}/admin-reactivate`, {
        method: "PATCH",
        headers: authHeader(),
      });
      const data = await res.json();
      if (data.success) {
        setRooms((prev) => prev.map((r) => r.id === id
          ? { ...r, status: "available", admin_deactivated: false, admin_deactivation_reason: null }
          : r));
        toast.success("Room reactivated");
      } else {
        toast.error(data.message || "Failed");
      }
    } catch { toast.error("Action failed"); }
    finally { setActing(null); }
  };

  const deleteRoom = async (id: number) => {
    try {
      const res = await fetch(`${API}/rooms/${id}`, { method: "DELETE", headers: authHeader() });
      const data = await res.json();
      if (data.success) {
        setRooms((prev) => prev.filter((r) => r.id !== id));
        toast.success("Room deleted");
      }
    } catch { toast.error("Delete failed"); }
    finally { setConfirmDelete(null); }
  };

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString() : "—";

  // Summary counts
  const counts = rooms.reduce<Record<string, number>>((a, r) => {
    a[r.status] = (a[r.status] || 0) + 1;
    return a;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Rooms</h1>
        <p className="text-gray-400 text-sm mt-1">{pagination.total} total listings</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Available", key: "available", color: "text-emerald-400", dot: "bg-emerald-400" },
          { label: "Occupied", key: "occupied", color: "text-red-400", dot: "bg-red-400" },
          { label: "Reserved", key: "reserved", color: "text-amber-400", dot: "bg-amber-400" },
          { label: "Maintenance", key: "under_maintenance", color: "text-orange-400", dot: "bg-orange-400" },
          { label: "Inactive", key: "inactive", color: "text-gray-400", dot: "bg-gray-500" },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => { setStatusFilter(statusFilter === s.key ? "" : s.key); setPage(1); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-left ${
              statusFilter === s.key
                ? "bg-gray-800 border-gray-600"
                : "bg-gray-900 border-gray-800 hover:border-gray-700"
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
            <div>
              <p className={`text-xs font-semibold ${s.color}`}>{counts[s.key] ?? 0}</p>
              <p className="text-gray-500 text-xs leading-none">{s.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by title, city, address..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {statusFilter && (
          <button
            onClick={() => setStatusFilter("")}
            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 text-sm hover:text-white transition-all flex items-center gap-2"
          >
            Clear filter
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Room</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Owner</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Type</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Price/mo</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Verified</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Listed</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-gray-800 rounded animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rooms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <svg className="w-10 h-10 text-gray-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <p className="text-gray-500">No rooms found</p>
                  </td>
                </tr>
              ) : (
                rooms.map((room) => (
                  <tr key={room.id} className={`hover:bg-gray-800/40 transition-colors ${acting === room.id ? "opacity-50 pointer-events-none" : ""}`}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white text-sm font-medium line-clamp-1 max-w-[180px]">{room.title}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{room.city}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-gray-300 text-sm">{room.owner?.full_name ?? "—"}</p>
                        <p className="text-gray-600 text-xs">{room.owner?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-400 text-sm capitalize">{room.room_type}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-sm font-medium whitespace-nowrap">
                      Rs. {room.price_per_month.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md capitalize ${STATUS_BADGE[room.status] || "bg-gray-800 text-gray-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          room.status === "available" ? "bg-emerald-400" :
                          room.status === "occupied" ? "bg-red-400" :
                          room.status === "reserved" ? "bg-amber-400" :
                          room.status === "under_maintenance" ? "bg-orange-400" : "bg-gray-500"
                        }`} />
                        {room.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md ${room.is_verified ? "bg-emerald-900/40 text-emerald-400" : "bg-gray-800 text-gray-500"}`}>
                          {room.is_verified ? (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : null}
                          {room.is_verified ? "Verified" : "Unverified"}
                        </span>
                        {room.admin_deactivated && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md bg-red-900/50 text-red-300 border border-red-700/40 cursor-help"
                            title={room.admin_deactivation_reason || ""}
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            Admin ban
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">{fmt(room.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end">
                        <ActionMenu
                          room={room}
                          onVerify={() => toggleVerify(room.id)}
                          onSetStatus={(s) => setStatus(room.id, s)}
                          onAdminDeactivate={() => setDeactivateModal({ id: room.id, title: room.title })}
                          onAdminReactivate={() => adminReactivate(room.id)}
                          onDelete={() => setConfirmDelete(room.id)}
                        />
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
              Page {pagination.page} of {pagination.total_pages} · {pagination.total} rooms
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

      {/* Admin Deactivate Modal */}
      {deactivateModal !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-900/40 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">Admin Deactivate Room</h3>
                <p className="text-gray-500 text-xs truncate max-w-[260px]">{deactivateModal.title}</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-1">
              This will set the listing to <span className="text-red-400 font-medium">inactive</span> and <span className="text-red-400 font-medium">the landlord will not be able to reactivate it</span>. Only an admin can lift this ban.
            </p>
            <p className="text-gray-500 text-xs mb-4">The reason will be visible to the landlord on their dashboard.</p>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Reason <span className="text-red-400">*</span>
              </label>
              <textarea
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                rows={3}
                placeholder="e.g. Violates platform policy – misleading listing description"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setDeactivateModal(null); setDeactivateReason(""); }}
                className="flex-1 py-2.5 px-4 bg-gray-800 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={adminDeactivate}
                disabled={!deactivateReason.trim()}
                className="flex-1 py-2.5 px-4 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Deactivate Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-900/40 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">Delete Room?</h3>
                <p className="text-gray-500 text-xs">This cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-6">All images, bookings and data tied to this listing will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 px-4 bg-gray-800 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-700 transition-all">
                Cancel
              </button>
              <button onClick={() => deleteRoom(confirmDelete)}
                className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-500 transition-all">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
