"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useAnimationControls, useDragControls } from "framer-motion";
import { apiService } from "@/lib/api";

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const dragControls = useDragControls();
  const animationControls = useAnimationControls();

  useEffect(() => {
    // Check if user is already logged in
    if (apiService.isAuthenticated()) {
      router.push("/portfolio");
      return;
    }

    animationControls.start({
      y: [16, -16, 16],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: "loop",
        ease: "easeInOut"
      }
    });
  }, [animationControls, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await apiService.login({ email, password });
      router.push("/portfolio");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col">
      {/* Hero Section */}
      <header className="w-full px-8 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-white text-lg">Scopify</span>
          <span className="ml-2 px-2 py-0.5 rounded bg-white/20 text-white text-xs font-semibold">
            AI Analyst for Startups
          </span>
        </div>

        <button
          className="hidden md:inline-block bg-white/10 text-white px-5 py-2 rounded-lg font-medium hover:bg-white/20 transition"
          onClick={() => router.push("/signup")}
        >
          Get Started
        </button>
      </header>

      <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-12 px-6 py-12">
        {/* Left: Hero Text */}
        <section className="flex-1 max-w-xl text-center md:text-left">
          <div className="relative w-full">
            <h1 className="ml-8 text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight drop-shadow-lg">
              Unlock Startup Insights<br />
              <span className="text-yellow-300">with Scopify AI</span>
            </h1>
            <motion.img
              src="/logos/scopifyyellowlogo.png"
              alt="Scopify Logo"
              className="hidden md:block w-auto absolute top-[-90] right-97 z-0"
              initial={{ y: 0 }}
              animate={animationControls}
              drag
              dragMomentum={false}
              dragControls={dragControls}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "loop",
                ease: "easeInOut"
              }}
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            />
          </div>

          <p className="ml-8 text-lg md:text-xl text-white/90 mb-8">
            Scopify empowers founders and investors with instant analytics, benchmarks,
            and actionable recommendations. Let AI do the heavy lifting—so you can focus on what matters.
          </p>
          <div className="ml-8 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <button
              className="bg-yellow-300 text-indigo-800 font-semibold px-6 py-3 rounded-lg shadow hover:bg-yellow-200 transition"
              onClick={() => router.push("/signup")}
            >
              Try Scopify Free
            </button>
            <button
              className="bg-white/20 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/30 transition"
              onClick={() => {
                const el = document.getElementById("signin-card");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Sign In
            </button>
          </div>
        </section>

        {/* Right: Sign In Card */}
        <section
          id="signin-card"
          className="w-full max-w-md bg-white/90 rounded-2xl shadow-2xl p-8 flex flex-col items-center"
        >
          <h2 className="text-2xl font-bold text-indigo-700 mb-2">Sign in to Scopify</h2>
          <p className="text-sm text-gray-500 mb-6">Welcome back! Please sign in to your account.</p>
          <form onSubmit={handleSignIn} className="w-full space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-black"
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-black"
                required
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <div className="mt-4 w-full text-center">
            <span className="text-gray-600 text-sm">New to Scopify?</span>
            <button
              className="ml-2 text-indigo-700 font-semibold hover:underline"
              onClick={() => router.push("/signup")}
              disabled={loading}
            >
              Create an account
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full text-center text-white/70 py-4 text-xs flex justify-center items-center gap-2">
        <img src="/logos/scopifyyellowlogo.png" alt="Scopify Logo" className="h-5 w-auto" />
        <span>&copy; {new Date().getFullYear()} Scopify. All rights reserved.</span>
      </footer>
    </div>
  );
}
