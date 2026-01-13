"use client";

import { useEffect, useRef, useState } from "react";

interface TenantSearchMapProps {
  userLocation: { lat: number; lng: number } | null;
  radiusKm: number;
  onLocationChange: (lat: number, lng: number) => void;
  onRadiusChange: (radius: number) => void;
  rooms?: Array<{
    id: number;
    title: string;
    latitude?: number;
    longitude?: number;
    price_per_month: number;
    distance_km?: number;
  }>;
}

export default function TenantSearchMap({
  userLocation,
  radiusKm,
  onLocationChange,
  onRadiusChange,
  rooms = [],
}: TenantSearchMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const onLocationChangeRef = useRef(onLocationChange);
  const onRadiusChangeRef = useRef(onRadiusChange);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [circle, setCircle] = useState<any>(null);
  const [roomMarkers, setRoomMarkers] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const isDraggingRef = useRef(false);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  // Keep callbacks updated
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
    onRadiusChangeRef.current = onRadiusChange;
  }, [onLocationChange, onRadiusChange]);

  useEffect(() => {
    // Load Leaflet CSS and JS dynamically
    const loadLeaflet = async () => {
      if (typeof window !== "undefined" && !(window as any).L) {
        // Load CSS
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
        link.crossOrigin = "";
        document.head.appendChild(link);

        // Load JS
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
        script.crossOrigin = "";
        script.onload = () => {
          setIsLoaded(true);
        };
        document.head.appendChild(script);
      } else {
        setIsLoaded(true);
      }
    };

    loadLeaflet();
  }, []);

  // Initialize map (only once)
  useEffect(() => {
    if (!isLoaded || !mapRef.current || (window as any).L === undefined || map) return;

    const L = (window as any).L;

    // Default location: Kathmandu, Nepal
    const defaultLat = userLocation?.lat || 27.7172;
    const defaultLng = userLocation?.lng || 85.3240;
    const zoom = userLocation ? 13 : 12;

    // Initialize map
    const mapInstance = L.map(mapRef.current).setView([defaultLat, defaultLng], zoom);

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapInstance);

    // Create user location marker (blue)
    const markerInstance = L.marker([defaultLat, defaultLng], {
      draggable: true,
      icon: L.divIcon({
        className: "custom-marker",
        html: `<div style="background-color: #2563eb; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      }),
    }).addTo(mapInstance);

    // Create radius circle
    const circleInstance = L.circle([defaultLat, defaultLng], {
      radius: radiusKm * 1000, // Convert km to meters
      color: "#2563eb",
      fillColor: "#3b82f6",
      fillOpacity: 0.2,
      weight: 2,
    }).addTo(mapInstance);

    // Handle marker drag start
    markerInstance.on("dragstart", () => {
      isDraggingRef.current = true;
    });

    // Handle marker drag
    markerInstance.on("dragend", (e: any) => {
      const { lat, lng } = e.target.getLatLng();
      circleInstance.setLatLng([lat, lng]);
      lastLocationRef.current = { lat, lng };
      isDraggingRef.current = false;
      onLocationChangeRef.current(lat, lng);
    });

    // Handle map click
    mapInstance.on("click", (e: any) => {
      const { lat, lng } = e.latlng;
      markerInstance.setLatLng([lat, lng]);
      circleInstance.setLatLng([lat, lng]);
      lastLocationRef.current = { lat, lng };
      onLocationChangeRef.current(lat, lng);
    });

    setMap(mapInstance);
    setMarker(markerInstance);
    setCircle(circleInstance);
    lastLocationRef.current = { lat: defaultLat, lng: defaultLng };

    // Cleanup
    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [isLoaded, radiusKm]);

  // Update circle radius when radiusKm changes
  useEffect(() => {
    if (circle && radiusKm) {
      circle.setRadius(radiusKm * 1000); // Convert km to meters
    }
  }, [circle, radiusKm]);

  // Update marker and circle position when userLocation changes (only if not from drag)
  useEffect(() => {
    if (!marker || !circle || !userLocation || isDraggingRef.current) return;
    
    // Check if location actually changed to avoid unnecessary updates
    if (lastLocationRef.current && 
        Math.abs(lastLocationRef.current.lat - userLocation.lat) < 0.0001 &&
        Math.abs(lastLocationRef.current.lng - userLocation.lng) < 0.0001) {
      return;
    }

    try {
      marker.setLatLng([userLocation.lat, userLocation.lng]);
      circle.setLatLng([userLocation.lat, userLocation.lng]);
      if (map && map.setView) {
        map.setView([userLocation.lat, userLocation.lng], 13);
      }
      lastLocationRef.current = { lat: userLocation.lat, lng: userLocation.lng };
    } catch (error) {
      console.error("Error updating map location:", error);
    }
  }, [marker, circle, userLocation, map]);

  // Add room markers
  useEffect(() => {
    if (!map || !isLoaded || (window as any).L === undefined) return;

    const L = (window as any).L;

    // Remove existing room markers
    roomMarkers.forEach((m) => {
      map.removeLayer(m);
    });

    // Create new room markers
    const newMarkers = rooms
      .filter((room) => room.latitude && room.longitude)
      .map((room) => {
        const roomMarker = L.marker([room.latitude!, room.longitude!], {
          icon: L.divIcon({
            className: "room-marker",
            html: `
              <div style="
                background-color: #10b981;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                cursor: pointer;
              "></div>
            `,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        }).addTo(map);

        // Add popup with room info
        const popupContent = `
          <div style="min-width: 150px;">
            <strong>${room.title}</strong><br/>
            <span style="color: #059669; font-weight: 600;">Rs. ${room.price_per_month.toLocaleString()}/mo</span>
            ${room.distance_km !== null && room.distance_km !== undefined ? `<br/><span style="font-size: 0.85em; color: #6b7280;">${room.distance_km.toFixed(2)} km away</span>` : ""}
          </div>
        `;
        roomMarker.bindPopup(popupContent);

        return roomMarker;
      });

    setRoomMarkers(newMarkers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, rooms, isLoaded]);

  return (
    <div className="w-full">
      <div
        ref={mapRef}
        className="w-full h-96 rounded-lg border border-gray-300"
        style={{ zIndex: 0 }}
      />
      <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-sm"></div>
            <span>Your Location</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
            <span>Available Rooms</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span>Radius:</span>
          <span className="font-semibold text-blue-600">{radiusKm} km</span>
        </div>
      </div>
    </div>
  );
}

