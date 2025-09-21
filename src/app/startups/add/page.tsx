// src/app/startups/add/page.tsx
'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { agentService } from '@/lib/agentService';
import { useAuth } from '@/hooks/useAuth';
import AnalysisView from '@/components/analysis/AnalysisView';
import { startupApiService } from '@/lib/startupApi';
import { bigQueryService } from '@/lib/bigQueryServices';

export default function AddStartupEntry() {
  const [step, setStep] = useState<1 | 2>(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  // Only upload to BigQuery and return the response
  async function bigQueryFlow(pdf: File) {
    return bigQueryService.processDocument(pdf);
  }

  async function handleIngest() {
    setError(null);
    if (!file) {
      setError('Please choose a file first.');
      return;
    }

    try {
      setUploading(true);
      const userId = String(user?.id ?? 'anonymous');
      const sessionId = `sess-${Date.now()}`;

      // Run both in parallel with the same PDF
      const [result, bqRes] = await Promise.all([
        agentService.runSession(userId, sessionId, file),
        bigQueryFlow(file),
      ]);

      setAnalysis(result);

      // Build extras from BigQuery response
      const extras = {
        pitch_deck_url: (bqRes && bqRes.pitch_deck_url) || null,
        benchmark_status: 'not_started',
        deal_notes_status: 'not_started'
      };

      // Create company from analysis + extras and navigate
      try {
        const created = await startupApiService.createCompanyFromAnalysis(result, extras);
        if (created?.id) {
          try {
            await agentService.benchmarkResearch(result, created.id);
          } catch (e: any) {
            console.error('Benchmark research failed:', e);
          }
          router.push(`/companies/${created.id}`);
          return;
        }
      } catch (e: any) {
        console.error('Failed to create company from analysis:', e);
        setError(e?.message || 'Ingested, but failed to add company.');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to ingest pitch deck.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-[70vh] bg-gray-50 p-6 rounded-lg">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Add Startup</h1>
          <p className="text-sm text-gray-500">Upload pitch deck, then review the extracted analysis.</p>
        </div>
        <Link href="/startups/list" className="text-sm text-indigo-600">Cancel</Link>
      </div>

      <div className="bg-white border rounded-xl p-6">
        {step === 1 && (
          <div>
            <h2 className="font-semibold mb-2">1 — Ingest Pitch Deck</h2>
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="border border-gray-300 rounded-md p-2"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && <p className="text-xs text-gray-500 mt-2">Selected: {file.name}</p>}
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleIngest}
                disabled={!file || uploading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : 'Ingest Pitch Deck'}
              </button>
            </div>
            {uploading && (
              <div className="mt-8 flex flex-col items-center justify-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-6 w-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                  <span className="text-indigo-700 font-medium text-base">Processing your pitch deck…</span>
                </div>
                <div className="text-xs text-gray-500 text-center max-w-md">
                  This may take up to a minute. We're analyzing your document, extracting insights, and uploading to Database.<br />
                  Please don't close this tab.
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && analysis && (
          <AnalysisView data={analysis} onBack={() => setStep(1)} />
        )}
      </div>
    </div>
  );
}