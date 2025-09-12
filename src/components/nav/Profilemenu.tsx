'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FiUser, FiLogOut, FiSun, FiMoon } from 'react-icons/fi';
import { apiService, User } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const v = localStorage.getItem('scopify.theme');
        if (v === 'dark') return 'dark';
      } catch {}
    }
    return 'light';
  });

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener('click', onDocClick);
    return () => window.removeEventListener('click', onDocClick);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('scopify.theme', theme);
      } catch {}
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

  useEffect(() => {
    // Fetch current user when component mounts
    const loadUser = async () => {
      try {
        setLoading(true);
        if (apiService.isAuthenticated()) {
          const currentUser = await apiService.ensureCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        // If user loading fails, redirect to login
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [router]);

  function signOut() {
    try {
      apiService.logout();
      // Clear any additional storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('scopify.auth');
        sessionStorage.clear();
      }
    } catch (error) {
      console.error('Error clearing authentication data:', error);
    }

    // Redirect to the landing page
    router.push('/');
  }

  // Loading state
  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-gray-200 shadow-sm">
        <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
        <div className="hidden sm:block h-4 w-16 bg-gray-200 animate-pulse rounded"></div>
      </div>
    );
  }

  // If no user data, show login prompt
  if (!user) {
    return (
      <button
        onClick={() => router.push('/')}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
      >
        <span>Sign In</span>
      </button>
    );
  }

  const userInitials = apiService.getUserInitials(user);
  const displayName = apiService.getDisplayName(user);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-semibold text-sm">
          {userInitials}
        </div>
        <div className="hidden sm:block text-sm text-gray-700">
          {displayName}
        </div>
        <div className="hidden sm:block text-xs text-gray-500 capitalize">
          {user.role}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                {userInitials}
              </div>
              <div>
                <div className="font-medium text-gray-900 text-sm">{displayName}</div>
                <div className="text-xs text-gray-500">{user.email}</div>
                <div className="text-xs text-gray-400 capitalize">{user.role}</div>
              </div>
            </div>
          </div>
          <div className="py-2">
            <Link 
              href="/profile" 
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              <FiUser /> <span>View profile</span>
            </Link>
            <button
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              className="flex items-center gap-2 px-3 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-50"
            >
              {theme === 'dark' ? <FiSun /> : <FiMoon />} 
              <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-3 py-2 text-sm w-full text-left text-red-600 hover:bg-gray-50"
            >
              <FiLogOut /> <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
