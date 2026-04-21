"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const TenantSearchMap = dynamic(() => import("@/components/TenantSearchMap"), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />,
});

const API = "http://localhost:8000/api/v1";

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

const DEFAULT_FILTERS = {
  search: "",
  city: "",
  room_type: "",
  min_price: "",
  max_price: "",
  radius: "10",
  furnishing_status: "",
  has_kitchen: false,
  has_parking: false,
  has_wifi: false,
  has_water_supply: false,
  has_electricity: false,
  has_security: false,
  has_elevator: false,
  has_balcony: false,
};

type Filters = typeof DEFAULT_FILTERS;

// Active filter count (excludes search text and radius)
function countActiveFilters(f: Filters) {
  let n = 0;
  if (f.city) n++;
  if (f.room_type) n++;
  if (f.min_price) n++;
  if (f.max_price) n++;
  if (f.furnishing_status) n++;
  if (f.has_kitchen) n++;
  if (f.has_parking) n++;
  if (f.has_wifi) n++;
  if (f.has_water_supply) n++;
  if (f.has_electricity) n++;
  if (f.has_security) n++;
  if (f.has_elevator) n++;
  if (f.has_balcony) n++;
  return n;
}

function AmenityChip({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all select-none ${
        checked
          ? "bg-blue-600 border-blue-600 text-white"
          : "bg-white border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600"
      }`}
    >
      {checked && (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {label}
    </button>
  );
}

export default function TenantSearchPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Draft filters — what's in the form
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  // Applied filters + page — these drive the actual search
  const [applied, setApplied] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 12, total: 0, total_pages: 1, has_next: false, has_prev: false,
  });

  // Use refs so the search function always has the latest values without stale closures
  const locationRef = useRef(userLocation);
  useEffect(() => { locationRef.current = userLocation; }, [userLocation]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const userStr = localStorage.getItem("user");
    if (token && userStr) {
      try { setUser(JSON.parse(userStr)); } catch {}
    }
    requestLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Geolocation ──────────────────────────────────────────────────────────
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported.");
      setUserLocation({ lat: 27.7172, lng: 85.324 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError("");
      },
      () => {
        setLocationError("Location access denied. Showing all rooms.");
        setUserLocation({ lat: 27.7172, lng: 85.324 });
      }
    );
  };

  // ── Core search — reads applied + page directly (no stale closure risk) ──
  const doSearch = useCallback(async (f: Filters, pg: number, loc: { lat: number; lng: number } | null) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.search) params.set("search_query", f.search);
      if (f.city) params.set("city", f.city);
      if (f.room_type) params.set("room_type", f.room_type);
      if (f.min_price) params.set("min_price", f.min_price);
      if (f.max_price) params.set("max_price", f.max_price);
      if (f.furnishing_status) params.set("furnishing_status", f.furnishing_status);
      if (f.has_kitchen) params.set("has_kitchen", "true");
      if (f.has_parking) params.set("has_parking", "true");
      if (f.has_wifi) params.set("has_wifi", "true");
      if (f.has_water_supply) params.set("has_water_supply", "true");
      if (f.has_electricity) params.set("has_electricity", "true");
      if (f.has_security) params.set("has_security", "true");
      if (f.has_elevator) params.set("has_elevator", "true");
      if (f.has_balcony) params.set("has_balcony", "true");
      if (loc) {
        params.set("latitude", loc.lat.toString());
        params.set("longitude", loc.lng.toString());
        params.set("radius_km", f.radius || "10");
      }
      params.set("page", pg.toString());
      params.set("limit", "12");

      const res = await fetch(`${API}/rooms/search?${params}`);
      const data = await res.json();

      if (res.ok && data.success) {
        const rooms = data.data?.rooms ?? data.data ?? [];
        setRooms(rooms);
        if (data.data?.pagination) setPagination(data.data.pagination);
        if (rooms.length === 0) toast.info("No rooms found", { description: "Try broadening your filters." });
      } else {
        toast.error(data.message || "Search failed");
      }
    } catch {
      toast.error("Connection error — is the backend running?");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Trigger search whenever applied filters or page changes ───────────────
  useEffect(() => {
    doSearch(applied, page, locationRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied, page]);

  // Also re-search when location becomes available for the first time
  const locationInitialized = useRef(false);
  useEffect(() => {
    if (userLocation && !locationInitialized.current) {
      locationInitialized.current = true;
      doSearch(applied, page, userLocation);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleFilterChange = (name: keyof Filters, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setPage(1);
    setApplied({ ...filters });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setApplied({ ...filters });
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
    setApplied(DEFAULT_FILTERS);
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    setUser(null);
    toast.success("Logged out");
    router.push("/");
  };

  const handleLocationChange = (lat: number, lng: number) => {
    const loc = { lat, lng };
    setUserLocation(loc);
    locationRef.current = loc;
    setPage(1);
    doSearch(applied, 1, loc);
  };

  const handleRadiusChange = (radius: number) => {
    const newFilters = { ...filters, radius: radius.toString() };
    const newApplied = { ...applied, radius: radius.toString() };
    setFilters(newFilters);
    setApplied(newApplied);
    setPage(1);
  };

  const goToPage = (pg: number) => {
    setPage(pg);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeCount = countActiveFilters(applied);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3.5 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">RoomBox</span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            {user ? (
              <>
                {[
                  { href: "/tenant/bookings", label: "Bookings" },
                  { href: "/tenant/tracking", label: "Tracking" },
                  { href: "/tenant/messages", label: "Messages" },
                ].map((l) => (
                  <Link key={l.href} href={l.href}
                    className="hidden sm:block px-3 py-1.5 text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors rounded-lg hover:bg-gray-100">
                    {l.label}
                  </Link>
                ))}
                <span className="hidden md:block text-sm text-gray-700 font-medium px-2">
                  {user.full_name || user.email}
                </span>
                <button onClick={handleLogout}
                  className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-3 py-1.5 text-gray-700 hover:text-gray-900 font-medium text-sm">Login</Link>
                <Link href="/register" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Search + Filters Bar ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-[61px] z-40 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          {/* Search row */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, location, or description…"
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button type="submit" disabled={isLoading}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 whitespace-nowrap">
              {isLoading ? "…" : "Search"}
            </button>
            <button type="button" onClick={() => setShowFilters(!showFilters)}
              className={`relative px-4 py-2.5 border rounded-lg transition-colors text-sm font-medium flex items-center gap-2 ${showFilters ? "bg-blue-50 border-blue-500 text-blue-600" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="hidden sm:inline">Filters</span>
              {activeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {activeCount}
                </span>
              )}
            </button>
          </form>

          {/* Active filter chips */}
          {activeCount > 0 && !showFilters && (
            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-gray-400">Active:</span>
              {applied.city && <FilterChip label={`City: ${applied.city}`} onRemove={() => { setFilters((f) => ({ ...f, city: "" })); setApplied((a) => ({ ...a, city: "" })); setPage(1); }} />}
              {applied.room_type && <FilterChip label={`Type: ${applied.room_type}`} onRemove={() => { setFilters((f) => ({ ...f, room_type: "" })); setApplied((a) => ({ ...a, room_type: "" })); setPage(1); }} />}
              {applied.min_price && <FilterChip label={`Min: Rs.${applied.min_price}`} onRemove={() => { setFilters((f) => ({ ...f, min_price: "" })); setApplied((a) => ({ ...a, min_price: "" })); setPage(1); }} />}
              {applied.max_price && <FilterChip label={`Max: Rs.${applied.max_price}`} onRemove={() => { setFilters((f) => ({ ...f, max_price: "" })); setApplied((a) => ({ ...a, max_price: "" })); setPage(1); }} />}
              {applied.furnishing_status && <FilterChip label={applied.furnishing_status.replace("_", " ")} onRemove={() => { setFilters((f) => ({ ...f, furnishing_status: "" })); setApplied((a) => ({ ...a, furnishing_status: "" })); setPage(1); }} />}
              {applied.has_kitchen && <FilterChip label="Kitchen" onRemove={() => { setFilters((f) => ({ ...f, has_kitchen: false })); setApplied((a) => ({ ...a, has_kitchen: false })); setPage(1); }} />}
              {applied.has_parking && <FilterChip label="Parking" onRemove={() => { setFilters((f) => ({ ...f, has_parking: false })); setApplied((a) => ({ ...a, has_parking: false })); setPage(1); }} />}
              {applied.has_wifi && <FilterChip label="WiFi" onRemove={() => { setFilters((f) => ({ ...f, has_wifi: false })); setApplied((a) => ({ ...a, has_wifi: false })); setPage(1); }} />}
              {applied.has_water_supply && <FilterChip label="Water" onRemove={() => { setFilters((f) => ({ ...f, has_water_supply: false })); setApplied((a) => ({ ...a, has_water_supply: false })); setPage(1); }} />}
              {applied.has_electricity && <FilterChip label="Electricity" onRemove={() => { setFilters((f) => ({ ...f, has_electricity: false })); setApplied((a) => ({ ...a, has_electricity: false })); setPage(1); }} />}
              {applied.has_security && <FilterChip label="Security" onRemove={() => { setFilters((f) => ({ ...f, has_security: false })); setApplied((a) => ({ ...a, has_security: false })); setPage(1); }} />}
              {applied.has_elevator && <FilterChip label="Elevator" onRemove={() => { setFilters((f) => ({ ...f, has_elevator: false })); setApplied((a) => ({ ...a, has_elevator: false })); setPage(1); }} />}
              {applied.has_balcony && <FilterChip label="Balcony" onRemove={() => { setFilters((f) => ({ ...f, has_balcony: false })); setApplied((a) => ({ ...a, has_balcony: false })); setPage(1); }} />}
              <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-medium ml-1">Clear all</button>
            </div>
          )}

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
              {/* Row 1: City / Type / Price / Furnishing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">City</label>
                  <select value={filters.city} onChange={(e) => handleFilterChange("city", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">All Cities</option>
                    <option value="Kathmandu">Kathmandu</option>
                    <option value="Lalitpur">Lalitpur</option>
                    <option value="Bhaktapur">Bhaktapur</option>
                    <option value="Pokhara">Pokhara</option>
                    <option value="Biratnagar">Biratnagar</option>
                    <option value="Butwal">Butwal</option>
                    <option value="Dharan">Dharan</option>
                    <option value="Birgunj">Birgunj</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Room Type</label>
                  <select value={filters.room_type} onChange={(e) => handleFilterChange("room_type", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
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
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Furnishing</label>
                  <select value={filters.furnishing_status} onChange={(e) => handleFilterChange("furnishing_status", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">Any</option>
                    <option value="furnished">Furnished</option>
                    <option value="semi_furnished">Semi-Furnished</option>
                    <option value="unfurnished">Unfurnished</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Search Radius</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="1" max="50" step="1" value={filters.radius}
                      onChange={(e) => handleFilterChange("radius", e.target.value)}
                      className="flex-1 accent-blue-600" />
                    <span className="text-sm font-semibold text-blue-600 w-12 text-right">{filters.radius} km</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Price range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Min Price (Rs.)</label>
                  <input type="number" min="0" value={filters.min_price} placeholder="0"
                    onChange={(e) => handleFilterChange("min_price", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Max Price (Rs.)</label>
                  <input type="number" min="0" value={filters.max_price} placeholder="No limit"
                    onChange={(e) => handleFilterChange("max_price", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>

              {/* Row 3: Amenity toggles */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    ["has_kitchen", "Kitchen"],
                    ["has_parking", "Parking"],
                    ["has_wifi", "WiFi"],
                    ["has_water_supply", "Water Supply"],
                    ["has_electricity", "Electricity"],
                    ["has_security", "Security"],
                    ["has_elevator", "Elevator"],
                    ["has_balcony", "Balcony"],
                  ] as [keyof Filters, string][]).map(([key, label]) => (
                    <AmenityChip
                      key={key}
                      label={label}
                      checked={filters[key] as boolean}
                      onChange={(v) => handleFilterChange(key, v)}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <button type="button" onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-red-600 font-medium transition-colors">
                  Clear all filters
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowFilters(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button type="button" onClick={() => { applyFilters(); setShowFilters(false); }}
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Location status */}
          <div className="mt-2 text-xs text-gray-500">
            {locationError ? (
              <span className="text-amber-600">{locationError}</span>
            ) : userLocation ? (
              <span>📍 Showing rooms within <strong>{applied.radius} km</strong> of your location</span>
            ) : (
              <span className="text-gray-400">Getting your location…</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Map ─────────────────────────────────────────────────────────── */}
      {userLocation && (
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-5">
            <TenantSearchMap
              userLocation={userLocation}
              radiusKm={parseFloat(applied.radius) || 10}
              onLocationChange={handleLocationChange}
              onRadiusChange={handleRadiusChange}
              rooms={rooms}
            />
          </div>
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                <div className="h-44 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-6 bg-gray-200 rounded w-1/3 mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-14 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No rooms found</h3>
            <p className="text-gray-500 text-sm mb-5">Try clearing some filters or expanding the search radius</p>
            <button onClick={clearFilters}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors">
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            {/* Result header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{pagination.total}</span> room{pagination.total !== 1 ? "s" : ""} found
                {pagination.total > 12 && (
                  <span className="text-gray-400 ml-1.5">
                    · page {pagination.page} of {pagination.total_pages}
                  </span>
                )}
              </p>
              {activeCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-medium">
                  Clear {activeCount} filter{activeCount !== 1 ? "s" : ""}
                </button>
              )}
            </div>

            {/* Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-1.5">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={!pagination.has_prev}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(7, pagination.total_pages) }, (_, i) => {
                  let pg: number;
                  const tp = pagination.total_pages;
                  if (tp <= 7) pg = i + 1;
                  else if (page <= 4) pg = i + 1;
                  else if (page >= tp - 3) pg = tp - 6 + i;
                  else pg = page - 3 + i;
                  return (
                    <button key={pg} onClick={() => goToPage(pg)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${page === pg ? "bg-blue-600 text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
                      {pg}
                    </button>
                  );
                })}
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={!pagination.has_next}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
      {label}
      <button onClick={onRemove} className="hover:text-blue-900 transition-colors ml-0.5">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

function RoomCard({ room }: { room: Room }) {
  const amenities = [
    room.has_kitchen && "Kitchen",
    room.has_parking && "Parking",
    room.has_wifi && "WiFi",
    room.has_water_supply && "Water",
    room.has_electricity && "Electricity",
    room.has_security && "Security",
    room.has_elevator && "Elevator",
    room.has_balcony && "Balcony",
  ].filter(Boolean) as string[];

  const typeLabel: Record<string, string> = {
    single: "Single", double: "Double", shared: "Shared",
    apartment: "Apartment", flat: "Flat", house: "House",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
      {/* Image */}
      <div className="relative h-44 bg-gradient-to-br from-blue-100 to-blue-50 overflow-hidden">
        {room.primary_image ? (
          <img src={room.primary_image} alt={room.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
        )}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-semibold rounded-full">
            {typeLabel[room.room_type] || room.room_type}
          </span>
          {room.furnishing_status && (
            <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-semibold rounded-full capitalize">
              {room.furnishing_status.replace("_", " ")}
            </span>
          )}
        </div>
        {room.distance_km !== undefined && room.distance_km !== null && (
          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
            {Number(room.distance_km).toFixed(1)} km
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Title + Location */}
        <h3 className="font-semibold text-gray-900 line-clamp-1 mb-0.5">{room.title}</h3>
        <p className="text-xs text-gray-500 mb-3 line-clamp-1">
          <svg className="inline w-3 h-3 mr-0.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          {room.address}, {room.city}
        </p>

        {/* Price */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xl font-bold text-blue-600">Rs. {room.price_per_month.toLocaleString()}</p>
            <p className="text-xs text-gray-400">/ month</p>
          </div>
          {(room.area_sqft || room.bathrooms) && (
            <div className="text-right text-xs text-gray-500">
              {room.bathrooms > 0 && <p>{room.bathrooms} bath{room.bathrooms !== 1 ? "s" : ""}</p>}
              {room.area_sqft && <p>{room.area_sqft.toLocaleString()} sqft</p>}
            </div>
          )}
        </div>

        {/* Amenity chips */}
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {amenities.slice(0, 4).map((a) => (
              <span key={a} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded font-medium">{a}</span>
            ))}
            {amenities.length > 4 && (
              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded font-medium">+{amenities.length - 4}</span>
            )}
          </div>
        )}

        {/* Security deposit hint */}
        {room.security_deposit && (
          <p className="text-xs text-gray-400 mb-3">Security deposit: Rs. {room.security_deposit.toLocaleString()}</p>
        )}

        <Link href={`/tenant/room/${room.id}`}
          className="block w-full py-2 bg-blue-600 text-white text-sm font-medium text-center rounded-lg hover:bg-blue-700 transition-colors">
          View Details
        </Link>
      </div>
    </div>
  );
}
