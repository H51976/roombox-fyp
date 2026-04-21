"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

const API = "http://localhost:8000/api/v1";

type Status = "verifying" | "success" | "error";

interface ReceiptData {
  bookingId: string;
  paymentId: string;
  roomTitle: string;
  amount: string;
  date: string;
  transactionRef: string;
  tenantName: string;
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("verifying");
  const [detail, setDetail] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run() {
    const paymentId = localStorage.getItem("esewa_payment_id");
    const bkId = localStorage.getItem("esewa_booking_id");
    if (bkId) setBookingId(bkId);

    const esewaData = searchParams.get("data");

    if (esewaData) {
      try {
        const decoded = JSON.parse(atob(esewaData)) as {
          transaction_code?: string;
          transaction_uuid?: string;
          signature?: string;
          total_amount?: string;
          product_code?: string;
          status?: string;
        };

        if (decoded.status && decoded.status.toUpperCase() !== "COMPLETE") {
          await cancelPayment(paymentId, bkId);
          fail("Payment was not completed on eSewa. The booking has been cancelled.");
          return;
        }

        const uuid = decoded.transaction_uuid;
        const ref = decoded.transaction_code;
        const sig = decoded.signature;

        if (!uuid || !ref || !sig) throw new Error("Missing fields in eSewa response");

        const ok = await verifyWithEsewa(uuid, ref, sig, decoded.total_amount, decoded.product_code);
        if (ok) {
          buildReceipt(bkId, paymentId, decoded.total_amount, ref);
          clearLocalStorage();
          return;
        }

        if (bkId) {
          const ok2 = await manualVerify(bkId);
          if (ok2) { buildReceipt(bkId, paymentId, decoded.total_amount, ref); clearLocalStorage(); return; }
        }
        fail("Payment verification failed. Please use 'I Already Paid' on your bookings page.");
        return;
      } catch (err) {
        console.error("eSewa data decode error:", err);
      }
    }

    if (bkId) {
      const ok = await manualVerify(bkId);
      if (ok) { buildReceipt(bkId, paymentId, undefined, undefined); clearLocalStorage(); return; }
    }

    if (paymentId) {
      setStatus("success");
      setDetail("Payment recorded. Head to your bookings and click 'I Already Paid' if the booking still shows pending.");
      buildReceipt(bkId, paymentId, undefined, undefined);
      clearLocalStorage();
    } else {
      fail("Missing payment information. Please check your bookings.");
    }
  }

  function buildReceipt(bkId: string | null, pyId: string | null, amount?: string, ref?: string) {
    const userData = localStorage.getItem("user");
    let name = "Tenant";
    try { if (userData) name = JSON.parse(userData).full_name || "Tenant"; } catch {}
    setReceipt({
      bookingId: bkId || "—",
      paymentId: pyId || "—",
      roomTitle: localStorage.getItem("esewa_room_title") || "Room",
      amount: amount || "—",
      date: new Date().toLocaleString("en-NP", { dateStyle: "medium", timeStyle: "short" }),
      transactionRef: ref || "—",
      tenantName: name,
    });
  }

