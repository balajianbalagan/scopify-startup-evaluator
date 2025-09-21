'use client';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import AnalysisView from '@/components/analysis/AnalysisView';
import { CompanyFlag, startupApiService  } from '@/lib/startupApi';
import { agentService } from '@/lib/agentService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import FlagsSummary from '@/components/analysis/FlagSummary';

type SectionKey = 1 | 2 | 3 | 4;

type Company = {
  id: number;
  company_name: string;
  ai_generated_info?: any;
  search_query?: string | null;
  search_timestamp?: string | null;
  requested_by_id?: number | null;
  pitch_deck_url?: string | null;
  benchmark_status?: string | null;
  benchmark_info?: string | null;
  dealnote_info?: string | null;
  deal_notes_status?: string | null;
  benchmark_job_id?: string | null;
  deal_notes_job_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type BenchmarkProgress = {
  job_id: string;
  status: string;
  current_step: string;
  progress_percentage: number;
  steps_completed: string[];
  total_steps: number;
  company: any;
  last_update: string;
  error: string | null;
  has_report: boolean;
  estimated_time_remaining: string | null;
};

type BenchmarkReport = {
  report: string;
  company: string;
  status: string;
  references: string[];
  reference_info: any;
};

export default function CompanyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number((params as any)?.id);

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<SectionKey>(1);

  const [progress, setProgress] = useState<BenchmarkProgress | null>(null);
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);


  const [flags, setFlags] = useState<CompanyFlag[]>([]);
   useEffect(() => {
    if (!company?.id) return;
    setLoading(true);
    startupApiService.getCompanyFlags(company.id)
      .then((data) => {
        setFlags(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Error fetching flags');
        setFlags([]);
      })
      .finally(() => setLoading(false));
  }, [company?.id]);

  function getBenchmarkJobId(company: Company | null): string | null {
    return company?.ai_generated_info?.benchmark_job_id || company?.benchmark_job_id || null;
  }

  const sections: { key: SectionKey; label: string; icon: string }[] = useMemo(
    () => [
      { key: 1, label: 'Overview', icon: '🏠' },
      { key: 2, label: 'Benchmarks', icon: '📐' },
      { key: 3, label: 'Flags', icon: '🚩' },
      { key: 4, label: 'Review & Publish', icon: '✅' },
    ],
    []
  );

  function getStoredBenchmarkReport(company: Company | null): string | null {
    return company?.benchmark_info ?? null;
  }

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

  useEffect(() => {
    // Only poll if section is 2 and company is loaded
    if (section !== 2 || !company) {
      setProgress(null);
      setReport(null);
      setProgressError(null);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    const storedReport = getStoredBenchmarkReport(company);
    if (storedReport) {
      setReport({
        report: storedReport,
        company: company.company_name,
        status: 'completed',
        references: [],
        reference_info: {},
      });
      setProgress(null);
      setProgressError(null);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    let stopped = false;
    const jobId = getBenchmarkJobId(company);
    if (!jobId) {
      setProgressError('No benchmark job found for this company.');
      return;
    }

    async function pollProgress() {
      try {
        setProgressError(null);
        const prog = await agentService.getBenchmarkResearchProgress(jobId, company.id);
        setProgress(prog);

        if (prog.status === 'completed' && prog.has_report) {
          // Stop polling and fetch report
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          const rep = await agentService.getBenchmarkResearchReport(jobId);
          setReport(rep);

          try {
            await startupApiService.updateCompanyInfo(company.id, {
              benchmark_info: rep.report,
            });
            const updated = await startupApiService.getCompanySearch(company.id);
            setCompany(updated as Company);
          } catch (e: any) {
            console.error('Failed to save benchmark report:', e);
          }
        }
      } catch (e: any) {
        setProgressError(e?.message || 'Failed to fetch benchmark progress');
      }
    }

    pollProgress();
    pollRef.current = setInterval(() => {
      if (!stopped) pollProgress();
    }, 10000);

    return () => {
      stopped = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [section, company]);

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
              <p className="text-sm text-gray-500 mb-4">ARR vs peers, burn multiple, CAC/LTV</p>
              {progressError && (
                <div className="mb-3 text-red-600 text-sm">{progressError}</div>
              )}
              {!progress && !report && !progressError && (
                <div className="text-gray-500 text-sm">Loading benchmark progress…</div>
              )}
              {progress && !report && (
                <div>
                  <div className="mb-2 font-medium">
                    Status: <span className="capitalize">{progress.status}</span>
                  </div>
                  <div className="mb-2 text-sm text-gray-600">
                    Current step: {progress.current_step}
                  </div>
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-indigo-600 h-4 rounded-full transition-all"
                        style={{ width: `${progress.progress_percentage}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {progress.progress_percentage}% complete
                      {progress.estimated_time_remaining && (
                        <> &middot; Est. time left: {progress.estimated_time_remaining}</>
                      )}
                    </div>
                  </div>
                  <div className="mb-2 text-xs text-gray-500">
                    Steps completed: {progress.steps_completed?.join(', ')}
                  </div>
                  <div className="mb-2 text-xs text-gray-500">
                    Last update: {new Date(progress.last_update).toLocaleString()}
                  </div>
                </div>
              )}
              {report && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Benchmark Report</h3>
                  <div className="prose lg:prose-xl max-w-none mb-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {report.report}
                    </ReactMarkdown>
                  </div>
                  {report.references && report.references.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">References</h4>
                      <ul className="list-disc ml-6">
                        {report.references.map((ref, idx) => (
                          <li key={idx}>
                            <a
                              href={ref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-700 underline break-all"
                            >
                              {ref}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {section === 3 && (
            <div className="p-5 bg-white border rounded-2xl shadow-sm">
              <h2 className="font-semibold mb-2">3 — Flags</h2>
              <p className="text-sm text-gray-500">Resolve metric mismatches and mark risks</p>
              <div className="mt-4 flex gap-2">
                <FlagsSummary companyName={company.company_name} flags={flags} />

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