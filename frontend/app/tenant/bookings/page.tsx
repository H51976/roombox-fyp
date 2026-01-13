"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

interface PaymentDetail {
  amount: number;
  type: string;
  completed_at?: string;
}

interface Booking {
  id: number;
  room_title: string;
  start_date: string;
  end_date?: string;
  monthly_rent: number;
  security_deposit?: number;
  advance_payment?: number;
  status: string;
  tenancy_status?: string;
  tenant_message?: string;
  landlord_response?: string;
  created_at: string;
  total_paid?: number;
  payments?: PaymentDetail[];
}

export default function TenantBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    const token = localStorage.getItem("auth_token");
    
    if (!userStr || !token) {
      router.push("/login");
      return;
    }
    
    try {
      setCurrentUser(JSON.parse(userStr));
      fetchBookings();
    } catch (error) {
      console.error("Error parsing user data:", error);
      router.push("/login");
    }
  }, [router]);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        toast.error("Please login to view bookings");
        router.push("/login");
        return;
      }
      
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      };
      
      const response = await fetch("http://localhost:8000/api/v1/bookings/my-bookings?user_type=tenant", {
        headers,
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setBookings(data.data || []);
      } else {
        const errorMsg = data.message || "Failed to load bookings";
        toast.error(errorMsg);
        // If unauthorized, redirect to login
        if (response.status === 401) {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user");
          router.push("/login");
        }
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Connection error");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayNow = async (booking: Booking) => {
    try {
      // Determine payment type - if no payments made, start with security deposit or advance
      let paymentType = "security_deposit";
      if (booking.advance_payment && booking.advance_payment > 0) {
        paymentType = "advance";
      }

      const response = await fetch(
        `http://localhost:8000/api/v1/bookings/${booking.id}/payment/initiate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            payment_type: paymentType,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        // Create and submit eSewa form
        const form = document.createElement("form");
        form.method = "POST";
        form.action = data.data.form_url;

        Object.entries(data.data.form_data).forEach(([key, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = value as string;
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      } else {
        toast.error("Failed to initiate payment", {
          description: data.message || "Please try again.",
        });
      }
    } catch (error) {
      console.error("Error initiating payment:", error);
      toast.error("Connection error");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      case "completed":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const generateInvoice = (booking: Booking) => {
    // Create invoice HTML
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - Booking #${booking.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              padding: 40px;
              background: #f5f5f5;
            }
            .invoice-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e5e7eb;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
            }
            .invoice-title {
              text-align: right;
            }
            .invoice-title h1 {
              font-size: 32px;
              color: #111827;
              margin-bottom: 5px;
            }
            .invoice-title p {
              color: #6b7280;
              font-size: 14px;
            }
            .details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin-bottom: 40px;
            }
            .detail-section h3 {
              font-size: 14px;
              color: #6b7280;
              text-transform: uppercase;
              margin-bottom: 10px;
              letter-spacing: 0.5px;
            }
            .detail-section p {
              color: #111827;
              margin-bottom: 5px;
              font-size: 14px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .items-table thead {
              background: #f9fafb;
            }
            .items-table th {
              padding: 12px;
              text-align: left;
              font-size: 12px;
              color: #6b7280;
              text-transform: uppercase;
              font-weight: 600;
              border-bottom: 2px solid #e5e7eb;
            }
            .items-table td {
              padding: 12px;
              border-bottom: 1px solid #e5e7eb;
              color: #111827;
              font-size: 14px;
            }
            .items-table tbody tr:last-child td {
              border-bottom: none;
            }
            .total-section {
              margin-top: 20px;
              text-align: right;
            }
            .total-row {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 10px;
            }
            .total-row span:first-child {
              width: 150px;
              text-align: right;
              margin-right: 20px;
              color: #6b7280;
            }
            .total-row span:last-child {
              width: 120px;
              text-align: right;
              font-weight: 600;
              color: #111827;
            }
            .total-final {
              font-size: 20px;
              padding-top: 10px;
              border-top: 2px solid #e5e7eb;
              margin-top: 10px;
            }
            .total-final span:last-child {
              color: #2563eb;
              font-size: 24px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
            @media print {
              body { background: white; padding: 0; }
              .invoice-container { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="logo">RoomBox</div>
              <div class="invoice-title">
                <h1>INVOICE</h1>
                <p>Booking #${booking.id}</p>
                <p>Date: ${new Date(booking.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div class="details">
              <div class="detail-section">
                <h3>Tenant Details</h3>
                <p><strong>${currentUser?.full_name || currentUser?.email || 'N/A'}</strong></p>
                <p>${currentUser?.email || ''}</p>
              </div>
              <div class="detail-section">
                <h3>Property Details</h3>
                <p><strong>${booking.room_title}</strong></p>
                <p>Start Date: ${new Date(booking.start_date).toLocaleDateString()}</p>
                ${booking.end_date ? `<p>End Date: ${new Date(booking.end_date).toLocaleDateString()}</p>` : '<p>End Date: Indefinite</p>'}
              </div>
            </div>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Monthly Rent</td>
                  <td style="text-align: right;">Rs. ${booking.monthly_rent.toLocaleString()}</td>
                </tr>
                ${booking.security_deposit ? `
                <tr>
                  <td>Security Deposit</td>
                  <td style="text-align: right;">Rs. ${booking.security_deposit.toLocaleString()}</td>
                </tr>
                ` : ''}
                ${booking.advance_payment ? `
                <tr>
                  <td>Advance Payment</td>
                  <td style="text-align: right;">Rs. ${booking.advance_payment.toLocaleString()}</td>
                </tr>
                ` : ''}
              </tbody>
            </table>
            
            <div class="total-section">
              ${booking.payments && booking.payments.length > 0 ? `
                <div class="total-row">
                  <span>Payment Details:</span>
                  <span></span>
                </div>
                ${booking.payments.map((payment: PaymentDetail) => `
                  <div class="total-row">
                    <span>${payment.type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} (${payment.completed_at ? new Date(payment.completed_at).toLocaleDateString() : 'N/A'}):</span>
                    <span>Rs. ${payment.amount.toLocaleString()}</span>
                  </div>
                `).join('')}
              ` : ''}
              <div class="total-row total-final">
                <span>Total Paid:</span>
                <span>Rs. ${(booking.total_paid || 0).toLocaleString()}</span>
              </div>
            </div>
            
            <div class="footer">
              <p>Thank you for using RoomBox!</p>
              <p>This is a computer-generated invoice.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Open invoice in new window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
      printWindow.focus();
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading bookings...</p>
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
          <div className="flex items-center space-x-4">
            <Link
              href="/tenant/transactions"
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Transactions</span>
            </Link>
            <Link
              href="/tenant/search"
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors"
            >
              Search Rooms
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Bookings</h1>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings yet</h3>
            <p className="text-gray-600 mb-6">Start by booking a room</p>
            <Link
              href="/tenant/search"
              className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              Search Rooms
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{booking.room_title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Start: {new Date(booking.start_date).toLocaleDateString()}
                      {booking.end_date && ` - End: ${new Date(booking.end_date).toLocaleDateString()}`}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Monthly Rent</p>
                    <p className="text-lg font-semibold text-gray-900">Rs. {booking.monthly_rent.toLocaleString()}</p>
                  </div>
                  {booking.security_deposit && (
                    <div>
                      <p className="text-sm text-gray-500">Security Deposit</p>
                      <p className="text-lg font-semibold text-gray-900">Rs. {booking.security_deposit.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* Payment Information */}
                {booking.total_paid !== undefined && booking.total_paid > 0 ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-green-800">Total Amount Paid</p>
                      <p className="text-lg font-bold text-green-700">Rs. {booking.total_paid.toLocaleString()}</p>
                    </div>
                    {booking.payments && booking.payments.length > 0 && (
                      <div className="mt-2 space-y-2 mb-3">
                        <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">Payment Breakdown:</p>
                        {booking.payments.map((payment, index) => (
                          <div key={index} className="flex justify-between items-center bg-white/50 rounded px-3 py-2">
                            <div>
                              <span className="text-sm font-medium text-green-900 capitalize">
                                {payment.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                              {payment.completed_at && (
                                <p className="text-xs text-green-700 mt-0.5">
                                  {new Date(payment.completed_at).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-green-700">Rs. {payment.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => generateInvoice(booking)}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium text-sm flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Generate Invoice</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-600 text-center">No payments made yet</p>
                  </div>
                )}

                {booking.landlord_response && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Landlord Response:</p>
                    <p className="text-sm text-gray-600">{booking.landlord_response}</p>
                  </div>
                )}

                {booking.status === "approved" && (
                  <button
                    onClick={() => handlePayNow(booking)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                  >
                    Pay Now
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

