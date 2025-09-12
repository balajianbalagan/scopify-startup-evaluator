"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiService, User } from "@/lib/api";

const SignIn: React.FC = () => {
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiService.login({ email, password });

      // Save user info
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect after successful login
      router.push("/startups/list");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="signin-card"
      className="w-full max-w-md bg-white/90 rounded-2xl shadow-2xl p-8 flex flex-col items-center"
    >
      <h2 className="text-2xl font-bold text-indigo-700 mb-2">Sign in to Scopify</h2>
      <p className="text-sm text-gray-500 mb-6">
        Welcome back! Please sign in to your account.
      </p>
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
  );
};

export default SignIn;
