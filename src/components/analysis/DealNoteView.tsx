'use client';
import React, { useMemo, useState } from 'react';

type RiskItem = {
  risk_description: string;
  likelihood?: string | null;
  impact_assessment?: string | null;
  mitigation_status?: string | null;
};

type DueDiligenceItem = {
  area: string;
  specific_item: string;
  urgency?: string | null;
  complexity?: string | null;
  potential_impact?: string | null;
};

type InvestmentCondition = {
  condition_type: string;
  description: string;
  criticality?: string | null;
  verification_method?: string | null;
};

type InvestmentAnalysisNote = {
  header: {
    company_name: string;
    stage?: string | null;
    sector?: string | null;
    analysis_date?: string | null;
    analyst?: string | null;
    deal_size?: number | null;
  };
  overall_assessment: {
    recommendation_level: string; // e.g., "Strong", "Potential", "Caution"
    confidence_percentage: number; // 0..100
    one_line_thesis: string;
    key_attraction?: string | null;
    primary_concern?: string | null;
  };
  executive_summary: {
    business_model_clarity: string;
    market_positioning: string;
    execution_track_record: string;
    financial_health_snapshot: string;
    competitive_advantage: string;
  };
  key_metrics_dashboard: {
    funding_required?: number | null;
    runway_months?: number | null;
    gross_margin?: number | null;
    cac?: number | null;
    ltv_cac_ratio?: number | null;
    monthly_burn?: number | null;
    current_arr?: number | null;
    growth_rate_mom?: number | null;
  };
  business_fundamentals?: {
    revenue_quality?: string;
    unit_economics_health?: string;
    capital_efficiency?: string;
    scalability_factors?: string;
    customer_concentration?: string;
  };
  team_and_execution?: {
    founder_market_fit?: string;
    team_completeness?: string;
    execution_velocity?: string;
    hiring_trajectory?: string;
    operational_maturity?: string;
  };
  market_dynamics?: {
    market_size_reality?: string;
    competitive_intensity?: string;
    timing_assessment?: string;
    moat_development?: string;
    platform_dependencies?: string;
  };
  risk_assessment?: {
    execution_risks?: RiskItem[];
    market_risks?: RiskItem[];
    financial_risks?: RiskItem[];
    regulatory_competitive_risks?: RiskItem[];
  };
  red_flag_analysis?: {
    financial_concerns?: { flag_type: string; severity?: string; description: string }[];
    operational_concerns?: { flag_type: string; severity?: string; description: string }[];
    market_concerns?: { flag_type: string; severity?: string; description: string }[];
    governance_concerns?: { flag_type: string; severity?: string; description: string }[];
  };
  market_benchmarking?: {
    valuation_context?: string;
    growth_vs_peers?: string;
    unit_economics_comparison?: string;
    competitive_positioning?: string;
    exit_comparables?: string;
  };
  investment_considerations?: {
    bull_case_drivers?: string[];
    bear_case_risks?: string[];
    base_case_assumptions?: string[];
    key_value_drivers?: string[];
    potential_exit_paths?: string[];
  };
  due_diligence_priorities?: DueDiligenceItem[];
  investment_conditions?: InvestmentCondition[];
  next_steps?: {
    immediate_actions?: { action: string; owner?: string; timeline?: string; success_criteria?: string }[];
    decision_timeline?: string;
    additional_information_needed?: string[];
  };
};

function formatCurrencyUSD(v?: number | null) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
  } catch {
    return `$${v.toLocaleString()}`;
  }
}

function formatNumber(v?: number | null, suffix = '') {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${v.toLocaleString()}${suffix}`;
}

function formatPercent(v?: number | null) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${v}%`;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border bg-white">
      {children}
    </span>
  );
}

