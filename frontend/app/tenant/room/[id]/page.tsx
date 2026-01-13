"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import Chat from "@/components/Chat";

const MapComponent = dynamic(() => import("@/components/MapPicker"), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
});

interface RoomImage {
  id: number;
  image_url: string;
  is_primary: boolean;
}

interface Room {
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
  status: string;
  images: string[];
  owner?: {
    id: number;
    full_name?: string;
    email: string;
    phone?: string;
  };
}

export default function RoomDetailPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [chatRoomId, setChatRoomId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchRoomDetails();
    // Get current user
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, [roomId]);

  const fetchRoomDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/v1/rooms/${roomId}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setRoom(data.data);
      } else {
        toast.error("Failed to load room details", {
          description: data.message || "Room not found.",
        });
        router.push("/tenant/search");
      }
    } catch (error) {
      console.error("Error fetching room details:", error);
      toast.error("Connection error", {
        description: "Cannot connect to server. Please try again.",
      });
      router.push("/tenant/search");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactLandlord = async () => {
    if (!room?.owner?.id) {
      toast.error("Landlord information not available");
      return;
    }

    if (!currentUser) {
      toast.error("Please login to contact landlord");
      router.push("/login");
      return;
    }

    try {
      // Create or get chat room
      const response = await fetch(
        `http://localhost:8000/api/v1/chat/rooms/create?landlord_id=${room.owner.id}&room_id=${roomId}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setChatRoomId(data.data.id);
        setShowChat(true);
      } else {
        toast.error("Failed to start chat", {
          description: data.message || "Please try again.",
        });
      }
    } catch (error) {
      console.error("Error creating chat room:", error);
      toast.error("Connection error", {
        description: "Cannot connect to server. Please try again.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading room details...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Room not found</h2>
          <Link href="/tenant/search" className="text-blue-600 hover:text-blue-700">
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  const amenities = [
    { name: "Kitchen", value: room.has_kitchen },
    { name: "Parking", value: room.has_parking },
    { name: "WiFi", value: room.has_wifi },
    { name: "Water Supply", value: room.has_water_supply },
    { name: "Electricity", value: room.has_electricity },
    { name: "Security", value: room.has_security },
    { name: "Elevator", value: room.has_elevator },
    { name: "Balcony", value: room.has_balcony },
  ].filter((amenity) => amenity.value);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/tenant/search" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">R</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">RoomBox</span>
          </Link>
          <Link
            href="/tenant/search"
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors"
          >
            ← Back to Search
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            {room.images && room.images.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="aspect-video bg-gray-100 relative">
                  <img
                    src={room.images[selectedImageIndex]}
                    alt={room.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {room.images.length > 1 && (
                  <div className="p-4 grid grid-cols-4 gap-2">
                    {room.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`aspect-video rounded-md overflow-hidden border-2 transition-colors ${
                          selectedImageIndex === index
                            ? "border-blue-600"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${room.title} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 aspect-video flex items-center justify-center bg-gray-100">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}

            {/* Basic Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{room.title}</h1>
              <p className="text-gray-600 mb-4">{room.address}, {room.city}{room.ward_number ? `, ${room.ward_number}` : ""}</p>
              
              <div className="flex flex-wrap gap-3 mb-6">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {room.room_type}
                </span>
                {room.status === "available" && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Available
                  </span>
                )}
                {room.furnishing_status && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium capitalize">
                    {room.furnishing_status.replace("_", " ")}
                  </span>
                )}
              </div>

              {room.description && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
                  <p className="text-gray-700 whitespace-pre-line">{room.description}</p>
                </div>
              )}

              {/* Room Details */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Room Details</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Rooms</p>
                    <p className="text-lg font-semibold text-gray-900">{room.total_rooms}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Available</p>
                    <p className="text-lg font-semibold text-green-600">{room.available_rooms}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Bathrooms</p>
                    <p className="text-lg font-semibold text-gray-900">{room.bathrooms}</p>
                  </div>
                  {room.area_sqft && (
                    <div>
                      <p className="text-sm text-gray-500">Area</p>
                      <p className="text-lg font-semibold text-gray-900">{room.area_sqft} sq. ft.</p>
                    </div>
                  )}
                </div>
                {(room.floor_number || room.total_floors) && (
                  <div className="mt-4 flex gap-4">
                    {room.floor_number && (
                      <div>
                        <p className="text-sm text-gray-500">Floor</p>
                        <p className="text-lg font-semibold text-gray-900">{room.floor_number}</p>
                      </div>
                    )}
                    {room.total_floors && (
                      <div>
                        <p className="text-sm text-gray-500">Total Floors</p>
                        <p className="text-lg font-semibold text-gray-900">{room.total_floors}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Amenities */}
              {amenities.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">Amenities</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {amenities.map((amenity) => (
                      <div key={amenity.name} className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">{amenity.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Location Map */}
              {room.latitude && room.longitude && (
                <div className="mt-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">Location</h2>
                  <MapComponent
                    onLocationSelect={() => {}}
                    initialLocation={{ lat: room.latitude, lng: room.longitude }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24">
              {/* Pricing */}
              <div className="mb-6">
                <div className="mb-4">
                  <p className="text-3xl font-bold text-blue-600">Rs. {room.price_per_month.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">per month</p>
                </div>
                {room.security_deposit && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-500">Security Deposit</p>
                    <p className="text-lg font-semibold text-gray-900">Rs. {room.security_deposit.toLocaleString()}</p>
                  </div>
                )}
                {room.advance_payment && (
                  <div>
                    <p className="text-sm text-gray-500">Advance Payment</p>
                    <p className="text-lg font-semibold text-gray-900">Rs. {room.advance_payment.toLocaleString()}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 mb-4">
                <button
                  onClick={handleContactLandlord}
                  className="w-full px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
                >
                  Contact Landlord
                </button>
                <Link
                  href={`/tenant/room/${roomId}/booking`}
                  className="block w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-center"
                >
                  Book This Room
                </Link>
              </div>

              {/* Owner Info */}
              {room.owner && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Property Owner</h3>
                  <p className="text-sm text-gray-700">{room.owner.full_name || "Landlord"}</p>
                  {room.owner.phone && (
                    <p className="text-sm text-gray-600 mt-1">{room.owner.phone}</p>
                  )}
                </div>
              )}

              {/* Quick Info */}
              <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-medium ${
                    room.status === "available" ? "text-green-600" : "text-gray-600"
                  }`}>
                    {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Available Rooms</span>
                  <span className="font-medium text-gray-900">{room.available_rooms}</span>
                </div>
                {room.area_sqft && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Area</span>
                    <span className="font-medium text-gray-900">{room.area_sqft} sq. ft.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Modal */}
      {showChat && chatRoomId && room && currentUser && (
        <Chat
          chatRoomId={chatRoomId}
          currentUserId={parseInt(currentUser.id)}
          otherUserName={room.owner?.full_name || room.owner?.email || "Landlord"}
          roomTitle={room.title}
          onClose={() => {
            setShowChat(false);
            setChatRoomId(null);
          }}
        />
      )}
    </div>
  );
}

