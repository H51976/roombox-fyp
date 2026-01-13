"use client";

import { useEffect, useRef, useState } from "react";

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLocation?: { lat: number; lng: number };
}

export default function MapPicker({ onLocationSelect, initialLocation }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const onLocationSelectRef = useRef(onLocationSelect);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Keep the callback ref updated
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

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

  useEffect(() => {
    if (!isLoaded || !mapRef.current || (window as any).L === undefined) return;

    const L = (window as any).L;

    // Default location: Kathmandu, Nepal
    const defaultLat = initialLocation?.lat || 27.7172;
    const defaultLng = initialLocation?.lng || 85.3240;
    const zoom = initialLocation ? 15 : 12;

    // Initialize map
    const mapInstance = L.map(mapRef.current).setView([defaultLat, defaultLng], zoom);

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapInstance);

    // Create marker
    const markerInstance = L.marker([defaultLat, defaultLng], {
      draggable: true,
    }).addTo(mapInstance);

    // Handle marker drag
    markerInstance.on("dragend", (e: any) => {
      const { lat, lng } = e.target.getLatLng();
      onLocationSelectRef.current(lat, lng);
    });

    // Handle map click
    mapInstance.on("click", (e: any) => {
      const { lat, lng } = e.latlng;
      markerInstance.setLatLng([lat, lng]);
      onLocationSelectRef.current(lat, lng);
    });

    setMap(mapInstance);
    setMarker(markerInstance);
    
    // Only trigger callback if initial location is provided and different from default
    if (initialLocation && (initialLocation.lat !== defaultLat || initialLocation.lng !== defaultLng)) {
      markerInstance.setLatLng([initialLocation.lat, initialLocation.lng]);
      mapInstance.setView([initialLocation.lat, initialLocation.lng], 15);
    }

    // Cleanup
    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [isLoaded, initialLocation]);

  return (
    <div className="w-full">
      <div
        ref={mapRef}
        className="w-full h-64 rounded-lg border border-gray-300"
        style={{ zIndex: 0 }}
      />
      <p className="mt-2 text-xs text-gray-500">
        Click on the map or drag the marker to select your property location
      </p>
    </div>
  );
}

