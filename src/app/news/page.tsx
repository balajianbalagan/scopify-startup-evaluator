// src/app/news/page.tsx
'use client';
import React from 'react';

const news = [
  { title: 'AI startup raises $12M', source: 'TechCrunch', time: '2h' },
  { title: 'New regulation affecting fintech', source: 'FT', time: '1d' },
];

export default function NewsPage() {
  return (
    <div className="min-h-[70vh] bg-gray-50 p-6 rounded-lg">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">News Agent</h1>
        <p className="text-sm text-gray-500">Real-time news & AI summaries</p>
      </div>

      <div className="space-y-3">
        {news.map((n, idx) => (
          <div key={idx} className="border rounded-xl p-4 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{n.title}</div>
                <div className="text-xs text-gray-500">{n.source} · {n.time}</div>
              </div>
              <button className="px-3 py-1.5 rounded-md border">Summarize</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
