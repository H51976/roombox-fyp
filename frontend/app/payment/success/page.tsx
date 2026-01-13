"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("payment_id");
  const bookingId = searchParams.get("booking_id");
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    // Get eSewa callback parameters
    const transaction_uuid = searchParams.get("transaction_uuid");
    const ref_id = searchParams.get("ref_id");
    const signature = searchParams.get("signature");

    if (transaction_uuid && ref_id && signature) {
      verifyPayment(transaction_uuid, ref_id, signature);
    } else if (paymentId) {
      // If no eSewa params, just show success (for testing)
      setIsVerifying(false);
      setVerificationStatus("success");
      toast.success("Payment successful!");
    } else {
      setIsVerifying(false);
      setVerificationStatus("error");
      toast.error("Payment verification failed");
    }
  }, [paymentId, searchParams]);

  const verifyPayment = async (transaction_uuid: string, ref_id: string, signature: string) => {
    try {
      const params = new URLSearchParams({
        transaction_uuid,
        ref_id,
        signature,
      });

      const response = await fetch(
        `http://localhost:8000/api/v1/bookings/payment/verify?${params.toString()}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setIsVerifying(false);
        setVerificationStatus("success");
        toast.success("Payment verified successfully!", {
          description: "Your booking has been confirmed.",
        });
      } else {
        setIsVerifying(false);
        setVerificationStatus("error");
        toast.error("Payment verification failed", {
          description: data.message || "Please contact support.",
        });
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      setIsVerifying(false);
      setVerificationStatus("error");
      toast.error("Connection error", {
        description: "Cannot verify payment. Please check your bookings.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md w-full text-center">
        {isVerifying ? (
          <>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Verifying payment...</p>
          </>
        ) : verificationStatus === "success" ? (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600 mb-6">
              Your payment has been processed successfully. Your booking request has been confirmed and the landlord has been notified.
            </p>
            <div className="space-y-3">
              <Link
                href="/tenant/bookings"
                className="block w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                View My Bookings
              </Link>
              <Link
                href="/tenant/search"
                className="block w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
              >
                Continue Searching
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Verification Failed</h1>
            <p className="text-gray-600 mb-6">
              There was an issue verifying your payment. Please check your bookings or contact support.
            </p>
            <div className="space-y-3">
              <Link
                href="/tenant/bookings"
                className="block w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Check My Bookings
              </Link>
              <Link
                href="/tenant/search"
                className="block w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
              >
                Back to Search
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

