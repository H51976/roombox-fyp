"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Please enter your email address."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        setError(data.message || "Something went wrong.");
        toast.error(data.message || "Request failed");
      }
    } catch {
      setError("Cannot connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('/loginpagebg.png')" }}
    >
      <div className="w-full max-w-md relative z-10">
        {/* Logo + back */}
        <div className="mb-8">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-gray-900 hover:text-gray-700 mb-6 text-sm backdrop-blur-sm bg-white/30 px-3 py-1.5 rounded-full transition-all font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Login
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/40 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/50 shadow-lg">
              <span className="text-gray-900 font-bold text-xl">R</span>
            </div>
            <span className="text-2xl font-semibold text-gray-900 drop-shadow-sm">RoomBox</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 drop-shadow-sm">Forgot Password?</h1>
          <p className="text-gray-700 mt-1 text-sm">We&apos;ll email you a link to reset it.</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8 backdrop-saturate-150">
          {sent ? (
            /* ── Success state ── */
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-100/80 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h2>
              <p className="text-sm text-gray-700 mb-1">
                We sent a password reset link to
              </p>
              <p className="text-sm font-semibold text-gray-900 mb-5">{email}</p>
              <p className="text-xs text-gray-600 mb-6">
                Didn&apos;t receive it? Check your spam folder, or{" "}
                <button
                  onClick={() => setSent(false)}
                  className="underline text-gray-900 hover:text-gray-700 font-medium"
                >
                  try again
                </button>
                .
              </p>
              <Link
                href="/login"
                className="inline-block w-full py-3 text-center bg-white/40 backdrop-blur-md text-gray-900 rounded-xl hover:bg-white/50 border border-gray-300/50 transition-all font-medium text-sm shadow-lg"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-100/90 backdrop-blur-sm border border-red-300/50 text-red-800 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  className="w-full px-4 py-3 bg-white/40 backdrop-blur-md border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all text-sm text-gray-900 placeholder:text-gray-500"
                  placeholder="you@example.com"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-white/40 backdrop-blur-md text-gray-900 rounded-xl hover:bg-white/50 border border-gray-300/50 transition-all font-medium text-sm disabled:opacity-50 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Sending…
                  </span>
                ) : (
                  "Send Reset Link"
                )}
              </button>
              <div className="pt-4 border-t border-gray-300/30 text-center">
                <p className="text-sm text-gray-900">
                  Remember your password?{" "}
                  <Link href="/login" className="font-medium underline underline-offset-2 hover:text-gray-700 transition-colors">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
