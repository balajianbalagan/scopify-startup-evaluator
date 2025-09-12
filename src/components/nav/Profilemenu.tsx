// src/components/nav/ProfileMenu.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FiUser, FiLogOut, FiSun, FiMoon } from 'react-icons/fi';

export default function Profilemenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const v = localStorage.getItem('scopify.theme');
      if (v === 'dark') return 'dark';
    } catch {}
    // default: system / light
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
    try {
      localStorage.setItem('scopify.theme', theme);
    } catch {}
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  function signOut() {
    // Clear user authentication data
    try {
      localStorage.removeItem('scopify.auth'); // Example: Remove auth token
      sessionStorage.clear(); // Clear session storage
    } catch (error) {
      console.error('Error clearing authentication data:', error);
    }

    // Redirect to the landing page
    window.location.href = '/';
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-semibold">VC</div>
        <div className="hidden sm:block text-sm text-gray-700">Balaji</div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="py-2">
            <Link href="/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <FiUser /> <span>View profile</span>
            </Link>
            <button
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              className="flex items-center gap-2 px-3 py-2 text-sm w-full text-gray-700 hover:bg-gray-50"
            >
              {theme === 'dark' ? <FiSun /> : <FiMoon />} <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-3 py-2 text-sm w-full text-red-600 hover:bg-gray-50"
            >
              <FiLogOut /> <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
