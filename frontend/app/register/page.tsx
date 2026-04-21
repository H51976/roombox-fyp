"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    user_type: "tenant" as "tenant" | "landlord",
    phone: "",
  });
  const [errors, setErrors] = useState<{
    full_name?: string;
    email?: string;
    password?: string;
    confirm_password?: string;
    phone?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setErrorMessage("");
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = "Full name is required";
    } else if (formData.full_name.trim().length < 2) {
      newErrors.full_name = "Name must be at least 2 characters";
    }

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.confirm_password) {
      newErrors.confirm_password = "Please confirm your password";
    } else if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = "Passwords do not match";
    }

    if (!formData.phone) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[0-9]{10}$/.test(formData.phone.replace(/[-\s]/g, ""))) {
      newErrors.phone = "Please enter a valid 10-digit phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("http://localhost:8000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Account created!", {
          description: "Check your email to verify your account.",
        });
        setRegisteredEmail(formData.email);
      } else {
        const errorMsg = data.message || "Registration failed. Please try again.";
        setErrorMessage(errorMsg);
        if (data.errors) {
          setErrors(data.errors);
        }
        toast.error("Registration failed", {
          description: errorMsg,
        });
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      const errorMsg = "Cannot connect to server. Please ensure the backend is running.";
      setErrorMessage(errorMsg);
      toast.error("Connection error", {
        description: errorMsg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Success: show "check your email" state ── */
  if (registeredEmail) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-12 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/loginpagebg.png')" }}
      >
        <div className="w-full max-w-md relative z-10">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-white/40 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/50 shadow-lg">
              <span className="text-gray-900 font-bold text-xl">R</span>
            </div>
            <span className="text-2xl font-semibold text-gray-900 drop-shadow-sm">RoomBox</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-10 text-center backdrop-saturate-150">
            <div className="w-20 h-20 bg-blue-100/80 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
            <p className="text-sm text-gray-700 mb-1">We sent a verification link to</p>
            <p className="text-base font-semibold text-gray-900 mb-6">{registeredEmail}</p>
            <p className="text-xs text-gray-600 mb-8 leading-relaxed">
              Click the link in the email to verify your account. You can still log in
              without verifying — but some features may be limited.
            </p>
            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full py-3 text-center bg-white/40 backdrop-blur-md text-gray-900 rounded-xl hover:bg-white/50 border border-gray-300/50 transition-all font-medium text-sm shadow-lg"
              >
                Go to Sign In
              </Link>
              <button
                onClick={async () => {
                  await fetch("http://localhost:8000/api/v1/auth/resend-verification", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: registeredEmail }),
                  });
                  toast.success("Verification email resent!");
                }}
                className="block w-full py-2.5 text-center text-gray-700 hover:text-gray-900 text-sm font-medium transition-colors"
              >
                Resend verification email
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-8 bg-white p-10 rounded-xl shadow-md border border-gray-100">
        <div>
          <Link href="/" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 mb-6 transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          <div className="flex items-center space-x-3 justify-center mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">R</span>
            </div>
            <span className="text-3xl font-extrabold text-gray-900 tracking-tight">RoomBox</span>
          </div>
          <h2 className="text-center text-2xl font-bold text-gray-900">Create your account</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join thousands of users finding their perfect space
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errorMessage && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <div className="text-sm text-red-700">{errorMessage}</div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">I am a...</label>
            <div className="grid grid-cols-2 gap-4">
              <label
                className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-colors ${formData.user_type === "tenant"
                    ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                    : "border-gray-200 hover:bg-gray-50"
                  }`}
              >
                <input
                  type="radio"
                  name="user_type"
                  value="tenant"
                  checked={formData.user_type === "tenant"}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className={`text-base font-semibold ${formData.user_type === "tenant" ? "text-blue-900" : "text-gray-900"}`}>
                  Tenant
                </span>
                <span className="text-sm mt-1 text-gray-500">Looking for a room</span>
              </label>

              <label
                className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-colors ${formData.user_type === "landlord"
                    ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                    : "border-gray-200 hover:bg-gray-50"
                  }`}
              >
                <input
                  type="radio"
                  name="user_type"
                  value="landlord"
                  checked={formData.user_type === "landlord"}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className={`text-base font-semibold ${formData.user_type === "landlord" ? "text-blue-900" : "text-gray-900"}`}>
                  Landlord
                </span>
                <span className="text-sm mt-1 text-gray-500">Listing my property</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  autoComplete="name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 bg-white text-gray-900 border ${errors.full_name ? "border-red-300" : "border-gray-300"
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="John Doe"
                />
                {errors.full_name && <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 bg-white text-gray-900 border ${errors.email ? "border-red-300" : "border-gray-300"
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="you@example.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 bg-white text-gray-900 border ${errors.phone ? "border-red-300" : "border-gray-300"
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="98XXXXXXXX"
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>
            </div>

            <div className="hidden sm:block"></div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 bg-white text-gray-900 border ${errors.password ? "border-red-300" : "border-gray-300"
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="••••••••"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1">
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 bg-white text-gray-900 border ${errors.confirm_password ? "border-red-300" : "border-gray-300"
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="••••••••"
                />
                {errors.confirm_password && <p className="mt-1 text-sm text-red-600">{errors.confirm_password}</p>}
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              required
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-900 cursor-pointer">
              I agree to the{" "}
              <Link href="#" className="font-medium text-blue-600 hover:text-blue-500">
                Terms and Conditions
              </Link>
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
