// src/app/startups/add/page.tsx
'use client';
import React, { useState } from 'react';
import Link from 'next/link';

export default function AddStartupEntry() {
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-[70vh] bg-gray-50 p-6 rounded-lg">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Add Startup</h1>
          <p className="text-sm text-gray-500">Upload pitch deck, confirm extraction, review benchmarks & flags.</p>
        </div>
        <Link href="/startups/list" className="text-sm text-indigo-600">Cancel</Link>
      </div>

      <div className="bg-white border rounded-xl p-6">
        {step === 1 && (
          <div>
            <h2 className="font-semibold mb-2">1 — Ingest Pitch Deck</h2>
            <input type="file" className="border border-gray-300 rounded-md p-2" />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setStep(2)} className="px-4 py-2 bg-indigo-600 text-white rounded-md">Confirm & Next</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-semibold mb-2">2 — Benchmarks</h2>
            <p className="text-sm text-gray-500">ARR vs peers, burn multiple, CAC/LTV</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setStep(1)} className="px-3 py-1.5 border rounded-md">Back</button>
              <button onClick={() => setStep(3)} className="px-4 py-2 bg-indigo-600 text-white rounded-md">Next: Flags</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="font-semibold mb-2">3 — Flags</h2>
            <p className="text-sm text-gray-500">Resolve metric mismatches and mark risks</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setStep(2)} className="px-3 py-1.5 border rounded-md">Back</button>
              <button onClick={() => setStep(4)} className="px-4 py-2 bg-indigo-600 text-white rounded-md">Next: Review</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="font-semibold mb-2">4 — Review & Publish</h2>
            <p className="text-sm text-gray-500">Edit deal note and publish to the platform</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setStep(3)} className="px-3 py-1.5 border rounded-md">Back</button>
              <button className="px-4 py-2 bg-emerald-600 text-white rounded-md">Publish</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
