"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const TenantSearchMap = dynamic(() => import("@/components/TenantSearchMap"), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
});

interface Room {
  id: number;
  title: string;
  description?: string;
  room_type: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  price_per_month: number;
  security_deposit?: number;
  total_rooms: number;
  available_rooms: number;
  bathrooms: number;
  area_sqft?: number;
  has_kitchen: boolean;
  has_parking: boolean;
  has_wifi: boolean;
  has_water_supply: boolean;
  has_electricity: boolean;
  has_security: boolean;
  has_elevator: boolean;
  has_balcony: boolean;
  furnishing_status?: string;
  distance_km?: number;
  primary_image?: string;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
  user_type?: string;
}

export default function TenantSearchPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string>("");
  const [filters, setFilters] = useState({
    search: "",
    city: "",
    room_type: "",
    min_price: "",
    max_price: "",
    radius: "10",
    has_kitchen: false,
    has_parking: false,
    has_wifi: false,
    furnishing_status: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false,
  });

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("auth_token");
    const userStr = localStorage.getItem("user");
    
    if (token && userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
    
    // Request location access
    requestLocation();
    
    // Load initial rooms
    searchRooms();
  }, []);

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError("");
        },
        (error) => {
          console.error("Location error:", error);
          setLocationError("Location access denied. Showing all rooms.");
          // Default to Kathmandu if location denied
          setUserLocation({ lat: 27.7172, lng: 85.3240 });
        }
      );
    } else {
      setLocationError("Geolocation not supported by your browser.");
      setUserLocation({ lat: 27.7172, lng: 85.3240 });
    }
  };

  const searchRooms = async () => {
    setIsLoading(true);
    
    try {
      const params = new URLSearchParams();
      
      if (filters.search) params.append("search_query", filters.search);
      if (filters.city) params.append("city", filters.city);
      if (filters.room_type) params.append("room_type", filters.room_type);
      if (filters.min_price) params.append("min_price", filters.min_price);
      if (filters.max_price) params.append("max_price", filters.max_price);
      if (filters.has_kitchen) params.append("has_kitchen", "true");
      if (filters.has_parking) params.append("has_parking", "true");
      if (filters.has_wifi) params.append("has_wifi", "true");
      if (filters.furnishing_status) params.append("furnishing_status", filters.furnishing_status);
      
      // Only add location filters if user location is available
      // If no location, show all latest rooms
      if (userLocation) {
        params.append("latitude", userLocation.lat.toString());
        params.append("longitude", userLocation.lng.toString());
        params.append("radius_km", filters.radius || "10");
      }
      // If no location, don't add location params - backend will return all rooms
      
      // Add pagination params
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());
      
      const url = `http://localhost:8000/api/v1/rooms/search?${params.toString()}`;
      console.log("Search URL:", url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok && data.success) {
        if (data.data?.rooms) {
          // New paginated response
          setRooms(data.data.rooms || []);
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
          setRooms(data.data || []);
        }
        if ((data.data?.rooms || data.data || []).length === 0) {
          toast.info("No rooms found", {
            description: "Try adjusting your search criteria or filters.",
          });
        }
      } else {
        console.error("Search error:", data);
        toast.error("Failed to search rooms", {
          description: data.message || data.detail || "Please try again.",
        });
      }
    } catch (error: any) {
      console.error("Error searching rooms:", error);
      toast.error("Connection error", {
        description: error.message || "Cannot connect to server. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (name: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setUserLocation({ lat, lng });
    setPagination((prev) => ({ ...prev, page: 1 }));
    // Auto-search when location changes
    setTimeout(() => searchRooms(), 500);
  };

  const handleRadiusChange = (radius: number) => {
    setFilters((prev) => ({
      ...prev,
      radius: radius.toString(),
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
    // Auto-search when radius changes
    setTimeout(() => searchRooms(), 300);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    setTimeout(() => searchRooms(), 100);
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      city: "",
      room_type: "",
      min_price: "",
      max_price: "",
      radius: "10",
      has_kitchen: false,
      has_parking: false,
      has_wifi: false,
      furnishing_status: "",
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
    setTimeout(() => searchRooms(), 100);
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    setUser(null);
    toast.success("Logged out successfully");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">RoomBox</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  href="/tenant/bookings"
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>My Bookings</span>
                </Link>
                <div className="text-right hidden sm:block">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{user.full_name || user.email}</span>
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                      Tenant
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-[73px] z-40">
        <div className="container mx-auto px-4 py-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by location, property name, or description..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
              />
              <svg
                className="absolute left-3 top-3.5 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Searching..." : "Search"}
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          </form>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                  <select
                    value={filters.city}
                    onChange={(e) => handleFilterChange("city", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  >
                    <option value="">All Cities</option>
                    <option value="Kathmandu">Kathmandu</option>
                    <option value="Pokhara">Pokhara</option>
                    <option value="Lalitpur">Lalitpur</option>
                    <option value="Bhaktapur">Bhaktapur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Room Type</label>
                  <select
                    value={filters.room_type}
                    onChange={(e) => handleFilterChange("room_type", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  >
                    <option value="">All Types</option>
                    <option value="single">Single Room</option>
                    <option value="double">Double Room</option>
                    <option value="shared">Shared Room</option>
                    <option value="apartment">Apartment</option>
                    <option value="flat">Flat</option>
                    <option value="house">House</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Min Price (Rs.)</label>
                  <input
                    type="number"
                    value={filters.min_price}
                    onChange={(e) => handleFilterChange("min_price", e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Price (Rs.)</label>
                  <input
                    type="number"
                    value={filters.max_price}
                    onChange={(e) => handleFilterChange("max_price", e.target.value)}
                    placeholder="100000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Search Radius (km)</label>
                  <input
                    type="number"
                    value={filters.radius}
                    onChange={(e) => handleFilterChange("radius", e.target.value)}
                    min="1"
                    max="50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Furnishing</label>
                  <select
                    value={filters.furnishing_status}
                    onChange={(e) => handleFilterChange("furnishing_status", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  >
                    <option value="">Any</option>
                    <option value="furnished">Furnished</option>
                    <option value="semi_furnished">Semi-Furnished</option>
                    <option value="unfurnished">Unfurnished</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.has_kitchen}
                      onChange={(e) => handleFilterChange("has_kitchen", e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Kitchen</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.has_parking}
                      onChange={(e) => handleFilterChange("has_parking", e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Parking</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.has_wifi}
                      onChange={(e) => handleFilterChange("has_wifi", e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">WiFi</span>
                  </label>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Clear Filters
                </button>
                <button
                  type="button"
                  onClick={searchRooms}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}

          {/* Location Status */}
          {userLocation && (
            <div className="mt-3 text-sm text-gray-600">
              {locationError ? (
                <span className="text-yellow-600">{locationError}</span>
              ) : (
                <span>📍 Showing rooms within {filters.radius}km of your location</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map Section */}
      {userLocation && (
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Area</h2>
            <TenantSearchMap
              userLocation={userLocation}
              radiusKm={parseFloat(filters.radius) || 10}
              onLocationChange={handleLocationChange}
              onRadiusChange={(radius) => handleRadiusChange(radius)}
              rooms={rooms}
            />
            <div className="mt-4 flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 w-full">
                <span className="whitespace-nowrap">Search Radius:</span>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={filters.radius}
                  onChange={(e) => {
                    handleFilterChange("radius", e.target.value);
                    handleRadiusChange(parseFloat(e.target.value));
                  }}
                  className="flex-1"
                />
                <span className="w-12 text-right font-medium text-blue-600">{filters.radius} km</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Searching for rooms...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No rooms found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search criteria or filters</p>
            <button
              onClick={clearFilters}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Found {pagination.total} {pagination.total === 1 ? "room" : "rooms"}
                {pagination.total > pagination.limit && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)})
                  </span>
                )}
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <div key={room.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                  {room.primary_image && (
                    <div className="h-48 bg-gray-200 relative">
                      <img
                        src={room.primary_image}
                        alt={room.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{room.title}</h3>
                      {room.distance_km !== null && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded whitespace-nowrap ml-2">
                          {room.distance_km}km away
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{room.address}, {room.city}</p>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">Rs. {room.price_per_month.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">per month</p>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                        {room.room_type}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {room.has_kitchen && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Kitchen</span>
                      )}
                      {room.has_parking && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Parking</span>
                      )}
                      {room.has_wifi && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">WiFi</span>
                      )}
                      {room.available_rooms > 0 && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                          {room.available_rooms} {room.available_rooms === 1 ? "room" : "rooms"} available
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/tenant/room/${room.id}`}
                      className="block w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm text-center"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-2">
                <button
                  onClick={() => {
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
                    setTimeout(() => searchRooms(), 100);
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
                          setTimeout(() => searchRooms(), 100);
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
                    setTimeout(() => searchRooms(), 100);
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

