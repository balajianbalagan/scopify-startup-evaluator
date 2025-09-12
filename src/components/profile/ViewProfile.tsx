"use client";

import React, { useEffect, useState } from "react";
import { apiService, User } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function ViewProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        if (!apiService.isAuthenticated()) {
          router.push('/');
          return;
        }

        const currentUser = await apiService.ensureCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        } else {
          setError('Unable to load user data');
        }
      } catch (err) {
        console.error('Failed to load user:', err);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto mt-12 bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center animate-pulse">
          <div className="w-24 h-24 rounded-full bg-gray-200 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-lg mx-auto mt-12 bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="text-red-500 mb-4">⚠️ {error || 'You are not logged in.'}</div>
        <button
          onClick={() => router.push('/')}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          Go to Login
        </button>
      </div>
    );
  }

  const userInitials = apiService.getUserInitials(user);
  const displayName = apiService.getDisplayName(user);

  return (
    <div className="max-w-lg mx-auto mt-12 bg-white rounded-2xl shadow-xl p-8">
      <div className="flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl mb-4 border-4 border-indigo-50">
          {userInitials}
        </div>
        <h2 className="text-2xl font-bold text-indigo-700 mb-1">{displayName}</h2>
        <p className="text-gray-600 mb-2">{user.email}</p>
        <div className="flex gap-2 mb-4">
          <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium capitalize">
            {user.role}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            user.is_active 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {user.is_active ? 'Active' : 'Inactive'}
          </span>
          {user.is_superuser && (
            <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
              Admin
            </span>
          )}
        </div>
        <div className="w-full bg-gray-50 rounded-lg p-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium text-gray-700">User ID:</span>
              <p className="text-gray-600">#{user.id}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Account Status:</span>
              <p className="text-gray-600">{user.is_active ? 'Active' : 'Inactive'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Role:</span>
              <p className="text-gray-600 capitalize">{user.role}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Permissions:</span>
              <p className="text-gray-600">{user.is_superuser ? 'Admin' : 'User'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
