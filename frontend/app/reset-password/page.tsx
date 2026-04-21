"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [form, setForm] = useState({ new_password: "", confirm_password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) setError("Missing reset token. Please use the link from your email.");
  }, [token]);

  const strength = (pwd: string) => {
    if (!pwd) return 0;
    let s = 0;
    if (pwd.length >= 8) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    return s;
  };
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColor = ["", "bg-red-500", "bg-amber-400", "bg-blue-500", "bg-emerald-500"];
  const s = strength(form.new_password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { setError("Invalid reset link."); return; }
    if (form.new_password !== form.confirm_password) { setError("Passwords do not match."); return; }
    if (form.new_password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...form }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDone(true);
        toast.success("Password reset successfully!");
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setError(data.message || "Failed to reset password.");
      }
    } catch {
      setError("Cannot connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/loginpagebg.png')" }}
    >
      <div className="w-full max-w-md relative z-10">
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
          <h1 className="text-2xl font-semibold text-gray-900 drop-shadow-sm">Set New Password</h1>
          <p className="text-gray-700 mt-1 text-sm">Choose a strong password for your account.</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8 backdrop-saturate-150">
          {done ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-100/80 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Password Updated!</h2>
              <p className="text-sm text-gray-700 mb-5">
                Your password has been reset successfully. Redirecting you to login…
              </p>
              <Link
                href="/login"
                className="inline-block w-full py-3 text-center bg-white/40 backdrop-blur-md text-gray-900 rounded-xl hover:bg-white/50 border border-gray-300/50 transition-all font-medium text-sm shadow-lg"
              >
                Go to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-100/90 backdrop-blur-sm border border-red-300/50 text-red-800 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* New password */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={form.new_password}
                    onChange={(e) => setForm((p) => ({ ...p, new_password: e.target.value }))}
                    className="w-full px-4 py-3 pr-11 bg-white/40 backdrop-blur-md border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 transition-all text-sm text-gray-900 placeholder:text-gray-500"
                    placeholder="Min. 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPwd ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {/* Strength meter */}
                {form.new_password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${i <= s ? strengthColor[s] : "bg-gray-200/70"}`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${s <= 1 ? "text-red-600" : s === 2 ? "text-amber-600" : s === 3 ? "text-blue-600" : "text-emerald-600"}`}>
                      {strengthLabel[s]}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">Confirm Password</label>
                <input
                  type={showPwd ? "text" : "password"}
                  value={form.confirm_password}
                  onChange={(e) => setForm((p) => ({ ...p, confirm_password: e.target.value }))}
                  className={`w-full px-4 py-3 bg-white/40 backdrop-blur-md border rounded-xl focus:ring-2 focus:ring-blue-500/50 transition-all text-sm text-gray-900 placeholder:text-gray-500 ${
                    form.confirm_password && form.new_password !== form.confirm_password
                      ? "border-red-400/70"
                      : "border-gray-300/50"
                  }`}
                  placeholder="Re-enter password"
                />
                {form.confirm_password && form.new_password !== form.confirm_password && (
                  <p className="mt-1 text-xs text-red-700">Passwords do not match</p>
                )}
                {form.confirm_password && form.new_password === form.confirm_password && (
                  <p className="mt-1 text-xs text-emerald-700 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Passwords match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full py-3 px-4 bg-white/40 backdrop-blur-md text-gray-900 rounded-xl hover:bg-white/50 border border-gray-300/50 transition-all font-medium text-sm disabled:opacity-50 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Updating…
                  </span>
                ) : (
                  "Set New Password"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
