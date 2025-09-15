"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { apiService } from "@/lib/api";

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await apiService.register({ email, password });
      setSuccess("Registration successful! You can now sign in.");
      setTimeout(() => router.push("/"), 1500);
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
      <div className="w-full max-w-md bg-white/95 rounded-2xl shadow-2xl p-8 flex flex-col items-center">
        <div className="mb-6 text-center">
          <span className="text-4xl font-extrabold text-indigo-700 tracking-tight">Scopify</span>
          <div className="mt-1 text-sm text-indigo-400 font-semibold">AI Analyst for Startups</div>
        </div>
        <h2 className="text-2xl font-bold text-indigo-700 mb-2">Create your account</h2>
        <form onSubmit={handleSignUp} className="w-full space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-black bg-white"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-black bg-white"
              required
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Register
          </button>
        </form>
        <div className="mt-6 w-full text-center">
          <span className="text-gray-600 text-sm">Already have an account?</span>
          <button
            className="ml-2 text-indigo-700 font-semibold hover:underline"
            onClick={() => router.push("/")}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}