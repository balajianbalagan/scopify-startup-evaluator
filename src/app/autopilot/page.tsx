// src/app/autopilot/page.tsx
'use client';
import React from 'react';

export default function AutopilotPage() {
  return (
    <div className="min-h-[70vh] bg-gray-50 p-6 rounded-lg">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Autopilot Mode</h1>
        <p className="text-sm text-gray-500">Automated monitoring and anomaly detection</p>
      </div>

      <div className="space-y-3">
        <div className="border rounded-xl p-4 bg-white">Alert: ExampleAI ARR dropped 12% vs forecast</div>
        <div className="border rounded-xl p-4 bg-white">Alert: Competitor launched new product</div>
      </div>
    </div>
  );
}
