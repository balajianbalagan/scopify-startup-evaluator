// src/app/portfolio/page.tsx
'use client';
import React from 'react';

export default function PortfolioPage() {
  return (
    <div className="min-h-[70vh] bg-gray-50 p-6 rounded-lg">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Portfolio</h1>
        <p className="text-sm text-gray-500">Overview of invested companies</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-xl p-4 bg-white">Portfolio company A — ARR $3.2M</div>
        <div className="border rounded-xl p-4 bg-white">Portfolio company B — ARR $800k</div>
        <div className="border rounded-xl p-4 bg-white">Portfolio company C — ARR $120k</div>
      </div>
    </div>
  );
}
