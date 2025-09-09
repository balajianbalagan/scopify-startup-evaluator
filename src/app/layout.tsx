// src/app/layout.tsx
import './globals.css';
import React from 'react';
import CopilotSidebar from '@/components/copilot/CopilotSidebar';

export const metadata = {
  title: 'Scopify',
  description: 'AI Analyst for Startups — Scopify',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <header className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="font-bold text-indigo-600 text-lg">Scopify</div>
              <div className="text-sm text-gray-500">AI Analyst for Startups</div>
            </div>

            <nav className="flex items-center gap-3 text-sm text-gray-600">
              <a className="hover:text-indigo-600" href="/startups/list">Startups</a>
              <a className="hover:text-indigo-600" href="/startups/add">Add</a>
              <a className="hover:text-indigo-600" href="/followups">Follow-ups</a>
              <a className="hover:text-indigo-600" href="/news">News</a>
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-6">
          <div className="flex gap-6">
            {/* main app content */}
            <div className="flex-1 min-h-[60vh]">{children}</div>

            {/* persistent Copilot */}
            <div className="hidden lg:block">
              <CopilotSidebar />
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
