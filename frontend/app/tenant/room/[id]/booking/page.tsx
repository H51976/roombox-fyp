"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

interface Room {
  id: number;
  title: string;
  price_per_month: number;
  security_deposit?: number;
  advance_payment?: number;
  tenancy_duration_days?: number;
  owner?: {
    id: number;
    full_name?: string;
    email: string;
  };
}

export default function BookingPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    start_date: "",
    tenant_message: "",
  });

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }

    fetchRoomDetails();
  }, [roomId]);

  const fetchRoomDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/v1/rooms/${roomId}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setRoom(data.data);
        // Set default start date to today
        const today = new Date().toISOString().split('T')[0];
        setFormData((prev) => ({ ...prev, start_date: today }));
      } else {
        toast.error("Failed to load room details");
        router.push("/tenant/search");
      }
    } catch (error) {
      console.error("Error fetching room details:", error);
      toast.error("Connection error");
      router.push("/tenant/search");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error("Please login to book a room");
      router.push("/login");
      return;
    }

    if (!formData.start_date) {
      toast.error("Please select a start date");
      return;
    }

    if (!room) {
      toast.error("Room information not loaded");
      return;
    }

    // Check if Security Deposit and Advance Payment are required
    const securityDeposit = room.security_deposit || 0;
    const advancePayment = room.advance_payment || 0;
    const totalPayment = securityDeposit + advancePayment;

    if (totalPayment <= 0) {
      toast.error("Security Deposit and Advance Payment are required for booking");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("auth_token") || "";
      const response = await fetch("http://localhost:8000/api/v1/bookings/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          room_id: parseInt(roomId),
          start_date: formData.start_date + "T00:00:00Z",
          end_date: null,
          tenant_message: formData.tenant_message || null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Save payment_id and booking_id to localStorage BEFORE redirecting to eSewa.
        // eSewa appends "?data=BASE64" to whatever success/failure URL we give it.
        // If our URL already had query params (?payment_id=X&booking_id=Y), eSewa would
        // produce "?payment_id=X&booking_id=Y?data=..." which is broken (double ?).
        // So we keep our success/failure URLs clean and store the IDs in localStorage.
        localStorage.setItem("esewa_payment_id", String(data.data.payment_id));
        localStorage.setItem("esewa_booking_id", String(data.data.booking_id));
        if (room?.title) localStorage.setItem("esewa_room_title", room.title);

        const formData_payment = data.data.form_data;
        const formUrl = data.data.form_url;

        const form = document.createElement("form");
        form.method = "POST";
        form.action = formUrl;

        Object.keys(formData_payment).forEach((key) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = formData_payment[key];
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();

        toast.info("Redirecting to eSewa payment…", {
          description: "Complete the payment to confirm your booking.",
        });
      } else {
        toast.error("Failed to submit booking request", {
          description: data.message || "Please try again.",
        });
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error submitting booking:", error);
      toast.error("Connection error", {
        description: "Cannot connect to server. Please try again.",
      });
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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
            href={`/tenant/room/${roomId}`}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors"
          >
            ← Back to Room
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Book Room</h1>
          <p className="text-gray-600 mb-6">{room.title}</p>

          {/* Pricing Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Pricing Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Rent</span>
                <span className="font-semibold text-gray-900">Rs. {room.price_per_month.toLocaleString()}</span>
              </div>
              {room.security_deposit && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Security Deposit</span>
                  <span className="font-semibold text-gray-900">Rs. {room.security_deposit.toLocaleString()}</span>
                </div>
              )}
              {room.advance_payment && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Advance Payment</span>
                  <span className="font-semibold text-gray-900">Rs. {room.advance_payment.toLocaleString()}</span>
                </div>
              )}
              {(room.security_deposit || room.advance_payment) && (
                <div className="border-t border-gray-300 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Total Payment Required</span>
                    <span className="font-bold text-lg text-blue-600">
                      Rs. {((room.security_deposit || 0) + (room.advance_payment || 0)).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    You will be redirected to eSewa to complete payment
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Booking Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>

            {room.tenancy_duration_days ? (
              <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 flex items-start gap-2">
                <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-blue-800">Tenancy Duration: {room.tenancy_duration_days} days</p>
                  <p className="text-xs text-blue-600 mt-0.5">Your move-out date will be automatically set to {room.tenancy_duration_days} days from your start date.</p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-3 text-sm text-gray-500">
                No fixed duration set by landlord — this is an open-ended tenancy.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message to Landlord (Optional)
              </label>
              <textarea
                value={formData.tenant_message}
                onChange={(e) => setFormData((prev) => ({ ...prev, tenant_message: e.target.value }))}
                rows={4}
                placeholder="Tell the landlord about yourself, your move-in date, or any questions..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div className="flex gap-4">
              <Link
                href={`/tenant/room/${roomId}`}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Redirecting to Payment..." : "Proceed to Payment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

