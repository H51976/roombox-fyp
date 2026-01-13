"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  full_name?: string;
  user_type?: string;
}

export default function LandlordDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [income, setIncome] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"listings" | "bookings" | "income">("listings");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false,
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
      
      // Fetch listings, bookings, and income
      fetchListings();
      fetchBookings();
      fetchIncome();
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

  const handleDelete = async (listingId: number, listingTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${listingTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/v1/rooms/${listingId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Listing deleted successfully");
        fetchListings(); // Refresh the list
      } else {
        toast.error("Failed to delete listing", {
          description: data.message || "Please try again.",
        });
      }
    } catch (error) {
      console.error("Error deleting listing:", error);
      toast.error("Connection error", {
        description: "Cannot connect to server. Please try again.",
      });
    }
  };

  const handleToggleStatus = async (listingId: number, currentStatus: string) => {
    const newStatus = currentStatus === "available" ? "occupied" : "available";
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/rooms/${listingId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ new_status: newStatus }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Listing marked as ${newStatus}`);
        fetchListings(); // Refresh the list
      } else {
        toast.error("Failed to update status", {
          description: data.message || "Please try again.",
        });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Connection error", {
        description: "Cannot connect to server. Please try again.",
      });
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/v1/bookings/my-bookings?user_type=landlord");
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
    try {
      const response = await fetch(`http://localhost:8000/api/v1/bookings/${bookingId}/approve`, {
        method: "PATCH",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Booking approved successfully");
        fetchBookings();
        fetchListings();
      } else {
        toast.error("Failed to approve booking", {
          description: data.message || "Please try again.",
        });
      }
    } catch (error) {
      console.error("Error approving booking:", error);
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

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    setUser(null);
    toast.success("Logged out successfully");
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">R</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">RoomBox</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{user?.full_name || user?.email}</span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                    Landlord
                  </span>
                </div>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your properties, bookings, and income</p>
          </div>
          <Link
            href="/landlord/list-property"
            className="px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            + List New Property
          </Link>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("listings")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "listings"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Listings
            </button>
            <button
              onClick={() => setActiveTab("bookings")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "bookings"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Bookings ({bookings.filter((b) => b.status === "pending").length})
            </button>
            <button
              onClick={() => setActiveTab("income")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "income"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Income
            </button>
          </nav>
        </div>

        {/* Bookings Tab */}
        {activeTab === "bookings" && (
          <div className="mb-8">
            {bookings.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings yet</h3>
                <p className="text-gray-600">You'll see booking requests here when tenants book your properties.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div key={booking.id} className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{booking.room_title}</h3>
                        <p className="text-sm text-gray-600 mt-1">Tenant: {booking.tenant_name}</p>
                        <p className="text-sm text-gray-600">
                          Start: {new Date(booking.start_date).toLocaleDateString()}
                          {booking.end_date && ` - End: ${new Date(booking.end_date).toLocaleDateString()}`}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        booking.status === "approved" ? "bg-green-100 text-green-700" :
                        booking.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {booking.status}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Monthly Rent</p>
                        <p className="text-lg font-semibold text-gray-900">Rs. {booking.monthly_rent.toLocaleString()}</p>
                      </div>
                      {booking.security_deposit && (
                        <div>
                          <p className="text-sm text-gray-500">Security Deposit</p>
                          <p className="text-lg font-semibold text-gray-900">Rs. {booking.security_deposit.toLocaleString()}</p>
                        </div>
                      )}
                    </div>

                    {booking.tenant_message && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-1">Tenant Message:</p>
                        <p className="text-sm text-gray-600">{booking.tenant_message}</p>
                      </div>
                    )}

                    {booking.status === "pending" && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApproveBooking(booking.id)}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectBooking(booking.id)}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Income Tab */}
        {activeTab === "income" && (
          <div className="mb-8">
            {income ? (
              <div>
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Income Summary</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Income</p>
                      <p className="text-2xl font-bold text-green-600">Rs. {income.total_income?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Payments</p>
                      <p className="text-2xl font-bold text-gray-900">{income.payment_count || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
                  {income.payments && income.payments.length > 0 ? (
                    income.payments.map((payment: any) => (
                      <div key={payment.id} className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-900">{payment.room_title}</h4>
                            <p className="text-sm text-gray-600">Tenant: {payment.tenant_name}</p>
                            <p className="text-sm text-gray-600">
                              Type: {payment.payment_type.replace("_", " ")}
                              {payment.payment_month && ` - ${payment.payment_month}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">Rs. {payment.amount.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(payment.completed_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                      <p className="text-gray-600">No payment history yet</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <p className="text-gray-600">Loading income data...</p>
              </div>
            )}
          </div>
        )}

        {/* Listings Tab */}
        {activeTab === "listings" && (
          <>
            {/* Listings Grid */}
            {listings.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No listings yet</h3>
            <p className="text-gray-600 mb-6">Start by listing your first property</p>
            <Link
              href="/landlord/list-property"
              className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              List Your First Property
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{listing.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      listing.status === "available" 
                        ? "bg-green-100 text-green-700" 
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {listing.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{listing.address}, {listing.city}</p>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">Rs. {listing.price_per_month.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">per month</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                      {listing.room_type}
                    </span>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <Link
                        href={`/landlord/edit-property/${listing.id}`}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium text-center"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleToggleStatus(listing.id, listing.status)}
                        className={`flex-1 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                          listing.status === "available"
                            ? "bg-yellow-600 text-white hover:bg-yellow-700"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      >
                        {listing.status === "available" ? "Make Unavailable" : "Make Available"}
                      </button>
                    </div>
                    <button
                      onClick={() => handleDelete(listing.id, listing.title)}
                      className="w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
            )}
            
            {/* Pagination */}
            {pagination.total_pages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-2">
            <button
              onClick={() => {
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
              }}
              disabled={!pagination.has_prev}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                let pageNum;
                if (pagination.total_pages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.total_pages - 2) {
                  pageNum = pagination.total_pages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => {
                      setPagination((prev) => ({ ...prev, page: pageNum }));
                    }}
                    className={`px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                      pagination.page === pageNum
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => {
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }));
              }}
              disabled={!pagination.has_next}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

