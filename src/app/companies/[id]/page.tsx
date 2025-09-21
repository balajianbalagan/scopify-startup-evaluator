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
import { MarkdownUI } from "@markdown-ui/react";
import { Marked } from "marked";
import { markedUiExtension } from "@markdown-ui/marked-ext";

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

const marked = new Marked().use(markedUiExtension);

function parseMarkdownByH1H2(md: string): {
  h1: string | null;
  intro: string; // content between H1 and first H2 (not shown in slides)
  sections: { heading: string; body: string }[];
} {
  const lines = (md || '').split(/\r?\n/);

  // Find first non-empty line that's an H1
  let h1: string | null = null;
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) continue;
    const m = l.match(/^#\s+(.*)$/);
    if (m) {
      h1 = m[1].trim();
      startIdx = i + 1; // content after H1
    } else {
      // if first non-empty isn't H1, start from here
      startIdx = i;
    }
    break;
  }

  // Collect intro (between H1 and first H2)
  const introLines: string[] = [];
  let i = startIdx;
  while (i < lines.length && !/^##\s+/.test(lines[i])) {
    introLines.push(lines[i]);
    i++;
  }

  // Collect H2 sections
  const sections: { heading: string; body: string }[] = [];
  let current: { heading: string; body: string } | null = null;
  for (; i < lines.length; i++) {
    const line = lines[i];
    const h2Match = line.match(/^##\s+(.*)$/);
    if (h2Match) {
      if (current) sections.push(current);
      current = { heading: h2Match[1].trim(), body: '' };
    } else if (current) {
      current.body += (current.body ? '\n' : '') + line;
    }
  }
  if (current) sections.push(current);

  return { h1, intro: introLines.join('\n').trim(), sections };
}

