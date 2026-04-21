"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type State = "loading" | "success" | "already" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [state, setState] = useState<State>("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!token) { setState("error"); setMsg("No verification token found. Please use the link from your email."); return; }

    fetch(`http://localhost:8000/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          if (data.message?.includes("already")) {
            setState("already");
          } else {
            setState("success");
          }
          setMsg(data.message || "");
        } else {
          setState("error");
          setMsg(data.message || "Verification failed.");
        }
      })
      .catch(() => {
        setState("error");
        setMsg("Cannot connect to server. Please try again.");
      });
  }, [token]);

  const config: Record<State, { icon: React.ReactNode; title: string; desc: string; iconBg: string }> = {
    loading: {
      icon: <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />,
      title: "Verifying…",
      desc: "Please wait while we verify your email address.",
      iconBg: "bg-blue-50/80",
    },
    success: {
      icon: (
        <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      title: "Email Verified!",
      desc: "Your email has been confirmed. You can now sign in to your RoomBox account.",
      iconBg: "bg-emerald-100/80",
    },
    already: {
      icon: (
        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Already Verified",
      desc: "Your email address is already confirmed. Go ahead and sign in.",
      iconBg: "bg-blue-50/80",
    },
    error: {
      icon: (
        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      title: "Verification Failed",
      desc: msg || "This link is invalid or has expired.",
      iconBg: "bg-red-100/80",
    },
  };

  const c = config[state];

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/loginpagebg.png')" }}
    >
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-white/40 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/50 shadow-lg">
            <span className="text-gray-900 font-bold text-xl">R</span>
          </div>
          <span className="text-2xl font-semibold text-gray-900 drop-shadow-sm">RoomBox</span>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-10 text-center backdrop-saturate-150">
          {/* Icon */}
          <div className={`w-20 h-20 ${c.iconBg} rounded-full flex items-center justify-center mx-auto mb-5 backdrop-blur-sm`}>
            {c.icon}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">{c.title}</h1>
          <p className="text-sm text-gray-700 mb-8 leading-relaxed">{c.desc}</p>

          <div className="space-y-3">
            {(state === "success" || state === "already") && (
              <Link
                href="/login"
                className="block w-full py-3 text-center bg-white/40 backdrop-blur-md text-gray-900 rounded-xl hover:bg-white/50 border border-gray-300/50 transition-all font-medium text-sm shadow-lg hover:shadow-xl hover:scale-[1.01]"
              >
                Sign In to RoomBox
              </Link>
            )}
            {state === "error" && (
              <>
                <Link
                  href="/register"
                  className="block w-full py-3 text-center bg-white/40 backdrop-blur-md text-gray-900 rounded-xl hover:bg-white/50 border border-gray-300/50 transition-all font-medium text-sm shadow-lg"
                >
                  Create a New Account
                </Link>
                <Link
                  href="/login"
                  className="block w-full py-3 text-center text-gray-700 hover:text-gray-900 text-sm font-medium transition-colors"
                >
                  Back to Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
