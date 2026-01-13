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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (type === "radio") {
      setFormData((prev) => ({ ...prev, [name]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setErrorMessage("");
  };

  const validateForm = () => {
    const newErrors: {
      full_name?: string;
      email?: string;
      password?: string;
      confirm_password?: string;
      phone?: string;
    } = {};

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
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          password: formData.password,
          confirm_password: formData.confirm_password,
          phone: formData.phone,
          user_type: formData.user_type,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store token and user data if provided
        if (data.data?.access_token) {
          localStorage.setItem("auth_token", data.data.access_token);
        }
        if (data.data?.user) {
          localStorage.setItem("user", JSON.stringify(data.data.user));
        }
        
        // Show success toast
        toast.success("Registration successful!", {
          description: `Welcome to RoomBox, ${data.data?.user?.full_name || "User"}!`,
        });
        
        // Redirect to login or home
        router.push("/login");
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
      const errorMsg = error?.message?.includes("Failed to fetch") || error?.message?.includes("NetworkError")
        ? "Cannot connect to server. Please ensure the backend is running on http://localhost:8000"
        : "An error occurred. Please try again.";
      setErrorMessage(errorMsg);
      toast.error("Connection error", {
        description: errorMsg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 py-6 bg-cover bg-center bg-no-repeat relative overflow-hidden"
      style={{
        backgroundImage: "url('/loginpagebg.png')",
      }}
    >
      <div className="w-full max-w-2xl relative z-10">
        <div className="mb-4">
          <Link href="/" className="inline-flex items-center space-x-2 text-gray-900 hover:text-gray-700 mb-3 text-xs backdrop-blur-sm bg-white/30 px-2.5 py-1 rounded-full transition-all font-medium">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 bg-white/40 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/50 shadow-lg">
              <span className="text-gray-900 font-bold text-lg">R</span>
            </div>
            <span className="text-xl font-semibold text-gray-900 drop-shadow-sm">RoomBox</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 drop-shadow-sm">Create Your Account</h1>
          <p className="text-gray-700 text-xs">Join RoomBox and start your journey</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-6 backdrop-saturate-150 max-h-[calc(100vh-200px)] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-3">
            {errorMessage && (
              <div className="bg-red-100/90 backdrop-blur-sm border border-red-300/50 text-red-800 px-4 py-3 rounded-xl text-sm">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                I am a
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`relative flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all backdrop-blur-md ${
                    formData.user_type === "tenant"
                      ? "border-blue-500/70 bg-white/40 shadow-lg"
                      : "border-gray-300/50 hover:border-gray-400/50 bg-white/30"
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
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mb-1.5 ${
                    formData.user_type === "tenant"
                      ? "border-blue-600"
                      : "border-gray-400"
                  }`}>
                    {formData.user_type === "tenant" && (
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    )}
                  </div>
                  <span className={`text-xs font-medium ${
                    formData.user_type === "tenant" ? "text-gray-900" : "text-gray-700"
                  }`}>
                    Tenant
                  </span>
                  <span className={`text-[10px] mt-0.5 ${
                    formData.user_type === "tenant" ? "text-gray-700" : "text-gray-600"
                  }`}>
                    Looking for a room
                  </span>
                </label>
                
                <label
                  className={`relative flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all backdrop-blur-md ${
                    formData.user_type === "landlord"
                      ? "border-blue-500/70 bg-white/40 shadow-lg"
                      : "border-gray-300/50 hover:border-gray-400/50 bg-white/30"
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
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mb-1.5 ${
                    formData.user_type === "landlord"
                      ? "border-blue-600"
                      : "border-gray-400"
                  }`}>
                    {formData.user_type === "landlord" && (
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    )}
                  </div>
                  <span className={`text-xs font-medium ${
                    formData.user_type === "landlord" ? "text-gray-900" : "text-gray-700"
                  }`}>
                    Landlord
                  </span>
                  <span className={`text-[10px] mt-0.5 ${
                    formData.user_type === "landlord" ? "text-gray-700" : "text-gray-600"
                  }`}>
                    List my property
                  </span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="full_name" className="block text-xs font-medium text-gray-900 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 bg-white/40 backdrop-blur-md border rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all text-sm text-gray-900 placeholder:text-gray-500 ${
                    errors.full_name ? "border-red-400/70 bg-red-50/50" : "border-gray-300/50"
                  }`}
                  placeholder="John Doe"
                />
                {errors.full_name && (
                  <p className="mt-0.5 text-[10px] text-red-700">{errors.full_name}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-medium text-gray-900 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 bg-white/40 backdrop-blur-md border rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all text-sm text-gray-900 placeholder:text-gray-500 ${
                    errors.email ? "border-red-400/70 bg-red-50/50" : "border-gray-300/50"
                  }`}
                  placeholder="you@example.com"
                />
                {errors.email && (
                  <p className="mt-0.5 text-[10px] text-red-700">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="phone" className="block text-xs font-medium text-gray-900 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 bg-white/40 backdrop-blur-md border rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all text-sm text-gray-900 placeholder:text-gray-500 ${
                    errors.phone ? "border-red-400/70 bg-red-50/50" : "border-gray-300/50"
                  }`}
                  placeholder="98XXXXXXXX"
                />
                {errors.phone && (
                  <p className="mt-0.5 text-[10px] text-red-700">{errors.phone}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium text-gray-900 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 bg-white/40 backdrop-blur-md border rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all text-sm text-gray-900 placeholder:text-gray-500 ${
                    errors.password ? "border-red-400/70 bg-red-50/50" : "border-gray-300/50"
                  }`}
                  placeholder="Create a password"
                />
                {errors.password && (
                  <p className="mt-0.5 text-[10px] text-red-700">{errors.password}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="confirm_password" className="block text-xs font-medium text-gray-900 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirm_password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-white/40 backdrop-blur-md border rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all text-sm text-gray-900 placeholder:text-gray-500 ${
                  errors.confirm_password ? "border-red-400/70 bg-red-50/50" : "border-gray-300/50"
                }`}
                placeholder="Confirm your password"
              />
              {errors.confirm_password && (
                <p className="mt-0.5 text-[10px] text-red-700">{errors.confirm_password}</p>
              )}
            </div>

            <div className="flex items-start">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-400/50 rounded mt-0.5 bg-white/40 backdrop-blur-sm"
              />
              <label htmlFor="terms" className="ml-2 block text-xs text-gray-900">
                I agree to the{" "}
                <Link href="#" className="text-gray-900 hover:text-gray-700 font-medium underline underline-offset-2 transition-colors">
                  Terms and Conditions
                </Link>{" "}
                and{" "}
                <Link href="#" className="text-gray-900 hover:text-gray-700 font-medium underline underline-offset-2 transition-colors">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-white/40 backdrop-blur-md text-gray-900 rounded-xl hover:bg-white/50 border border-gray-300/50 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-300/30">
            <p className="text-center text-xs text-gray-900">
              Already have an account?{" "}
              <Link href="/login" className="text-gray-900 hover:text-gray-700 font-medium underline underline-offset-2 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
