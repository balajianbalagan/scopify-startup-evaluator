'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FiMenu,
  FiHome,
  FiPlusCircle,
  FiRepeat,
  FiGlobe,
  FiBriefcase,
  FiClock,
} from 'react-icons/fi';

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
    { label: 'Startups', icon: <FiHome size={20} />, href: '/startups/list' },
    { label: 'Add Startup', icon: <FiPlusCircle size={20} />, href: '/startups/add' },
    { label: 'Follow-ups', icon: <FiRepeat size={20} />, href: '/followups' },
    { label: 'News', icon: <FiGlobe size={20} />, href: '/news' },
    { label: 'Portfolio', icon: <FiBriefcase size={20} />, href: '/portfolio' },
    { label: 'Autopilot', icon: <FiClock size={20} />, href: '/autopilot' },
    { label: 'Schedule', icon: <FiClock size={20} />, href: '/schedule' },
  ];

  return (
    <aside
      className={`flex flex-col items-stretch transition-all duration-200 ease-in-out ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-xl min-h-[90vh] flex flex-col">
        {/* Logo/Brand */}
        <div className="flex items-center justify-between mb-4">
          <button
            aria-label="Toggle sidebar"
            onClick={() => setCollapsed((s) => !s)}
            className="h-10 w-10 rounded-lg flex items-center justify-center text-indigo-600 hover:bg-indigo-50 transition"
          >
            <FiMenu size={20} />
          </button>
          {!collapsed && (
            <div className="flex items-center gap-2 px-2">
              
              <span className="text-base text-indigo-700 font-semibold">Hi VC</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-2 space-y-1">
          {items.map((it, idx) => (
            <Link
              key={it.label}
              href={it.href}
              className={`
                group flex items-center gap-3 rounded-lg px-3 py-2 font-medium
                transition-colors duration-150
                ${collapsed ? 'justify-center' : ''}
                text-gray-700 hover:bg-indigo-50 hover:text-indigo-700
                focus:outline-none focus:ring-2 focus:ring-indigo-200
                relative
              `}
              style={{
                marginLeft: collapsed ? 0 : idx === 0 ? 0 : '2px',
              }}
            >
              <span
                className={`
                  flex items-center justify-center
                  ${collapsed ? 'mx-auto' : ''}
                  group-hover:text-indigo-700 transition
                `}
              >
                {it.icon}
              </span>
              {!collapsed && (
                <span className="text-sm tracking-wide">{it.label}</span>
              )}
              {/* Active indicator (optional, can be improved with router) */}
              {/* <span className="absolute left-0 h-6 w-1 bg-indigo-600 rounded-r-full opacity-0 group-hover:opacity-100"></span> */}
            </Link>
          ))}
        </nav>

        {/* Footer/Branding */}
        {!collapsed && (
          <div className="mt-auto pt-6 text-center">
            <div className="text-xs text-gray-400">
              <span className="font-semibold text-indigo-600">Scopify</span> &copy; {new Date().getFullYear()}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}