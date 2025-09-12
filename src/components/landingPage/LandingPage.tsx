"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (email === "test@example.com" && password === "password") {
      router.push("/portfolio");
    } else {
      setError("Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col">
      {/* Hero Section */}
      <header className="w-full px-8 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-extrabold text-white tracking-tight">Scopify</span>
          <span className="ml-2 px-2 py-0.5 rounded bg-white/20 text-white text-xs font-semibold">AI Analyst for Startups</span>
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
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight drop-shadow-lg">
            Unlock Startup Insights<br />
            <span className="text-yellow-300">with AI</span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8">
            Scopify empowers founders and investors with instant analytics, benchmarks, and actionable recommendations. 
            Let AI do the heavy lifting—so you can focus on what matters.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
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
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              Sign In
            </button>
          </form>
          <div className="mt-4 w-full text-center">
            <span className="text-gray-600 text-sm">New to Scopify?</span>
            <button
              className="ml-2 text-indigo-700 font-semibold hover:underline"
              onClick={() => router.push("/signup")}
            >
              Create an account
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full text-center text-white/70 py-4 text-xs">
        &copy; {new Date().getFullYear()} Scopify. All rights reserved.
      </footer>
    </div>
  );
}