export default function DealNoteView({ data }: { data: any }) {
  // Accept either the object directly or an object with investment_analysis_note
  const note: InvestmentAnalysisNote | null = useMemo(
    () => (data?.investment_analysis_note ? data.investment_analysis_note : data) ?? null,
    [data]
  );

  const [tab, setTab] = useState<'summary' | 'risks' | 'benchmark' | 'details'>('summary');

  if (!note) {
    return (
      <div className="p-4 border rounded-xl bg-yellow-50 text-yellow-900">
        Deal note not available or in unexpected format.
      </div>
    );
  }

  const score = Math.max(0, Math.min(100, note.overall_assessment?.confidence_percentage ?? 0));
  const recommendation = note.overall_assessment?.recommendation_level || 'Recommendation';

  return (
    <div className="flex flex-col gap-4">
      {/* Header / Overall Recommendation */}
      <div className="bg-white border rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500">Overall Recommendation</div>
            <div className="text-2xl sm:text-3xl font-semibold">
              {recommendation}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-indigo-700">{score}%</div>
            <div className="text-xs text-gray-500">Confidence</div>
          </div>
        </div>

        <div className="mt-3 h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-2 bg-gradient-to-r from-indigo-600 to-sky-500"
            style={{ width: `${score}%` }}
          />
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="text-sm text-gray-700">
            <span className="font-medium">Company:</span> {note.header?.company_name}
          </div>
          <div className="text-sm text-gray-700">
            <span className="font-medium">Stage:</span> {note.header?.stage || '—'}
          </div>
          <div className="text-sm text-gray-700">
            <span className="font-medium">Sector:</span> {note.header?.sector || '—'}
          </div>
        </div>

        <div className="mt-2 text-sm text-gray-500">
          <Pill>Analyst: {note.header?.analyst || '—'}</Pill>{' '}
          <Pill>Date: {note.header?.analysis_date || '—'}</Pill>{' '}
          <Pill>Deal Size: {formatCurrencyUSD(note.header?.deal_size)}</Pill>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-100">
          <div className="text-sm font-medium">Thesis</div>
          <div className="text-sm">{note.overall_assessment?.one_line_thesis}</div>
          <div className="mt-2 grid sm:grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-md bg-white border">
              <div className="font-medium text-emerald-700">Key Attraction</div>
              <div className="text-gray-700">{note.overall_assessment?.key_attraction || '—'}</div>
            </div>
            <div className="p-3 rounded-md bg-white border">
              <div className="font-medium text-rose-700">Primary Concern</div>
              <div className="text-gray-700">{note.overall_assessment?.primary_concern || '—'}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className={`px-3 py-1.5 text-sm rounded-md border ${tab === 'summary' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:bg-gray-50'}`}
            onClick={() => setTab('summary')}
          >
            Executive Summary
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-md border ${tab === 'risks' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:bg-gray-50'}`}
            onClick={() => setTab('risks')}
          >
            Risk Analysis
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-md border ${tab === 'benchmark' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:bg-gray-50'}`}
            onClick={() => setTab('benchmark')}
          >
            Market Benchmarking
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-md border ${tab === 'details' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:bg-gray-50'}`}
            onClick={() => setTab('details')}
          >
            Details
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-500">Funding Required</div>
          <div className="text-xl font-semibold">{formatCurrencyUSD(note.key_metrics_dashboard?.funding_required)}</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-500">Runway</div>
          <div className="text-xl font-semibold">{formatNumber(note.key_metrics_dashboard?.runway_months, ' Months')}</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-500">CAC</div>
          <div className="text-xl font-semibold">{formatCurrencyUSD(note.key_metrics_dashboard?.cac)}</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-500">Gross Margin</div>
          <div className="text-xl font-semibold">{note.key_metrics_dashboard?.gross_margin != null ? formatPercent(note.key_metrics_dashboard?.gross_margin) : '—'}</div>
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'summary' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white border rounded-2xl p-4">
            <div className="font-semibold mb-2">Business Overview</div>
            <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
              <li>{note.executive_summary.business_model_clarity}</li>
              <li>{note.executive_summary.market_positioning}</li>
              <li>{note.executive_summary.execution_track_record}</li>
              <li>{note.executive_summary.financial_health_snapshot}</li>
              <li>{note.executive_summary.competitive_advantage}</li>
            </ul>
          </div>
          <div className="bg-white border rounded-2xl p-4">
            <div className="font-semibold mb-2">Team & Experience</div>
            <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
              <li>{note.team_and_execution?.founder_market_fit || '—'}</li>
              <li>{note.team_and_execution?.team_completeness || '—'}</li>
              <li>{note.team_and_execution?.execution_velocity || '—'}</li>
              <li>{note.team_and_execution?.hiring_trajectory || '—'}</li>
              <li>{note.team_and_execution?.operational_maturity || '—'}</li>
            </ul>
          </div>

          <div className="bg-white border rounded-2xl p-4 lg:col-span-2">
            <div className="font-semibold mb-2">Business Fundamentals</div>
            <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
              <li>{note.business_fundamentals?.revenue_quality || '—'}</li>
              <li>{note.business_fundamentals?.unit_economics_health || '—'}</li>
              <li>{note.business_fundamentals?.capital_efficiency || '—'}</li>
              <li>{note.business_fundamentals?.scalability_factors || '—'}</li>
              <li>{note.business_fundamentals?.customer_concentration || '—'}</li>
            </ul>
          </div>
        </div>
      )}

      {tab === 'risks' && (
        <div className="grid lg:grid-cols-2 gap-4">
          {(['execution_risks','market_risks','financial_risks','regulatory_competitive_risks'] as const).map(group => {
            const items = note.risk_assessment?.[group] || [];
            return (
              <div key={group} className="bg-white border rounded-2xl p-4">
                <div className="font-semibold mb-2 capitalize">{group.replace(/_/g,' ')}</div>
                {items.length === 0 ? (
                  <div className="text-sm text-gray-500">No items.</div>
                ) : (
                  <ul className="space-y-3">
                    {items.map((r, i) => (
                      <li key={i} className="border rounded-md p-3">
                        <div className="text-sm text-gray-900">{r.risk_description}</div>
                        <div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-2">
                          {r.likelihood && <Pill>Likelihood: {r.likelihood}</Pill>}
                          {r.impact_assessment && <Pill>Impact: {r.impact_assessment}</Pill>}
                          {r.mitigation_status && <Pill>Mitigation: {r.mitigation_status}</Pill>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          {note.red_flag_analysis && (
            <div className="bg-white border rounded-2xl p-4 lg:col-span-2">
              <div className="font-semibold mb-2">Red Flags</div>
              <div className="grid md:grid-cols-2 gap-3">
                {(['financial_concerns','operational_concerns','market_concerns','governance_concerns'] as const).map(group => {
                  const items = (note.red_flag_analysis as any)?.[group] || [];
                  return (
                    <div key={group} className="border rounded-md p-3">
                      <div className="text-sm font-medium capitalize mb-2">{group.replace(/_/g,' ')}</div>
                      {items.length === 0 ? (
                        <div className="text-sm text-gray-500">None</div>
                      ) : (
                        <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
                          {items.map((f: any, idx: number) => (
                            <li key={idx}>
                              <span className="font-medium">{f.flag_type}</span>{' '}
                              {f.severity && <span className="text-xs text-rose-700">({f.severity})</span>}
                              <div>{f.description}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'benchmark' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white border rounded-2xl p-4">
            <div className="font-semibold mb-2">Market Benchmarking</div>
            <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
              <li>{note.market_benchmarking?.valuation_context || '—'}</li>
              <li>{note.market_benchmarking?.growth_vs_peers || '—'}</li>
              <li>{note.market_benchmarking?.unit_economics_comparison || '—'}</li>
              <li>{note.market_benchmarking?.competitive_positioning || '—'}</li>
              <li>{note.market_benchmarking?.exit_comparables || '—'}</li>
            </ul>
          </div>
          <div className="bg-white border rounded-2xl p-4">
            <div className="font-semibold mb-2">Market Dynamics</div>
            <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
              <li>{note.market_dynamics?.market_size_reality || '—'}</li>
              <li>{note.market_dynamics?.competitive_intensity || '—'}</li>
              <li>{note.market_dynamics?.timing_assessment || '—'}</li>
              <li>{note.market_dynamics?.moat_development || '—'}</li>
              <li>{note.market_dynamics?.platform_dependencies || '—'}</li>
            </ul>
          </div>
        </div>
      )}

      {tab === 'details' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white border rounded-2xl p-4">
            <div className="font-semibold mb-2">Investment Considerations</div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="border rounded-md p-3">
                <div className="font-medium text-emerald-700 mb-1">Bull Case Drivers</div>
                <ul className="list-disc pl-5 space-y-1">
                  {(note.investment_considerations?.bull_case_drivers || []).map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
              <div className="border rounded-md p-3">
                <div className="font-medium text-rose-700 mb-1">Bear Case Risks</div>
                <ul className="list-disc pl-5 space-y-1">
                  {(note.investment_considerations?.bear_case_risks || []).map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
              <div className="border rounded-md p-3 sm:col-span-2">
                <div className="font-medium mb-1">Base Case Assumptions</div>
                <ul className="list-disc pl-5 space-y-1">
                  {(note.investment_considerations?.base_case_assumptions || []).map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
              <div className="border rounded-md p-3">
                <div className="font-medium mb-1">Key Value Drivers</div>
                <ul className="list-disc pl-5 space-y-1">
                  {(note.investment_considerations?.key_value_drivers || []).map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
              <div className="border rounded-md p-3">
                <div className="font-medium mb-1">Potential Exit Paths</div>
                <ul className="list-disc pl-5 space-y-1">
                  {(note.investment_considerations?.potential_exit_paths || []).map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-4">
            <div className="font-semibold mb-2">Due Diligence Priorities</div>
            {(note.due_diligence_priorities || []).length === 0 ? (
              <div className="text-sm text-gray-500">None</div>
            ) : (
              <ul className="text-sm space-y-3">
                {(note.due_diligence_priorities || []).map((d, i) => (
                  <li key={i} className="border rounded-md p-3">
                    <div className="font-medium">{d.area}: {d.specific_item}</div>
                    <div className="text-xs text-gray-600 mt-1 flex flex-wrap gap-2">
                      {d.urgency && <Pill>Urgency: {d.urgency}</Pill>}
                      {d.complexity && <Pill>Complexity: {d.complexity}</Pill>}
                      {d.potential_impact && <Pill>Impact: {d.potential_impact}</Pill>}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4">
              <div className="font-semibold mb-2">Investment Conditions</div>
              {(note.investment_conditions || []).length === 0 ? (
                <div className="text-sm text-gray-500">None</div>
              ) : (
                <ul className="text-sm space-y-3">
                  {(note.investment_conditions || []).map((c, i) => (
                    <li key={i} className="border rounded-md p-3">
                      <div className="font-medium">{c.condition_type}</div>
                      <div>{c.description}</div>
                      <div className="text-xs text-gray-600 mt-1 flex flex-wrap gap-2">
                        {c.criticality && <Pill>Criticality: {c.criticality}</Pill>}
                        {c.verification_method && <Pill>Verify: {c.verification_method}</Pill>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4">
              <div className="font-semibold mb-2">Next Steps</div>
              <div className="text-sm">
                <div className="font-medium mb-1">Immediate Actions</div>
                <ul className="list-disc pl-5 space-y-1">
                  {(note.next_steps?.immediate_actions || []).map((a, i) => (
                    <li key={i}>
                      {a.action} {a.owner ? <span className="text-xs text-gray-600">({a.owner})</span> : null}
                      {a.timeline ? <span className="text-xs text-gray-600"> — {a.timeline}</span> : null}
                      {a.success_criteria ? <div className="text-xs text-gray-600">Success: {a.success_criteria}</div> : null}
                    </li>
                  ))}
                </ul>
                {note.next_steps?.decision_timeline && (
                  <div className="mt-2 text-sm"><span className="font-medium">Decision Timeline:</span> {note.next_steps.decision_timeline}</div>
                )}
                {(note.next_steps?.additional_information_needed || []).length > 0 && (
                  <div className="mt-2 text-sm">
                    <div className="font-medium">Additional Information Needed</div>
                    <ul className="list-disc pl-5 space-y-1">
                      {note.next_steps!.additional_information_needed!.map((x, i) => <li key={i}>{x}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}