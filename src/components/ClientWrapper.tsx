"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import LandingPage from '@/components/landingPage/LandingPage';
import CopilotSidebar from '@/components/copilot/CopilotSidebar';
import LeftSidebar from '@/components/nav/LeftSidebar';
import Profilemenu from '@/components/nav/Profilemenu';
import SignUp from './landingPage/SignUp';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Check if the user is on the landing page route
  const isLandingPage = pathname === '/';
  const isSignUpPage = pathname === '/signup';

  if (isLandingPage) {
    return <LandingPage />;
  }

  if (isSignUpPage) {
    return <SignUp />;
  }
  
  return (
    <>
      {isLandingPage ? (
        <LandingPage />
      ) : (
        <>
          <header className="bg-white border-b border-gray-200">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="font-bold text-indigo-600 text-lg">Scopify</div>
                <div className="text-sm text-gray-500 hidden sm:block">AI Analyst for Startups</div>
              </div>

              {/* Profile menu */}
              <div className="flex items-center gap-3">
                <Profilemenu />
              </div>
            </div>
          </header>

          <main className="p-6">
            <div className="flex gap-6">
              {/* Left collapsible sidebar */}
              <LeftSidebar />

              {/* main app content */}
              <div className="flex-1 min-h-[60vh]">{children}</div>
            </div>
          </main>
        </>
      )}
    </>
  );
}