'use client';
import React, { useMemo, useState } from 'react';
import {
  FiHome,
  FiDollarSign,
  FiTarget,
  FiTrendingUp,
  FiAlertTriangle,
  FiFlag,
  FiBarChart,
  FiClipboard,
  FiChevronDown,
  FiChevronRight,
  FiUsers,
  FiGlobe,
  FiShield,
  FiCheckCircle,
  FiClock,
  FiStar,
  FiArrowUpRight,
  FiArrowDownRight,
  FiMinus
} from 'react-icons/fi';

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

function Pill({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' }) {
  const variants = {
    default: 'bg-gray-50 text-gray-700 border-gray-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200'
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${variants[variant]}`}>
      {children}
    </span>
  );
}

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
  count
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  count?: number;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-indigo-600">{icon}</span>
          <span className="font-medium text-sm">{title}</span>
          {count !== undefined && (
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        {isOpen ? <FiChevronDown className="w-4 h-4" /> : <FiChevronRight className="w-4 h-4" />}
      </button>
      {isOpen && (
        <div className="p-3 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

export default function DealNoteView({ data }: { data: any }) {
  // Accept either the object directly or an object with investment_analysis_note
  const note: InvestmentAnalysisNote | null = useMemo(
    () => (data?.investment_analysis_note ? data.investment_analysis_note : data) ?? null,
    [data]
  );

  if (!note) {
    return (
      <div className="p-4 border rounded-xl bg-yellow-50 text-yellow-900">
        Deal note not available or in unexpected format.
      </div>
    );
  }

  const score = Math.max(0, Math.min(100, note.overall_assessment?.confidence_percentage ?? 0));
  const recommendation = note.overall_assessment?.recommendation_level || 'Recommendation';

  const getRecommendationColor = (rec: string) => {
    switch (rec.toLowerCase()) {
      case 'strong potential': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'potential': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'cautious interest': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'pass': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col bg-gray-50 rounded-lg overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-none bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getRecommendationColor(recommendation)}`}>
              {recommendation}
            </div>
            <div className="text-2xl font-bold text-indigo-700">{score}%</div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FiHome className="w-4 h-4" />
            <span>{note.header?.company_name}</span>
            <Pill>{note.header?.stage || '—'}</Pill>
            <Pill>{formatCurrencyUSD(note.header?.deal_size)}</Pill>
          </div>
        </div>

        <div className="mt-3 h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-2 bg-gradient-to-r from-indigo-600 to-emerald-500 transition-all duration-500"
            style={{ width: `${score}%` }}
          />
        </div>

        {note.overall_assessment?.one_line_thesis && (
          <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
            <div className="text-sm font-medium text-indigo-900 mb-1">Investment Thesis</div>
            <div className="text-sm text-indigo-800">{note.overall_assessment.one_line_thesis}</div>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* Key Metrics */}
        <CollapsibleSection
          title="Key Metrics"
          icon={<FiBarChart className="w-4 h-4" />}
          defaultOpen={true}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <FiDollarSign className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-500">Funding</span>
              </div>
              <div className="text-lg font-semibold">{formatCurrencyUSD(note.key_metrics_dashboard?.funding_required)}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <FiClock className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-500">Runway</span>
              </div>
              <div className="text-lg font-semibold">{formatNumber(note.key_metrics_dashboard?.runway_months, 'mo')}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <FiTarget className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-500">CAC</span>
              </div>
              <div className="text-lg font-semibold">{formatCurrencyUSD(note.key_metrics_dashboard?.cac)}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <FiTrendingUp className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-500">Margin</span>
              </div>
              <div className="text-lg font-semibold">{formatPercent(note.key_metrics_dashboard?.gross_margin)}</div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Thesis Overview */}
        {(note.overall_assessment?.key_attraction || note.overall_assessment?.primary_concern) && (
          <CollapsibleSection
            title="Investment Thesis"
            icon={<FiStar className="w-4 h-4" />}
            defaultOpen={true}
          >
            <div className="grid md:grid-cols-2 gap-3">
              {note.overall_assessment?.key_attraction && (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <FiArrowUpRight className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium text-emerald-800">Key Attraction</span>
                  </div>
                  <div className="text-sm text-emerald-700">{note.overall_assessment.key_attraction}</div>
                </div>
              )}
              {note.overall_assessment?.primary_concern && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <FiArrowDownRight className="w-4 h-4 text-red-600" />
                    <span className="font-medium text-red-800">Primary Concern</span>
                  </div>
                  <div className="text-sm text-red-700">{note.overall_assessment.primary_concern}</div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Executive Summary */}
        <CollapsibleSection
          title="Executive Summary"
          icon={<FiClipboard className="w-4 h-4" />}
          defaultOpen={false}
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <FiHome className="w-4 h-4" />
                Business Overview
              </h4>
              <div className="space-y-2 text-sm text-gray-700">
                <div>• {note.executive_summary.business_model_clarity}</div>
                <div>• {note.executive_summary.market_positioning}</div>
                <div>• {note.executive_summary.execution_track_record}</div>
                <div>• {note.executive_summary.financial_health_snapshot}</div>
                <div>• {note.executive_summary.competitive_advantage}</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <FiUsers className="w-4 h-4" />
                Team & Execution
              </h4>
              <div className="space-y-2 text-sm text-gray-700">
                <div>• {note.team_and_execution?.founder_market_fit || '—'}</div>
                <div>• {note.team_and_execution?.team_completeness || '—'}</div>
                <div>• {note.team_and_execution?.execution_velocity || '—'}</div>
                <div>• {note.team_and_execution?.hiring_trajectory || '—'}</div>
                <div>• {note.team_and_execution?.operational_maturity || '—'}</div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Risk Assessment */}
        {note.risk_assessment && (
          <CollapsibleSection
            title="Risk Assessment"
            icon={<FiAlertTriangle className="w-4 h-4" />}
            count={Object.values(note.risk_assessment).flat().length}
            defaultOpen={false}
          >
            <div className="grid md:grid-cols-2 gap-3">
              {(['execution_risks', 'market_risks', 'financial_risks', 'regulatory_competitive_risks'] as const).map(group => {
                const items = note.risk_assessment?.[group] || [];
                const riskIcons = {
                  execution_risks: <FiUsers className="w-4 h-4" />,
                  market_risks: <FiGlobe className="w-4 h-4" />,
                  financial_risks: <FiDollarSign className="w-4 h-4" />,
                  regulatory_competitive_risks: <FiShield className="w-4 h-4" />
                };

                return items.length > 0 && (
                  <div key={group} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2 font-medium text-sm">
                      {riskIcons[group]}
                      <span className="capitalize">{group.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="space-y-2">
                      {items.slice(0, 3).map((r, i) => (
                        <div key={i} className="text-xs bg-white p-2 rounded border">
                          <div className="text-gray-900 mb-1">{r.risk_description}</div>
                          <div className="flex gap-1">
                            {r.likelihood && <Pill variant={r.likelihood === 'High' ? 'danger' : r.likelihood === 'Medium' ? 'warning' : 'default'}>
                              {r.likelihood}
                            </Pill>}
                            {r.impact_assessment && <Pill variant="default">{r.impact_assessment}</Pill>}
                          </div>
                        </div>
                      ))}
                      {items.length > 3 && (
                        <div className="text-xs text-gray-500">+{items.length - 3} more risks</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        )}

        {/* Investment Considerations */}
        {note.investment_considerations && (
          <CollapsibleSection
            title="Investment Considerations"
            icon={<FiTarget className="w-4 h-4" />}
            defaultOpen={false}
          >
            <div className="grid md:grid-cols-3 gap-3 text-xs">
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                <div className="font-medium text-emerald-800 mb-2 flex items-center gap-1">
                  <FiArrowUpRight className="w-3 h-3" />
                  Bull Case
                </div>
                <div className="space-y-1">
                  {(note.investment_considerations.bull_case_drivers || []).slice(0, 3).map((x, i) => (
                    <div key={i} className="text-emerald-700">• {x}</div>
                  ))}
                </div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <div className="font-medium text-red-800 mb-2 flex items-center gap-1">
                  <FiArrowDownRight className="w-3 h-3" />
                  Bear Case
                </div>
                <div className="space-y-1">
                  {(note.investment_considerations.bear_case_risks || []).slice(0, 3).map((x, i) => (
                    <div key={i} className="text-red-700">• {x}</div>
                  ))}
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="font-medium text-blue-800 mb-2 flex items-center gap-1">
                  <FiMinus className="w-3 h-3" />
                  Base Case
                </div>
                <div className="space-y-1">
                  {(note.investment_considerations.base_case_assumptions || []).slice(0, 3).map((x, i) => (
                    <div key={i} className="text-blue-700">• {x}</div>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Market Benchmarking */}
        {note.market_benchmarking && (
          <CollapsibleSection
            title="Market Benchmarking"
            icon={<FiGlobe className="w-4 h-4" />}
            defaultOpen={false}
          >
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Market Position</h4>
                <div className="space-y-2 text-gray-700">
                  <div>• {note.market_benchmarking.valuation_context || '—'}</div>
                  <div>• {note.market_benchmarking.growth_vs_peers || '—'}</div>
                  <div>• {note.market_benchmarking.competitive_positioning || '—'}</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Economics & Exit</h4>
                <div className="space-y-2 text-gray-700">
                  <div>• {note.market_benchmarking.unit_economics_comparison || '—'}</div>
                  <div>• {note.market_benchmarking.exit_comparables || '—'}</div>
                </div>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Due Diligence & Next Steps */}
        {(note.due_diligence_priorities || note.next_steps) && (
          <CollapsibleSection
            title="Due Diligence & Next Steps"
            icon={<FiCheckCircle className="w-4 h-4" />}
            count={note.due_diligence_priorities?.length || 0}
            defaultOpen={false}
          >
            <div className="space-y-4">
              {note.due_diligence_priorities && note.due_diligence_priorities.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-sm">Priority Items</h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    {note.due_diligence_priorities.slice(0, 6).map((d, i) => (
                      <div key={i} className="bg-gray-50 p-2 rounded text-xs">
                        <div className="font-medium">{d.area}: {d.specific_item}</div>
                        <div className="flex gap-1 mt-1">
                          {d.urgency && <Pill variant={d.urgency === 'Pre-Term Sheet' ? 'danger' : 'default'}>{d.urgency}</Pill>}
                          {d.complexity && <Pill variant={d.complexity === 'High' ? 'warning' : 'default'}>{d.complexity}</Pill>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {note.next_steps?.immediate_actions && note.next_steps.immediate_actions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-sm">Immediate Actions</h4>
                  <div className="space-y-2">
                    {note.next_steps.immediate_actions.slice(0, 4).map((a, i) => (
                      <div key={i} className="bg-blue-50 p-2 rounded text-xs">
                        <div className="font-medium">{a.action}</div>
                        {(a.owner || a.timeline) && (
                          <div className="text-blue-600 mt-1">
                            {a.owner && <span>Owner: {a.owner}</span>}
                            {a.timeline && <span className="ml-2">Timeline: {a.timeline}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}