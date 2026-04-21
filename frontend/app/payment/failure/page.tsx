"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const API = "http://localhost:8000/api/v1";

export default function PaymentFailurePage() {
  const searchParams = useSearchParams();
  const calledRef = useRef(false);
  const [done, setDone] = useState(false);
  const [paymentRef, setPaymentRef] = useState<string | null>(null);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    // Get IDs from localStorage (stored before eSewa redirect)
    const paymentId = localStorage.getItem("esewa_payment_id");
    const bookingId = localStorage.getItem("esewa_booking_id");
    if (paymentId) setPaymentRef(paymentId);

    // Also check URL params for backward compat (some integrations pass them)
    const urlPaymentId = searchParams.get("payment_id") || paymentId;
    const urlBookingId = searchParams.get("booking_id") || bookingId;

    // Guard: if eSewa data says COMPLETE, don't cancel (shouldn't land here, but be safe)
    const esewaData = searchParams.get("data");
    if (esewaData) {
      try {
        const decoded = JSON.parse(atob(esewaData)) as { status?: string };
        if (decoded.status?.toUpperCase() === "COMPLETE") {
          setDone(true);
          localStorage.removeItem("esewa_payment_id");
          localStorage.removeItem("esewa_booking_id");
          return;
        }
      } catch {}
    }

    if (!urlPaymentId || !urlBookingId) {
      setDone(true);
      return;
    }

    fetch(`${API}/bookings/payment/cancel?payment_id=${urlPaymentId}&booking_id=${urlBookingId}`, {
      method: "POST",
    })
      .catch(() => {})
      .finally(() => {
        setDone(true);
        localStorage.removeItem("esewa_payment_id");
        localStorage.removeItem("esewa_booking_id");
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
        <p className="text-gray-500 text-sm mb-1">Your payment could not be processed.</p>
        <p className="text-gray-400 text-xs mb-7">
          {done ? "The booking has been cancelled and the room is available again." : "Cancelling your booking…"}
        </p>
        <div className="space-y-3">
          <Link href="/tenant/search"
            className="block w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            Try Another Room
          </Link>
          <Link href="/tenant/bookings"
            className="block w-full py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
            View My Bookings
          </Link>
        </div>
        {paymentRef && (
          <p className="text-xs text-gray-400 mt-5">
            Payment ref #{paymentRef} — contact support if you were charged.
          </p>
        )}
      </div>
    </div>
  );
}
