"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

interface Transaction {
  id: number;
  booking_id: number;
  room_title: string;
  landlord_name: string;
  amount: number;
  payment_type: string;
  payment_month?: string;
  transaction_uuid?: string;
  esewa_ref_id?: string;
  status: string;
  created_at: string;
  completed_at?: string;
}

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (error) {
        console.error("Error parsing user data:", error);
        router.push("/login");
      }
    } else {
      router.push("/login");
    }

    fetchTransactions();
  }, [router]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch("http://localhost:8000/api/v1/bookings/tenant/transactions", {
        headers,
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setTransactions(data.data.transactions || []);
        setTotalPaid(data.data.total_paid || 0);
      } else {
        toast.error("Failed to load transactions");
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Connection error");
    } finally {
      setIsLoading(false);
    }
  };

  const generateTransactionInvoice = (transaction: Transaction) => {
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - Transaction #${transaction.id}</title>
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
                <h1>PAYMENT RECEIPT</h1>
                <p>Transaction #${transaction.id}</p>
                <p>Date: ${transaction.completed_at ? new Date(transaction.completed_at).toLocaleDateString() : new Date(transaction.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div class="details">
              <div class="detail-section">
                <h3>Tenant Details</h3>
                <p><strong>${currentUser?.full_name || currentUser?.email || 'N/A'}</strong></p>
                <p>${currentUser?.email || ''}</p>
              </div>
              <div class="detail-section">
                <h3>Payment Details</h3>
                <p><strong>${transaction.room_title}</strong></p>
                <p>Landlord: ${transaction.landlord_name}</p>
                ${transaction.payment_month ? `<p>Payment Month: ${transaction.payment_month}</p>` : ''}
                ${transaction.esewa_ref_id ? `<p>eSewa Ref ID: ${transaction.esewa_ref_id}</p>` : ''}
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
                  <td>${transaction.payment_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</td>
                  <td style="text-align: right;">Rs. ${transaction.amount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="total-section">
              <div class="total-row total-final">
                <span>Total Paid:</span>
                <span>Rs. ${transaction.amount.toLocaleString()}</span>
              </div>
            </div>
            
            <div class="footer">
              <p>Thank you for using RoomBox!</p>
              <p>This is a computer-generated receipt.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/tenant/search" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">R</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">RoomBox</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Link
              href="/tenant/bookings"
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors"
            >
              My Bookings
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Transaction History</h1>
          <p className="text-gray-600">View all your payment transactions</p>
        </div>

        {/* Summary Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 mb-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Total Amount Paid</p>
              <p className="text-3xl font-bold">Rs. {totalPaid.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-sm mb-1">Total Transactions</p>
              <p className="text-3xl font-bold">{transactions.length}</p>
            </div>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions yet</h3>
            <p className="text-gray-600 mb-6">Your payment history will appear here</p>
            <Link
              href="/tenant/search"
              className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              Search Rooms
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{transaction.room_title}</h3>
                    <p className="text-sm text-gray-600">Landlord: {transaction.landlord_name}</p>
                    {transaction.payment_month && (
                      <p className="text-xs text-gray-500 mt-1">Payment Month: {transaction.payment_month}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600 mb-1">Rs. {transaction.amount.toLocaleString()}</p>
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                      {transaction.status}
                    </span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Payment Type</p>
                    <p className="text-sm font-medium text-gray-900">{getPaymentTypeLabel(transaction.payment_type)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Transaction Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {transaction.completed_at 
                        ? new Date(transaction.completed_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : new Date(transaction.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric'
                          })
                      }
                    </p>
                  </div>
                  {transaction.esewa_ref_id && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">eSewa Reference ID</p>
                      <p className="text-sm font-medium text-gray-900 font-mono">{transaction.esewa_ref_id}</p>
                    </div>
                  )}
                  {transaction.transaction_uuid && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Transaction UUID</p>
                      <p className="text-sm font-medium text-gray-900 font-mono text-xs break-all">{transaction.transaction_uuid}</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => generateTransactionInvoice(transaction)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download Receipt</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