export default function CompanyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number((params as any)?.id);

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<SectionKey>(1);
  const [slideIndex, setSlideIndex] = useState(0);
  const [html, setHtml] = useState<string | null>(null);

  const [progress, setProgress] = useState<BenchmarkProgress | null>(null);
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [startingBenchmark, setStartingBenchmark] = useState(false);
  const startingBenchmarkRef = useRef(false);

  // Fake progress state (UI only)
  const FAKE_TOTAL_MS = 90_000; // 1.5 minutes
  const fakeStartRef = useRef<number | null>(null);
  const fakeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [fakeProgress, setFakeProgress] = useState(0); // 0..100
  const [fakeStepIndex, setFakeStepIndex] = useState(0);
  const [fakeETAms, setFakeETAms] = useState(FAKE_TOTAL_MS);
  const [fakeRunning, setFakeRunning] = useState(false);

  // Session persistence helpers for fake progress
  type FakePersisted = {
    companyId: number;
    jobId: string | null;
    startTs: number; // epoch ms when fake progress started
    lastPct: number; // last progress percentage
    stepIndex: number; // last step index
    updatedAt: number; // epoch ms when last updated
    completed?: boolean;
  };

  function getFakeKey(companyId?: number, jobId?: string | null) {
    if (!companyId) return null;
    return `benchmark-fake-progress:${companyId}:${jobId ?? 'nojob'}`;
  }

  function saveFakeState(state: FakePersisted) {
    try {
      const key = getFakeKey(state.companyId, state.jobId);
      if (!key) return;
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }

  function loadFakeState(companyId?: number, jobId?: string | null): FakePersisted | null {
    try {
      const key = getFakeKey(companyId, jobId);
      if (!key) return null;
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as FakePersisted;
      if (parsed && parsed.companyId === companyId && parsed.jobId === jobId) return parsed;
      return null;
    } catch {
      return null;
    }
  }

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const parsedReport = useMemo(() => {
    if (!report?.report) return null;
    return parseMarkdownByH1H2(report.report);
  }, [report?.report]);

  // Steps for the UI-driven fake progress
  const FAKE_STEPS = useMemo(
    () => [
      {
        name: 'initialization',
        display_name: 'Initialization',
        description: 'Setting up benchmark analysis',
        progress: 0,
        status: 'completed',
      },
      {
        name: 'setup',
        display_name: 'Setup',
        description: 'Extracting company information',
        progress: 10,
        status: 'completed',
      },
      {
        name: 'collector',
        display_name: 'Data Collection',
        description: 'Gathering initial research data',
        progress: 15,
        status: 'completed',
      },
      {
        name: 'companies_products_analyst',
        display_name: 'Competitive Analysis',
        description: 'Analyzing market leaders and direct competitors',
        progress: 25,
        status: 'completed',
      },
      {
        name: 'consumer_brands_analyst',
        display_name: 'Consumer Insights',
        description: 'Analyzing consumer behavior and brand sentiment',
        progress: 35,
        status: 'completed',
      },
      {
        name: 'countries_regions_analyst',
        display_name: 'Regional Analysis',
        description: 'Analyzing geographic markets and economics',
        progress: 45,
        status: 'completed',
      },
      {
        name: 'digital_trends_analyst',
        display_name: 'Technology Trends',
        description: 'Analyzing digital transformation and tech adoption',
        progress: 55,
        status: 'completed',
      },
      {
        name: 'industries_markets_analyst',
        display_name: 'Market Intelligence',
        description: 'Analyzing industry dynamics and market size',
        progress: 65,
        status: 'completed',
      },
      {
        name: 'politics_society_analyst',
        display_name: 'Political Context',
        description: 'Analyzing political and social factors',
        progress: 75,
        status: 'completed',
      },
      {
        name: 'curator',
        display_name: 'Data Curation',
        description: 'Processing and organizing research data',
        progress: 80,
        status: 'completed',
      },
      {
        name: 'enricher',
        display_name: 'Data Enrichment',
        description: 'Enriching analysis with additional insights',
        progress: 85,
        status: 'completed',
      },
      {
        name: 'briefing',
        display_name: 'Briefing Generation',
        description: 'Creating analytical briefings',
        progress: 90,
        status: 'completed',
      },
      {
        name: 'editor',
        display_name: 'Report Compilation',
        description: 'Compiling final benchmark report',
        progress: 95,
        status: 'completed',
      },
      {
        name: 'completed',
        display_name: 'Completed',
        description: 'Benchmark analysis finished',
        progress: 100,
        status: 'completed',
      },
    ],
    []
  );

  function getStepIndexForProgress(pct: number) {
    let idx = 0;
    for (let i = 0; i < FAKE_STEPS.length; i++) {
      if (pct >= FAKE_STEPS[i].progress) idx = i;
      else break;
    }
    return idx;
  }
  
  function formatETA(ms: number) {
    const clamped = Math.max(0, ms);
    const s = Math.ceil(clamped / 1000);
    const mm = Math.floor(s / 60)
      .toString()
      .padStart(2, '0');
    const ss = Math.floor(s % 60)
      .toString()
      .padStart(2, '0');
    return `${mm}:${ss}`;
  }

  const slides = useMemo(() => {
    if (!report?.report) return [];
    if (!parsedReport) return [report.report];

    if (parsedReport.sections.length > 0) {
      return parsedReport.sections.map(
        (s) => `## ${s.heading}\n${s.body || ''}`
      );
    }

    // Fallback: no H2s — use report content minus the first H1 line
    const withoutH1 = report.report.replace(/^#\s+.*\n?/, '');
    return [withoutH1.trim() || report.report];
  }, [parsedReport, report?.report]);

  useEffect(() => {
    setSlideIndex(0);
  }, [report?.report]);


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
      { key: 4, label: 'Generate Deal Note', icon: '✅' },
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
      // stop fake progress
      if (fakeTimerRef.current) {
        clearInterval(fakeTimerRef.current);
        fakeTimerRef.current = null;
      }
      fakeStartRef.current = null;
      setFakeProgress(0);
      setFakeStepIndex(0);
      setFakeETAms(FAKE_TOTAL_MS);
      setFakeRunning(false);
      // do not clear session storage so user can come back and resume
      return;
    }

    const storedReport = getStoredBenchmarkReport(company);
    console.log('storedReport', { storedReport });
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
      if (!startingBenchmarkRef.current) {
        startingBenchmarkRef.current = true;
        setStartingBenchmark(true);
        (async () => {
          try {
            const payload = company.ai_generated_info ?? {};
            await agentService.benchmarkResearch(payload, company.id);
            const updated = await startupApiService.getCompanySearch(company.id);
            setCompany(updated as Company);
            setProgressError(null);
          } catch (e: any) {
            setProgressError(e?.message || 'Failed to start benchmark');
          } finally {
            setStartingBenchmark(false);
            startingBenchmarkRef.current = false;
          }
        })();
      }
      return;
    }

    async function pollProgress() {
      try {
        setProgressError(null);
        const prog = await agentService.getBenchmarkResearchProgress(jobId, company.id);
        setProgress(prog);

        // If backend hits 100%, snap UI progress to 100 immediately
        if (typeof prog.progress_percentage === 'number' && prog.progress_percentage >= 100) {
          setFakeProgress(100);
          setFakeStepIndex(FAKE_STEPS.length - 1);
          setFakeETAms(0);
          setFakeRunning(false);
          if (fakeTimerRef.current) {
            clearInterval(fakeTimerRef.current);
            fakeTimerRef.current = null;
          }
          // persist completion state
          const persisted: FakePersisted = {
            companyId: company.id,
            jobId,
            startTs: fakeStartRef.current ?? Date.now(),
            lastPct: 100,
            stepIndex: FAKE_STEPS.length - 1,
            updatedAt: Date.now(),
            completed: true,
          };
          saveFakeState(persisted);
        }

        if (prog.status === 'completed' && prog.has_report) {
          // Stop polling and fetch report
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          // Snap fake progress to 100% upon completion
          setFakeProgress(100);
          setFakeStepIndex(FAKE_STEPS.length - 1);
          setFakeETAms(0);
          setFakeRunning(false);
          if (fakeTimerRef.current) {
            clearInterval(fakeTimerRef.current);
            fakeTimerRef.current = null;
          }
          const rep = await agentService.getBenchmarkResearchReport(jobId);

          const urlRegex = /(https?:\/\/[^\s\)\]]+)/gi;
          const existingUrls = new Set(
            Array.from(rep.report.matchAll(urlRegex), (m) => m[0].toLowerCase())
          );

          const extraRefs = (rep.references ?? []).filter(
            (u) => u && !existingUrls.has(u.toLowerCase())
          );

          const hasReferencesHeading = /(^|\n)##\s+References\s*(\n|$)/i.test(rep.report);
          const extraRefsMarkdown =
            extraRefs.length > 0
              ? (hasReferencesHeading
                  ? `\n${extraRefs.map((ref) => `* [${ref}](${ref})`).join('\n')}`
                  : `\n\n## References\n${extraRefs.map((ref) => `* [${ref}](${ref})`).join('\n')}`)
              : '';

          const combinedMarkdown = `${rep.report}${extraRefsMarkdown}`;
          const parsedHtml = await marked.parse(combinedMarkdown);
          setHtml(parsedHtml);

          setReport({
            ...rep,
            report: combinedMarkdown,
            references: [],
          });

          try {
            await startupApiService.updateCompanyInfo(company.id, {
              benchmark_info: combinedMarkdown,
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

  // Start/animate fake progress when we have a job in progress and no report yet
  useEffect(() => {
    const shouldRunFake = section === 2 && !!progress && !report;
    if (!shouldRunFake) return;

    // Determine jobId to use as part of the key
    const jobId = progress?.job_id || getBenchmarkJobId(company) || null;

    // Initialize from persisted state if available
    if (!fakeStartRef.current) {
      const persisted = loadFakeState(company?.id, jobId);
      if (persisted && !persisted.completed) {
        fakeStartRef.current = persisted.startTs;
        setFakeProgress(persisted.lastPct ?? 0);
        setFakeStepIndex(persisted.stepIndex ?? getStepIndexForProgress(persisted.lastPct ?? 0));
        const elapsed = Date.now() - persisted.startTs;
        setFakeETAms(Math.max(0, FAKE_TOTAL_MS - elapsed));
      } else {
        fakeStartRef.current = Date.now();
        // save initial state
        saveFakeState({
          companyId: company!.id,
          jobId,
          startTs: fakeStartRef.current,
          lastPct: 0,
          stepIndex: 0,
          updatedAt: Date.now(),
        });
      }
      setFakeRunning(true);
    }

    // Ensure any existing timer is cleared
    if (fakeTimerRef.current) {
      clearInterval(fakeTimerRef.current);
      fakeTimerRef.current = null;
    }

    // Animate smoothly every 200ms
    fakeTimerRef.current = setInterval(() => {
      if (!fakeStartRef.current) return;
      const elapsed = Date.now() - fakeStartRef.current;
      const ratio = Math.min(elapsed / FAKE_TOTAL_MS, 0.985); // cap at 98.5% until real completion
      const pct = Math.max(0, Math.min(100, Math.floor(ratio * 100)));

      setFakeProgress((prev) => (pct > prev ? pct : prev));
      const idx = getStepIndexForProgress(pct);
      setFakeStepIndex(idx);
      setFakeETAms(FAKE_TOTAL_MS - elapsed);

      // persist progress state
      const jobIdLocal = progress?.job_id || getBenchmarkJobId(company) || null;
      saveFakeState({
        companyId: company!.id,
        jobId: jobIdLocal,
        startTs: fakeStartRef.current,
        lastPct: pct,
        stepIndex: idx,
        updatedAt: Date.now(),
        completed: false,
      });
    }, 200);

    return () => {
      if (fakeTimerRef.current) {
        clearInterval(fakeTimerRef.current);
        fakeTimerRef.current = null;
      }
    };
  }, [section, progress, report]);

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
        <aside className="lg:col-span-1 p-4 bg-white border rounded-2xl shadow-sm lg:top-6 lg:max-h-[120vh] overflow-auto nice-scroll">
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
            <div className="bg-white border rounded-2xl shadow-sm h-[100vh] flex flex-col overflow-hidden">
              <div className="p-5 sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b">
                <h2 className="font-semibold">1 — Overview</h2>
                <p className="text-sm text-gray-500">Details and AI analysis</p>
              </div>
              <div className="flex-1 overflow-auto nice-scroll p-5">
                <AnalysisView
                  data={company.ai_generated_info ?? {}}
                  onBack={() => router.push('/companies')}
                />
              </div>
            </div>
          )}

          {section === 2 && (
            <div className="bg-white border rounded-2xl shadow-sm h-[100vh] flex flex-col overflow-hidden">
              <div className="p-5 sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b">
                <h2 className="font-semibold">2 — Benchmarks</h2>
                <p className="text-sm text-gray-500">ARR vs peers, burn multiple, CAC/LTV</p>
                {progressError && ( 
                  <div className="mt-2 text-red-600 text-sm">{progressError}</div>
                )}
                {!progress && !report && !progressError && (
                  <div className="mt-2 text-gray-500 text-sm">Loading benchmark progress…</div>
                )}
              </div>
              <div className="mt-2 flex-1 pr-1">
              {progress && !report && (
                <div className="px-[15px]">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="font-medium text-gray-900">
                      Status: <span className="capitalize">{progress.status}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      ETA: {formatETA(fakeETAms)}
                    </div>
                  </div>

                  {/* Current step */}
                  <div className="mb-2">
                    <div className="text-sm font-semibold text-gray-800">
                      {FAKE_STEPS[fakeStepIndex]?.display_name || 'Working…'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {FAKE_STEPS[fakeStepIndex]?.description}
                    </div>
                  </div>

                  {/* Fancy progress bar */}
                  <div className="mb-4">
                    <div className="relative w-full h-4 rounded-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 overflow-hidden shadow-inner">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                        style={{
                          width: `${fakeProgress}%`,
                          background:
                            'linear-gradient(90deg, rgba(79,70,229,1) 0%, rgba(147,51,234,1) 50%, rgba(236,72,153,1) 100%)',
                          boxShadow: '0 0 12px rgba(147,51,234,0.5)',
                        }}
                      />
                      {/* subtle animated sheen */}
                      <div className="absolute inset-0 animate-pulse opacity-10 bg-white" />
                      {/* centered static status label */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[10px] sm:text-xs font-semibold text-white drop-shadow">
                          {(progress?.status ?? 'processing').toString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-600 flex items-center justify-between">
                      <span className="font-medium">{fakeProgress}% complete</span>
                      <span>Step {fakeStepIndex + 1} of {FAKE_STEPS.length}</span>
                    </div>
                  </div>

                  {/* Inline step chips */}
                  <div className="flex flex-wrap gap-2">
                    {FAKE_STEPS.map((s, i) => {
                      const done = i < fakeStepIndex;
                      const current = i === fakeStepIndex;
                      return (
                        <div
                          key={s.name}
                          className={[
                            'px-2.5 py-1 rounded-full text-xs border transition',
                            done
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : current
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-gray-50 text-gray-500 border-gray-200',
                          ].join(' ')}
                          title={s.description}
                        >
                          {done ? '✓ ' : current ? '• ' : ''}
                          {s.display_name}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 text-[11px] text-gray-400">
                    Last update: {new Date(progress.last_update).toLocaleString()}
                  </div>
                </div>
              )}
              {report && (
                <div className="mt-2 h-full flex flex-col px-4 max-h-[790px]">

                  {/* Render ONLY H2 sections as slides */}
                  {slides.length > 0 && (
                    <div className="mt-2 border rounded-xl overflow-hidden bg-gray-50 flex-1 flex flex-col max-h-[960px]">
                      <div className="px-4 py-3 bg-white border-b flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 mb-1">
                            Section {slideIndex + 1} of {slides.length}
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-2 bg-indigo-600 transition-all"
                              style={{ width: `${((slideIndex + 1) / slides.length) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSlideIndex(i => Math.max(0, i - 1))}
                            disabled={slideIndex === 0}
                            className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50"
                          >
                            ← Prev
                          </button>
                          <button
                            onClick={() => setSlideIndex(i => Math.min(slides.length - 1, i + 1))}
                            disabled={slideIndex === slides.length - 1}
                            className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50"
                          >
                            Next →
                          </button>
                        </div>
                      </div>

                      <div className="relative w-full flex-1 min-h-0 overflow-hidden">
                        <div
                          className="flex transition-transform duration-300 ease-in-out h-full min-h-0 bg-white"
                          style={{ transform: `translateX(-${slideIndex * 100}%)` }}
                        >
                          {slides.map((md, idx) => (
                            <div key={idx} className="min-w-full h-full flex flex-col min-h-0 p-5">
                              <div className="prose prose-slate md:prose-lg max-w-none leading-relaxed prose-wrap
                                              prose-headings:font-semibold prose-headings:tracking-tight
                                              prose-a:text-indigo-700 hover:prose-a:opacity-80 prose-a:underline
                                              prose-img:rounded-lg prose-hr:my-6 bg-white rounded-lg p-0 border-0 flex-1 min-h-0">
                                <div className="h-full min-h-0 overflow-auto nice-scroll pr-1 text-sm">
                                  <MarkdownUI html={marked.parse(md)} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-2 py-3">
                        {slides.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setSlideIndex(i)}
                            className={[
                              'h-2.5 w-2.5 rounded-full transition',
                              i === slideIndex ? 'bg-indigo-600' : 'bg-gray-300 hover:bg-gray-400'
                            ].join(' ')}
                            aria-label={`Go to section ${i + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>
          )}

          {section === 3 && (
            <div className="bg-white border rounded-2xl shadow-sm h-[100vh] flex flex-col overflow-hidden">
              <div className="p-5 sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b">
                <h2 className="font-semibold">3 — Flags</h2>
                <p className="text-sm text-gray-500">Resolve metric mismatches and mark risks</p>
              </div>
              <div className="flex-1 overflow-auto nice-scroll p-5">
                <div className="flex gap-2">
                  <FlagsSummary companyName={company.company_name} flags={flags} />
                </div>
              </div>
            </div>
          )}

          {section === 4 && (
            <div className="bg-white border rounded-2xl shadow-sm h-[100vh] flex flex-col overflow-hidden">
              <div className="p-5 sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b">
                <h2 className="font-semibold">4 — Generate Deal Note</h2>
                <p className="text-sm text-gray-500">Generate AI powered deal note</p>
              </div>
              <div className="flex-1 overflow-auto nice-scroll p-5">
                <div className="mt-1 flex gap-2">
                  <button onClick={() => setSection(3)} className="px-3 py-1.5 border rounded-md">
                    Back
                  </button>
                  <button className="px-4 py-2 bg-emerald-600 text-white rounded-md">Generate</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}