  async function verifyWithEsewa(
    transaction_uuid: string, ref_id: string, signature: string,
    total_amount?: string, product_code?: string,
  ): Promise<boolean> {
    try {
      const params = new URLSearchParams({ transaction_uuid, ref_id, signature });
      if (total_amount) params.set("total_amount", total_amount);
      if (product_code) params.set("product_code", product_code);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${API}/bookings/payment/verify?${params}`, {
        method: "POST",
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json();
      if (res.ok && data.success) {
        setBookingId(String(data.data?.booking_id || bookingId || ""));
        setStatus("success");
        setDetail("Your payment has been verified and your room is now booked!");
        toast.success("Booking confirmed! Receipt sent to your email.");
        return true;
      }
      return false;
    } catch { return false; }
  }

  async function manualVerify(bkId: string): Promise<boolean> {
    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch(`${API}/bookings/${bkId}/manual-verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBookingId(bkId);
        setStatus("success");
        setDetail("Your payment has been confirmed and your room is now booked!");
        toast.success("Booking confirmed! Receipt sent to your email.");
        return true;
      }
      return false;
    } catch { return false; }
  }

  async function cancelPayment(paymentId: string | null, bkId: string | null) {
    if (!paymentId || !bkId) return;
    try {
      await fetch(`${API}/bookings/payment/cancel?payment_id=${paymentId}&booking_id=${bkId}`, { method: "POST" });
    } catch {}
  }

  function fail(msg: string) {
    setStatus("error");
    setDetail(msg);
    toast.error("Booking not confirmed");
  }

  function clearLocalStorage() {
    localStorage.removeItem("esewa_payment_id");
    localStorage.removeItem("esewa_booking_id");
  }

  function downloadPDF() {
    if (!receipt) return;
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>RoomBox Payment Receipt</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; padding: 40px; }
    .header { display: flex; align-items: center; gap: 14px; padding-bottom: 24px; border-bottom: 2px solid #e2e8f0; margin-bottom: 28px; }
    .logo { width: 48px; height: 48px; background: #2563eb; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 22px; font-weight: 800; }
    .brand { font-size: 22px; font-weight: 700; color: #1d4ed8; }
    .brand-sub { font-size: 12px; color: #64748b; }
    .receipt-title { font-size: 28px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .receipt-sub { font-size: 14px; color: #64748b; margin-bottom: 28px; }
    .badge { display: inline-block; background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; border-radius: 999px; padding: 4px 16px; font-size: 13px; font-weight: 600; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    td { padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    td:first-child { color: #64748b; width: 45%; }
    td:last-child { font-weight: 600; text-align: right; }
    .total-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; }
    .total-box .lbl { font-size: 13px; color: #64748b; }
    .total-box .val { font-size: 22px; font-weight: 700; color: #16a34a; margin-top: 2px; }
    .footer { font-size: 11px; color: #94a3b8; text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">R</div>
    <div>
      <div class="brand">RoomBox</div>
      <div class="brand-sub">Nepal's Room Rental Platform</div>
    </div>
  </div>
  <div class="receipt-title">Payment Receipt</div>
  <div class="receipt-sub">Official payment confirmation</div>
  <div class="badge">✓ Payment Successful</div>
  <table>
    <tr><td>Booking ID</td><td>#RB${receipt.bookingId.padStart(4,"0")}</td></tr>
    <tr><td>Payment ID</td><td>#PY${receipt.paymentId.padStart(4,"0")}</td></tr>
    <tr><td>Tenant Name</td><td>${receipt.tenantName}</td></tr>
    <tr><td>Room</td><td>${receipt.roomTitle}</td></tr>
    <tr><td>Transaction Reference</td><td>${receipt.transactionRef}</td></tr>
    <tr><td>Payment Date</td><td>${receipt.date}</td></tr>
    <tr><td>Payment Method</td><td>eSewa Digital Wallet</td></tr>
    <tr><td>Status</td><td>Completed</td></tr>
  </table>
  <div class="total-box">
    <div class="lbl">Total Amount Paid</div>
    <div class="val">Rs. ${receipt.amount}</div>
  </div>
  <div class="footer">
    This is a computer-generated receipt. No signature required.<br/>
    © 2026 RoomBox · Nepal's Room Rental Platform
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      win.onload = () => {
        win.print();
        URL.revokeObjectURL(url);
      };
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-8 max-w-md w-full">

        {/* ── Verifying ── */}
        {status === "verifying" && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-5">
              <div className="w-10 h-10 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Verifying Payment…</h1>
            <p className="text-gray-400 text-sm">Confirming your payment with eSewa. Please wait.</p>
          </div>
        )}

        {/* ── Success ── */}
        {status === "success" && (
          <>
            {/* Icon */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Payment Successful!</h1>
              <p className="text-gray-500 text-sm">{detail}</p>
            </div>

            {/* Email notice */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-blue-700">
                <span className="font-semibold">Receipt sent to your email!</span>{" "}
                Check your inbox for the payment receipt and booking confirmation.
              </p>
            </div>

            {/* Receipt preview */}
            {receipt && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-5 text-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-900">Receipt Preview</span>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Paid</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Booking</span>
                    <span className="font-medium">#RB{receipt.bookingId.padStart(4,"0")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Room</span>
                    <span className="font-medium truncate max-w-[160px]">{receipt.roomTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium">{receipt.date}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2 mt-1">
                    <span className="text-gray-700 font-semibold">Amount Paid</span>
                    <span className="font-bold text-emerald-700">Rs. {receipt.amount}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              {receipt && (
                <button
                  onClick={downloadPDF}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF Receipt
                </button>
              )}
              <Link
                href="/tenant/bookings"
                className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                View My Bookings
              </Link>
              <Link
                href="/tenant/tracking"
                className="block w-full py-3 text-center bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-medium hover:bg-emerald-100 transition-colors"
              >
                Track My Tenancy
              </Link>
              <Link
                href="/tenant/search"
                className="block text-sm text-center text-gray-400 hover:text-gray-600 pt-1"
              >
                Continue Searching
              </Link>
            </div>
          </>
        )}

        {/* ── Error ── */}
        {status === "error" && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Booking Not Yet Confirmed</h1>
            <p className="text-gray-500 text-sm mb-7">{detail}</p>
            <div className="space-y-3">
              <Link
                href="/tenant/bookings"
                className="block w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Go to My Bookings → Click &quot;I Already Paid&quot;
              </Link>
              <Link
                href="/tenant/search"
                className="block w-full py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Back to Search
              </Link>
            </div>
            <p className="text-xs text-gray-400 mt-5">
              If eSewa charged you, your booking ID is #{bookingId || "—"}. Go to My Bookings and click &quot;I Already Paid&quot; to activate it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
