'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import AnalysisView from '@/components/analysis/AnalysisView';
import { startupApiService } from '@/lib/startupApi';

type SectionKey = 1 | 2 | 3 | 4;

type Company = {
  id: number;
  company_name: string;
  search_query?: string | null;
  search_timestamp?: string | null;
  requested_by_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  ai_generated_info?: any;
};

export default function CompanyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number((params as any)?.id);

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<SectionKey>(1);

  const sections: { key: SectionKey; label: string; icon: string }[] = useMemo(
    () => [
      { key: 1, label: 'Overview', icon: '🏠' },
      { key: 2, label: 'Benchmarks', icon: '📐' },
      { key: 3, label: 'Flags', icon: '🚩' },
      { key: 4, label: 'Review & Publish', icon: '✅' },
    ],
    []
  );

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!Number.isFinite(id)) {
        setError('Invalid company id');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Use the company search endpoint by id
        const data = await startupApiService.getCompanySearch(id);

        if (!mounted) return;

        if (!data) {
          setError('Company not found');
          setCompany(null);
        } else {
          setCompany(data as Company);
        }
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load company');
        setCompany(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] p-6 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow px-4 py-3 inline-flex items-center gap-3 border">
          <span className="inline-block h-5 w-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <span className="text-sm font-medium text-gray-900">Loading company…</span>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-[60vh] p-6">
        <div className="p-6 bg-white border rounded-xl">
          <div className="text-lg font-semibold">{error || 'Company not found'}</div>
          <Link href="/companies" className="mt-2 inline-block text-indigo-600">
            ← Back to Companies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] bg-gray-50 p-6 rounded-lg">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{company.company_name}</h1>
          <p className="text-sm text-gray-500">Details and AI analysis</p>
        </div>
        <button
          onClick={() => router.push('/companies')}
          className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50"
        >
          ← Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Section navigation */}
        <aside className="lg:col-span-1 p-4 bg-white border rounded-2xl shadow-sm lg:sticky lg:top-6">
          <nav className="flex flex-col gap-1">
            {sections.map((s) => {
              const active = section === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setSection(s.key)}
                  className={[
                    'w-full text-left px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 transition',
                    active
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      : 'hover:bg-gray-50 text-gray-700 border border-transparent',
                  ].join(' ')}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="text-base">{s.icon}</span>
                  <span className="font-medium">{s.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right: Content */}
        <div className="lg:col-span-4">
          {section === 1 && (
            <AnalysisView
              data={company.ai_generated_info ?? {}}
              onBack={() => router.push('/companies')}
            />
          )}

          {section === 2 && (
            <div className="p-5 bg-white border rounded-2xl shadow-sm">
              <h2 className="font-semibold mb-2">2 — Benchmarks</h2>
              <p className="text-sm text-gray-500">ARR vs peers, burn multiple, CAC/LTV</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setSection(1)} className="px-3 py-1.5 border rounded-md">
                  Back
                </button>
                <button
                  onClick={() => setSection(3)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md"
                >
                  Next: Flags
                </button>
              </div>
            </div>
          )}

          {section === 3 && (
            <div className="p-5 bg-white border rounded-2xl shadow-sm">
              <h2 className="font-semibold mb-2">3 — Flags</h2>
              <p className="text-sm text-gray-500">Resolve metric mismatches and mark risks</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setSection(2)} className="px-3 py-1.5 border rounded-md">
                  Back
                </button>
                <button
                  onClick={() => setSection(4)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md"
                >
                  Next: Review
                </button>
              </div>
            </div>
          )}

          {section === 4 && (
            <div className="p-5 bg-white border rounded-2xl shadow-sm">
              <h2 className="font-semibold mb-2">4 — Review & Publish</h2>
              <p className="text-sm text-gray-500">Edit deal note and publish to the platform</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setSection(3)} className="px-3 py-1.5 border rounded-md">
                  Back
                </button>
                <button className="px-4 py-2 bg-emerald-600 text-white rounded-md">Publish</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}