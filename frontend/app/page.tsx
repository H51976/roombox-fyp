"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";

interface User {
  id: string;
  email: string;
  full_name?: string;
  user_type?: string;
}

const getUserTypeLabel = (userType?: string): string => {
  if (!userType) return "";
  const type = userType.toLowerCase();
  if (type === "tenant") return "Tenant";
  if (type === "landlord") return "Landlord";
  if (type === "admin") return "Admin";
  return userType.charAt(0).toUpperCase() + userType.slice(1);
};

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const userStr = localStorage.getItem("user");

    if (token && userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    setUser(null);
    toast.success("Logged out successfully");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Navbar */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold tracking-tight text-blue-600">RoomBox</span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <Link href="#" className="text-gray-600 hover:text-gray-900 font-medium text-sm">How it Works</Link>
              <Link href="#" className="text-gray-600 hover:text-gray-900 font-medium text-sm">Browse Rooms</Link>
              <Link href="#" className="text-gray-600 hover:text-gray-900 font-medium text-sm">For Landlords</Link>
            </div>

            <div className="flex items-center space-x-4">
              {isLoading ? (
                <div className="w-24 h-8 bg-gray-100 rounded animate-pulse"></div>
              ) : user ? (
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col text-right">
                    <span className="text-sm font-medium text-gray-900">{user.full_name || user.email}</span>
                    <span className="text-xs text-gray-500">{getUserTypeLabel(user.user_type)}</span>
                  </div>
                  <div className="h-8 w-px bg-gray-200" />
                  {user.user_type?.toLowerCase() === "landlord" ? (
                    <Link href="/landlord/dashboard" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      Dashboard
                    </Link>
                  ) : (
                    <Link href="/tenant/search" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      Search
                    </Link>
                  )}
                  <button onClick={handleLogout} className="text-sm font-medium text-gray-600 hover:text-gray-900">
                    Logout
                  </button>
                </div>
              ) : (
                <>
                  <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                    Log in
                  </Link>
                  <Link href="/register" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative bg-white border-b border-gray-100 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32 pt-10 sm:pt-16 lg:pt-20">
              <div className="px-4 sm:px-6 lg:px-8">
                <div className="sm:text-center lg:text-left">
                  <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                    <span className="block xl:inline">Find your next perfect</span>{" "}
                    <span className="block text-blue-600 xl:inline">living space in Nepal.</span>
                  </h1>
                  <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                    RoomBox connects tenants with landlords instantly. Browse verified listings, view map locations, and contact owners directly without the hassle of brokers.
                  </p>

                  {!user && (
                    <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                      <div className="rounded-md shadow">
                        <Link href="/register" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg">
                          Start Searching
                        </Link>
                      </div>
                      <div className="mt-3 sm:mt-0 sm:ml-3">
                        <Link href="/register?type=landlord" className="w-full flex items-center justify-center px-8 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 md:py-4 md:text-lg">
                          List a Property
                        </Link>
                      </div>
                    </div>
                  )}

                  {user && (
                    <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                      <div className="rounded-md shadow">
                        {user.user_type?.toLowerCase() === "landlord" ? (
                          <Link href="/landlord/dashboard" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg">
                            Go to Dashboard
                          </Link>
                        ) : (
                          <Link href="/tenant/search" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg">
                            Search Rooms Now
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
          <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
            <div className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full bg-gray-200">
              {/* Use the login page background or generic color for placeholder */}
              <img
                className="h-full w-full object-cover"
                src="/loginpagebg.png"
                alt="Modern room interior"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-gray-50 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-base font-semibold text-blue-600 tracking-wide uppercase">Why RoomBox?</h2>
              <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                A better way to rent
              </p>
              <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
                Everything you need to find the perfect room or the perfect tenant, all in one transparent platform.
              </p>
            </div>

            <div className="mt-16">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Feature 1 */}
                <div className="pt-6">
                  <div className="flow-root bg-white rounded-lg px-6 pb-8 border border-gray-200">
                    <div className="-mt-6">
                      <div>
                        <span className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-md shadow-lg">
                          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </span>
                      </div>
                      <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Verified Listings</h3>
                      <p className="mt-5 text-base text-gray-500">
                        Every property on RoomBox goes through a strict verification process. No more fake photos or misleading descriptions.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="pt-6">
                  <div className="flow-root bg-white rounded-lg px-6 pb-8 border border-gray-200">
                    <div className="-mt-6">
                      <div>
                        <span className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-md shadow-lg">
                          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </span>
                      </div>
                      <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Map-Based Discovery</h3>
                      <p className="mt-5 text-base text-gray-500">
                        Search exactly where you want to live. Our interactive maps make it easy to find properties near your workplace or university.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="pt-6">
                  <div className="flow-root bg-white rounded-lg px-6 pb-8 border border-gray-200">
                    <div className="-mt-6">
                      <div>
                        <span className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-md shadow-lg">
                          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                        </span>
                      </div>
                      <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Direct Messaging</h3>
                      <p className="mt-5 text-base text-gray-500">
                        Skip the middleman. Chat directly with landlords to ask questions, negotiate terms, and schedule visits securely.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Action Call */}
        <section className="bg-blue-700">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              <span className="block">Ready to get started?</span>
              <span className="block text-blue-200">Create your account today.</span>
            </h2>
            {!user && (
              <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
                <div className="inline-flex rounded-md shadow">
                  <Link href="/register" className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50">
                    Get started
                  </Link>
                </div>
                <div className="ml-3 inline-flex rounded-md shadow">
                  <Link href="/login" className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-800">
                    Log in
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8 border-t border-gray-200">
          <div className="flex justify-center space-x-6 md:order-2">
            <Link href="#" className="text-gray-400 hover:text-gray-500">About</Link>
            <Link href="#" className="text-gray-400 hover:text-gray-500">Privacy</Link>
            <Link href="#" className="text-gray-400 hover:text-gray-500">Terms</Link>
          </div>
          <div className="mt-8 md:mt-0 md:order-1">
            <p className="text-center text-base text-gray-400">
              &copy; {new Date().getFullYear()} RoomBox, Inc. All rights reserved. Made in Nepal.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
