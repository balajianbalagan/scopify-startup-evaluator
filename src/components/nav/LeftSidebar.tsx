// src/components/nav/LeftSidebar.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiMenu, FiHome, FiPlusCircle, FiRepeat, FiGlobe, FiBriefcase, FiClock } from 'react-icons/fi';

type NavItem = {
  label: string;
  icon: React.ReactElement;
  href: string;
};

export default function LeftSidebar() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('scopify.sidebar.collapsed');
      return v === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('scopify.sidebar.collapsed', collapsed ? '1' : '0');
    } catch {}
  }, [collapsed]);

  const items: NavItem[] = [
    { label: 'Startups', icon: <FiHome size={18} />, href: '/startups/list' },
    { label: 'Add Startup', icon: <FiPlusCircle size={18} />, href: '/startups/add' },
    { label: 'Follow-ups', icon: <FiRepeat size={18} />, href: '/followups' },
    { label: 'News', icon: <FiGlobe size={18} />, href: '/news' },
    { label: 'Portfolio', icon: <FiBriefcase size={18} />, href: '/portfolio' },
    { label: 'Autopilot', icon: <FiClock size={18} />, href: '/autopilot' },
    { label: 'Schedule', icon: <FiClock size={18} />, href: '/schedule' },
  ];

  return (
    <aside
      className={`flex flex-col items-stretch transition-all duration-200 ease-in-out ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      <div className="bg-white border border-gray-200 rounded-2xl p-2">
        <div className="flex items-center justify-between">
          <button
            aria-label="Toggle sidebar"
            onClick={() => setCollapsed((s) => !s)}
            className="h-10 w-10 rounded-lg flex items-center justify-center text-gray-700 hover:bg-gray-50"
          >
            <FiMenu size={18} />
          </button>

          {!collapsed && <div className="text-sm text-gray-600 font-medium px-2">Hi VC</div>}
        </div>

        <nav className="mt-4 space-y-2">
          {items.map((it) => (
            <Link
              key={it.label}
              href={it.href}
              className={`flex items-center gap-3 rounded-md px-2 py-2 hover:bg-indigo-50 hover:text-indigo-700 ${collapsed ? 'justify-center' : ''}`}
            >
              <span className="text-gray-700">{it.icon}</span>
              {!collapsed && <span className="text-sm">{it.label}</span>}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
