"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

const API = "http://localhost:8000/api/v1/admin";

function authHeader() {
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  user_type: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string | null;
  last_login: string | null;
}

interface Pagination { page: number; limit: number; total: number; total_pages: number }

const TYPE_BADGE: Record<string, string> = {
  tenant: "bg-blue-900/50 text-blue-300 border-blue-700/50",
  TENANT: "bg-blue-900/50 text-blue-300 border-blue-700/50",
  landlord: "bg-emerald-900/50 text-emerald-300 border-emerald-700/50",
  LANDLORD: "bg-emerald-900/50 text-emerald-300 border-emerald-700/50",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userType, setUserType] = useState("");
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (userType) params.set("user_type", userType);
      const res = await fetch(`${API}/users?${params}`, { headers: authHeader() });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data.users);
        setPagination(data.data.pagination);
      }
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, search, userType]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (id: number) => {
    try {
      const res = await fetch(`${API}/users/${id}/toggle-active`, {
        method: "PATCH",
        headers: authHeader(),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_active: data.data.is_active } : u)));
        toast.success(data.message);
      }
    } catch {
      toast.error("Action failed");
    }
  };

  const deleteUser = async (id: number) => {
    try {
      const res = await fetch(`${API}/users/${id}`, { method: "DELETE", headers: authHeader() });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        toast.success("User deleted");
      }
    } catch {
      toast.error("Delete failed");
    } finally {
      setConfirmDelete(null);
    }
  };

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "Never");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-gray-400 text-sm mt-1">{pagination.total} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={userType}
          onChange={(e) => { setUserType(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="tenant">Tenants</option>
          <option value="landlord">Landlords</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">User</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Type</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Phone</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Joined</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Last Login</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-gray-800 rounded animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">No users found</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white text-sm font-medium">{user.full_name}</p>
                        <p className="text-gray-500 text-xs">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md border ${TYPE_BADGE[user.user_type] || "bg-gray-800 text-gray-400 border-gray-700"}`}>
                        {user.user_type.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">{user.phone || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md ${user.is_active ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-emerald-400" : "bg-red-400"}`} />
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">{fmt(user.created_at)}</td>
                    <td className="px-6 py-4 text-gray-400 text-sm">{fmt(user.last_login)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleActive(user.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${user.is_active ? "bg-red-900/30 text-red-400 hover:bg-red-900/50" : "bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50"}`}
                        >
                          {user.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(user.id)}
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

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
            <p className="text-gray-500 text-sm">
              Page {pagination.page} of {pagination.total_pages} · {pagination.total} users
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                disabled={page === pagination.total_pages}
                className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-white font-semibold text-lg mb-2">Delete User?</h3>
            <p className="text-gray-400 text-sm mb-6">This action cannot be undone. All data associated with this user will be removed.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 px-4 bg-gray-800 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteUser(confirmDelete)}
                className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-500 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
