// src/app/startups/[id]/page.tsx
'use client';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StartupViewPage() {
  // note: in app router, useParams is different; using simple fallback:
  const params = typeof window !== 'undefined' ? new URLSearchParams(location.pathname) : null; // placeholder
  // We'll use useRouter to access pathname (simple demo)
  const router = useRouter();
  const path = (typeof window !== 'undefined' && window.location.pathname) || '';
  const id = path.split('/').pop() || 's-1';

  return (
    <div className="min-h-[70vh] bg-gray-50 p-6 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">ExampleAI — {id}</h1>
          <p className="text-sm text-gray-500">SaaS · Seed · Bengaluru</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/startups/list" className="text-sm text-indigo-600">← Back to list</Link>
          <button className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm">Edit</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <section className="col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-xl p-4 bg-white">Company Info (one-liner, logo, website)</div>
            <div className="border rounded-xl p-4 bg-white">Founder Assessment</div>
            <div className="border rounded-xl p-4 bg-white">Traction & Metrics</div>
            <div className="border rounded-xl p-4 bg-white">Product & Tech</div>
          </div>

          <div className="mt-6 border rounded-xl p-4 bg-white">
            <h3 className="font-semibold mb-2">Deal Note</h3>
            <p className="text-sm text-gray-600">Auto-generated summary and editable recommendation.</p>
          </div>
        </section>

        <aside className="col-span-1 space-y-4">
          <div className="border rounded-xl p-4 bg-white">Benchmarks</div>
          <div className="border rounded-xl p-4 bg-white">Flags & Issues</div>
          <div className="border rounded-xl p-4 bg-white">Quick Actions</div>
        </aside>
      </div>
    </div>
  );
}
