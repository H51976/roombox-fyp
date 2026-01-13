"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setErrorMessage("");
  };

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

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
      const response = await fetch("http://localhost:8000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store token and user data
        if (data.data?.access_token) {
          localStorage.setItem("auth_token", data.data.access_token);
        }
        if (data.data?.user) {
          localStorage.setItem("user", JSON.stringify(data.data.user));
        }
        
        // Show success toast
        toast.success("Login successful!", {
          description: `Welcome back, ${data.data?.user?.full_name || data.data?.user?.email || "User"}!`,
        });
        
        // Redirect to home or dashboard
        router.push("/");
      } else {
        const errorMsg = data.message || "Invalid email or password";
        setErrorMessage(errorMsg);
        toast.error("Login failed", {
          description: errorMsg,
        });
      }
    } catch (error: any) {
      console.error("Login error:", error);
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
      className="min-h-screen flex items-center justify-center px-4 py-12 bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: "url('/loginpagebg.png')",
      }}
    >
      <div className="w-full max-w-md relative z-10">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 text-gray-900 hover:text-gray-700 mb-6 text-sm backdrop-blur-sm bg-white/30 px-3 py-1.5 rounded-full transition-all font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-white/40 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/50 shadow-lg">
              <span className="text-gray-900 font-bold text-xl">R</span>
            </div>
            <span className="text-2xl font-semibold text-gray-900 drop-shadow-sm">RoomBox</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 drop-shadow-sm">Welcome Back</h1>
          <p className="text-gray-700 mt-1 text-sm">Sign in to your account</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8 backdrop-saturate-150">
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
              <div className="bg-red-100/90 backdrop-blur-sm border border-red-300/50 text-red-800 px-4 py-3 rounded-xl text-sm">
                {errorMessage}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-white/40 backdrop-blur-md border rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all text-sm text-gray-900 placeholder:text-gray-500 ${
                  errors.email ? "border-red-400/70 bg-red-50/50" : "border-gray-300/50"
                }`}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-700">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-1.5">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-white/40 backdrop-blur-md border rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all text-sm text-gray-900 placeholder:text-gray-500 ${
                  errors.password ? "border-red-400/70 bg-red-50/50" : "border-gray-300/50"
                }`}
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-700">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-400/50 rounded bg-white/40 backdrop-blur-sm"
                />
                <label htmlFor="remember" className="ml-2 text-gray-900 font-medium">
                  Remember me
                </label>
              </div>
              <Link href="#" className="text-gray-900 hover:text-gray-700 font-medium transition-colors">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-white/40 backdrop-blur-md text-gray-900 rounded-xl hover:bg-white/50 border border-gray-300/50 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-300/30">
            <p className="text-center text-sm text-gray-900">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-gray-900 hover:text-gray-700 font-medium underline underline-offset-2 transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
