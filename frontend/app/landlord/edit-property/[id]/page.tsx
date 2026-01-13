"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import dynamic from "next/dynamic";

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(() => import("@/components/MapPicker"), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
});

interface User {
  id: string;
  email: string;
  full_name?: string;
  user_type?: string;
}

interface Listing {
  id: number;
  title: string;
  description?: string;
  room_type: string;
  address: string;
  city: string;
  ward_number?: string;
  latitude?: number;
  longitude?: number;
  price_per_month: number;
  security_deposit?: number;
  advance_payment?: number;
  total_rooms: number;
  available_rooms: number;
  bathrooms: number;
  floor_number?: number;
  total_floors?: number;
  area_sqft?: number;
  furnishing_status?: string;
  has_kitchen: boolean;
  has_parking: boolean;
  has_wifi: boolean;
  has_water_supply: boolean;
  has_electricity: boolean;
  has_security: boolean;
  has_elevator: boolean;
  has_balcony: boolean;
  images?: string[];
}

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    room_type: "single",
    address: "",
    city: "Kathmandu",
    ward_number: "",
    price_per_month: "",
    security_deposit: "",
    advance_payment: "",
    total_rooms: "1",
    available_rooms: "1",
    bathrooms: "1",
    floor_number: "",
    total_floors: "",
    area_sqft: "",
    furnishing_status: "",
    has_kitchen: false,
    has_parking: false,
    has_wifi: false,
    has_water_supply: true,
    has_electricity: true,
    has_security: false,
    has_elevator: false,
    has_balcony: false,
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
      
      // Fetch listing data
      fetchListingData();
    } catch (error) {
      console.error("Error parsing user data:", error);
      router.push("/login");
    }
  }, [router, listingId]);

  const fetchListingData = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      
      // Try to fetch directly from the detail endpoint first
      const detailResponse = await fetch(`http://localhost:8000/api/v1/rooms/${listingId}`, {
        headers: token ? {
          "Authorization": `Bearer ${token}`,
        } : {},
      });
      const detailData = await detailResponse.json();
      
      if (detailResponse.ok && detailData.success) {
        populateForm(detailData.data);
        setIsLoadingData(false);
        return;
      }
      
      // Fallback: fetch from my-listings if detail endpoint fails
      const response = await fetch("http://localhost:8000/api/v1/rooms/my-listings", {
        headers: token ? {
          "Authorization": `Bearer ${token}`,
        } : {},
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        const listings = Array.isArray(data.data?.listings) 
          ? data.data.listings 
          : Array.isArray(data.data) 
          ? data.data 
          : [];
        
        const listing = listings.find((l: any) => l.id === parseInt(listingId));
        if (listing) {
          populateFormFromBasic(listing);
        } else {
          toast.error("Listing not found");
          router.push("/landlord/dashboard");
        }
      } else {
        toast.error("Failed to load listing data", {
          description: detailData.message || data.message || "Please try again.",
        });
        router.push("/landlord/dashboard");
      }
    } catch (error) {
      console.error("Error fetching listing:", error);
      toast.error("Failed to load listing data", {
        description: "Network error. Please check your connection and try again.",
      });
      router.push("/landlord/dashboard");
    } finally {
      setIsLoadingData(false);
    }
  };

  const populateFormFromBasic = (listing: any) => {
    setFormData({
      title: listing.title || "",
      description: "",
      room_type: listing.room_type || "single",
      address: listing.address || "",
      city: listing.city || "Kathmandu",
      ward_number: "",
      price_per_month: listing.price_per_month?.toString() || "",
      security_deposit: "",
      advance_payment: "",
      total_rooms: "1",
      available_rooms: "1",
      bathrooms: "1",
      floor_number: "",
      total_floors: "",
      area_sqft: "",
      furnishing_status: "",
      has_kitchen: false,
      has_parking: false,
      has_wifi: false,
      has_water_supply: true,
      has_electricity: true,
      has_security: false,
      has_elevator: false,
      has_balcony: false,
    });
    
    if (listing.latitude && listing.longitude) {
      setLocation({ lat: listing.latitude, lng: listing.longitude });
    }
  };

  const populateForm = (listing: Listing) => {
    setFormData({
      title: listing.title || "",
      description: listing.description || "",
      room_type: listing.room_type || "single",
      address: listing.address || "",
      city: listing.city || "Kathmandu",
      ward_number: listing.ward_number || "",
      price_per_month: listing.price_per_month?.toString() || "",
      security_deposit: listing.security_deposit?.toString() || "",
      advance_payment: listing.advance_payment?.toString() || "",
      total_rooms: listing.total_rooms?.toString() || "1",
      available_rooms: listing.available_rooms?.toString() || "1",
      bathrooms: listing.bathrooms?.toString() || "1",
      floor_number: listing.floor_number?.toString() || "",
      total_floors: listing.total_floors?.toString() || "",
      area_sqft: listing.area_sqft?.toString() || "",
      furnishing_status: listing.furnishing_status || "",
      has_kitchen: listing.has_kitchen || false,
      has_parking: listing.has_parking || false,
      has_wifi: listing.has_wifi || false,
      has_water_supply: listing.has_water_supply ?? true,
      has_electricity: listing.has_electricity ?? true,
      has_security: listing.has_security || false,
      has_elevator: listing.has_elevator || false,
      has_balcony: listing.has_balcony || false,
    });
    
    if (listing.latitude && listing.longitude) {
      setLocation({ lat: listing.latitude, lng: listing.longitude });
    }
    
    if (listing.images && listing.images.length > 0) {
      setExistingImages(listing.images);
      setImagePreviews(listing.images);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setLocation((prev) => {
      if (prev && prev.lat === lat && prev.lng === lng) {
        return prev;
      }
      return { lat, lng };
    });
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (imagePreviews.length + files.length > 10) {
      toast.error("Maximum 10 images allowed");
      return;
    }

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is 5MB`);
        return false;
      }
      return true;
    });

    setImages((prev) => [...prev, ...validFiles]);

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    // Check if it's an existing image or a new one
    if (index < existingImages.length) {
      setExistingImages((prev) => prev.filter((_, i) => i !== index));
    } else {
      const newIndex = index - existingImages.length;
      setImages((prev) => prev.filter((_, i) => i !== newIndex));
    }
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!location) {
      toast.error("Please select a location on the map");
      return;
    }

    setIsLoading(true);

    try {
      // Convert new images to base64
      const imageDataPromises = images.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      const newImageData = await Promise.all(imageDataPromises);
      // Combine existing images (that weren't removed) with new ones
      const allImages = [...existingImages, ...newImageData];

      const response = await fetch(`http://localhost:8000/api/v1/rooms/${listingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          latitude: location.lat,
          longitude: location.lng,
          price_per_month: parseFloat(formData.price_per_month),
          security_deposit: formData.security_deposit ? parseFloat(formData.security_deposit) : null,
          advance_payment: formData.advance_payment ? parseFloat(formData.advance_payment) : null,
          total_rooms: parseInt(formData.total_rooms),
          available_rooms: parseInt(formData.available_rooms),
          bathrooms: parseInt(formData.bathrooms),
          floor_number: formData.floor_number ? parseInt(formData.floor_number) : null,
          total_floors: formData.total_floors ? parseInt(formData.total_floors) : null,
          area_sqft: formData.area_sqft ? parseFloat(formData.area_sqft) : null,
          furnishing_status: formData.furnishing_status || null,
          images: allImages.length > 0 ? allImages : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Property updated successfully!", {
          description: "Your property listing has been updated.",
        });
        router.push("/landlord/dashboard");
      } else {
        toast.error("Failed to update property", {
          description: data.message || "Please try again.",
        });
      }
    } catch (error: any) {
      console.error("Error updating property:", error);
      toast.error("Connection error", {
        description: "Cannot connect to server. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading listing data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Link href="/landlord/dashboard" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">RoomBox</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/landlord/dashboard"
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit Property</h1>
          <p className="text-gray-600 mt-1">Update your property listing information</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Property Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                  placeholder="e.g., Cozy 2BHK Apartment in Thamel"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                  placeholder="Describe your property..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="room_type" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Property Type *
                  </label>
                  <select
                    id="room_type"
                    name="room_type"
                    required
                    value={formData.room_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  >
                    <option value="single">Single Room</option>
                    <option value="double">Double Room</option>
                    <option value="shared">Shared Room</option>
                    <option value="apartment">Apartment</option>
                    <option value="flat">Flat</option>
                    <option value="house">House</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1.5">
                    City *
                  </label>
                  <select
                    id="city"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  >
                    <option value="Kathmandu">Kathmandu</option>
                    <option value="Pokhara">Pokhara</option>
                    <option value="Lalitpur">Lalitpur</option>
                    <option value="Bhaktapur">Bhaktapur</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Location *</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Address *
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                  placeholder="Street address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Select Location on Map *
                </label>
                <MapComponent
                  onLocationSelect={handleLocationSelect}
                  initialLocation={location ? { lat: location.lat, lng: location.lng } : undefined}
                />
                {location && (
                  <p className="mt-2 text-sm text-gray-600">
                    Location selected: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="ward_number" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Ward Number
                </label>
                <input
                  type="text"
                  id="ward_number"
                  name="ward_number"
                  value={formData.ward_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                  placeholder="e.g., Ward 5"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="price_per_month" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Monthly Rent (Rs.) *
                </label>
                <input
                  type="number"
                  id="price_per_month"
                  name="price_per_month"
                  required
                  min="0"
                  step="100"
                  value={formData.price_per_month}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                  placeholder="0"
                />
              </div>
              <div>
                <label htmlFor="security_deposit" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Security Deposit (Rs.)
                </label>
                <input
                  type="number"
                  id="security_deposit"
                  name="security_deposit"
                  min="0"
                  step="100"
                  value={formData.security_deposit}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                  placeholder="0"
                />
              </div>
              <div>
                <label htmlFor="advance_payment" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Advance Payment (Rs.)
                </label>
                <input
                  type="number"
                  id="advance_payment"
                  name="advance_payment"
                  min="0"
                  step="100"
                  value={formData.advance_payment}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Room Details */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Room Details</h2>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label htmlFor="total_rooms" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Total Rooms *
                </label>
                <input
                  type="number"
                  id="total_rooms"
                  name="total_rooms"
                  required
                  min="1"
                  value={formData.total_rooms}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
              <div>
                <label htmlFor="available_rooms" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Available Rooms *
                </label>
                <input
                  type="number"
                  id="available_rooms"
                  name="available_rooms"
                  required
                  min="1"
                  value={formData.available_rooms}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
              <div>
                <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Bathrooms *
                </label>
                <input
                  type="number"
                  id="bathrooms"
                  name="bathrooms"
                  required
                  min="1"
                  value={formData.bathrooms}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
              <div>
                <label htmlFor="area_sqft" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Area (sq. ft.)
                </label>
                <input
                  type="number"
                  id="area_sqft"
                  name="area_sqft"
                  min="0"
                  step="10"
                  value={formData.area_sqft}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label htmlFor="floor_number" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Floor Number
                </label>
                <input
                  type="number"
                  id="floor_number"
                  name="floor_number"
                  value={formData.floor_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                  placeholder="0"
                />
              </div>
              <div>
                <label htmlFor="total_floors" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Total Floors
                </label>
                <input
                  type="number"
                  id="total_floors"
                  name="total_floors"
                  value={formData.total_floors}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                  placeholder="0"
                />
              </div>
              <div>
                <label htmlFor="furnishing_status" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Furnishing Status
                </label>
                <select
                  id="furnishing_status"
                  name="furnishing_status"
                  value={formData.furnishing_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="">Select...</option>
                  <option value="furnished">Furnished</option>
                  <option value="semi_furnished">Semi-Furnished</option>
                  <option value="unfurnished">Unfurnished</option>
                </select>
              </div>
            </div>
          </div>

          {/* Images */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Images</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Upload Images (Max 10, 5MB each)
                </label>
                <input
                  type="file"
                  id="images"
                  name="images"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Supported formats: JPG, PNG, WebP. First image will be used as the primary image.
                </p>
              </div>

              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Property image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      {index === 0 && (
                        <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Amenities */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { name: "has_kitchen", label: "Kitchen" },
                { name: "has_parking", label: "Parking" },
                { name: "has_wifi", label: "WiFi" },
                { name: "has_water_supply", label: "Water Supply" },
                { name: "has_electricity", label: "Electricity" },
                { name: "has_security", label: "Security" },
                { name: "has_elevator", label: "Elevator" },
                { name: "has_balcony", label: "Balcony" },
              ].map((amenity) => (
                <label key={amenity.name} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name={amenity.name}
                    checked={formData[amenity.name as keyof typeof formData] as boolean}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{amenity.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
            <Link
              href="/landlord/dashboard"
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading || !location}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Updating..." : "Update Property"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

