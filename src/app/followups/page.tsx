// src/app/followups/page.tsx
'use client';
import React from 'react';
import Link from 'next/link';

export default function FollowupsPage() {
  return (
    <div className="min-h-[70vh] bg-gray-50 p-6 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Follow-ups</h1>
          <p className="text-sm text-gray-500">Outstanding diligence tasks & reminders</p>
        </div>
       <Link href="/startups/list" className="text-sm text-indigo-600">Cancel</Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-xl p-4 bg-white">Pending: Request churn data (ExampleAI)</div>
        <div className="border rounded-xl p-4 bg-white">Pending: Founder reference check</div>
        <div className="border rounded-xl p-4 bg-white">Pending: Cap table clarification</div>
        <div className="border rounded-xl p-4 bg-white">Pending: Demo with product team</div>
      </div>
    </div>
  );
}
