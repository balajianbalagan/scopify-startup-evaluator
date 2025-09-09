// src/app/startups/list/page.tsx
'use client';
import React, { useState } from 'react';
import Link from 'next/link';

export default function StartupsListPage() {
  const [query, setQuery] = useState('');
  const mock = Array.from({ length: 9 }).map((_, i) => ({
    id: `s-${i + 1}`,
    name: `ExampleAI ${i + 1}`,
    sector: i % 2 ? 'SaaS' : 'Marketplace',
    stage: 'Seed',
    arr: `$${(i + 1) * 250}k`,
  }));

  const items = mock.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="min-h-[70vh] bg-gray-50 p-6 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Find Startups</h1>
          <p className="text-sm text-gray-500">Search & filter ingested startups</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search startups..."
            className="border border-gray-300 rounded-md px-3 py-2"
          />
          <Link href="/startups/add" className="inline-flex items-center px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Add Startup </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {items.map((s) => (
          <div key={s.id} className="border border-gray-200 rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 bg-indigo-50 rounded-md flex items-center justify-center font-semibold text-indigo-700">
                {s.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{s.name}</h3>
                  <div className="text-xs text-gray-500">{s.stage}</div>
                </div>
                <div className="text-sm text-gray-600">{s.sector} · {s.arr}</div>

                <div className="mt-4 flex items-center gap-2">
                  <Link href={`/startups/${s.id}`} className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 text-sm">View
                  </Link>
                  <button className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm">Quick Compare</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
