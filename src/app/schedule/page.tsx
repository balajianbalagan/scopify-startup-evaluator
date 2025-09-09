// src/app/schedule/page.tsx
'use client';
import React from 'react';

export default function SchedulePage() {
  return (
    <div className="min-h-[70vh] bg-gray-50 p-6 rounded-lg">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <p className="text-sm text-gray-500">Calls, meetings and reminders</p>
      </div>

      <div className="border rounded-xl p-4 bg-white">
        <div className="text-sm text-gray-600">Integrate with Google Calendar or FullCalendar here.</div>
        <div className="mt-4">• Tue 10:00 — Call with ExampleAI (Founder)</div>
        <div className="mt-2">• Wed 16:00 — Reference check</div>
      </div>
    </div>
  );
}
