import './globals.css';
import React from 'react';
import ClientWrapper from '@/components/ClientWrapper';

export const metadata = {
  title: 'Scopify',
  description: 'AI Analyst for Startups — Scopify',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}