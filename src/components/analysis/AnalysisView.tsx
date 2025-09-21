"use client";

import React, { useMemo, useState } from "react";

type Props = {
  data: any;
  onBack?: () => void;
};

export default function AnalysisView({ data, onBack }: Props) {
  const [tab, setTab] = useState<TabKey>("overview");

  const company = data?.named_entities?.organizations?.company ?? {};
  const products = data?.named_entities?.products_services ?? [];
  const founders = data?.named_entities?.persons?.founders ?? [];
  const locations = data?.named_entities?.locations ?? {};
  const summary = data?.extraction_output?.summary ?? {};
  const meta = data?.extraction_output?.metadata ?? {};
  const relationships = data?.relationships ?? {};
  const market = data?.market_analysis ?? {};
  const financial = data?.financial_data ?? {};
  const ops = data?.operational_metrics ?? {};
  const risks = data?.risk_assessment ?? {};
  const investment = data?.investment_analysis ?? {};
  const esg = data?.esg_impact ?? {};
  const quality = data?.data_quality_validation ?? {};

  const tabs: { key: TabKey; label: string; icon: string }[] = useMemo(
    () => [
      { key: "overview", label: "Overview", icon: "🏠" },
      { key: "company", label: "Company", icon: "🏢" },
      { key: "people", label: "People", icon: "👥" },
      { key: "market", label: "Market", icon: "📊" },
      { key: "financials", label: "Financials", icon: "💹" },
      { key: "ops", label: "Ops & Metrics", icon: "⚙️" },
      { key: "risks", label: "Risks", icon: "⚠️" },
      { key: "investment", label: "Investment", icon: "💼" },
      { key: "esg", label: "ESG", icon: "🌿" },
      { key: "quality", label: "Data Quality", icon: "🧪" }
    ],
    []
  );

  // Build enriched key metrics cards with icons and colors
  const keyMetricsEntries = useMemo(() => {
    const base: [string, any][] = Object.entries(summary?.key_metrics || {});
    const ltv = data?.named_entities?.monetary_values?.unit_economics?.ltv;
    const acv = data?.named_entities?.monetary_values?.unit_economics?.acv;
    const salesCycle = ops?.sales_metrics?.sales_cycle_days;
    if (ltv != null) base.push(["Client Lifetime Value", ltv]);
    if (acv != null) base.push(["Average Contract Value", acv]);
    if (salesCycle != null) base.push(["Sales Cycle Duration (days)", salesCycle]);
    return base;
  }, [summary?.key_metrics, data?.named_entities, ops?.sales_metrics?.sales_cycle_days]);

  return (
    <div className="flex flex-col gap-5">
      {/* Header - Solid blue (no gradient) */}
      <div className="rounded-2xl bg-indigo-600 text-white p-5 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Startup Analysis Dashboard
            </h2>
            <p className="text-white/90 mt-1">
              {company?.legal_name || "Company"}{" "}
              {company?.website_url ? (
                <span className="text-white/80">
                  •{" "}
                  <a
                    href={company.website_url.startsWith("http") ? company.website_url : `https://${company.website_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-white"
                  >
                    {company.website_url}
                  </a>
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition border border-white/20"
                title="Back to Upload"
              >
                ⬅️ Back
              </button>
            )}
            <a
              className="px-3 py-2 rounded-lg bg-white text-indigo-700 font-medium hover:shadow transition"
              href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`}
              download={`${company?.legal_name || "analysis"}.json`}
            >
              ⬇️ Download JSON
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 w-full overflow-x-auto">
          <div className="inline-flex bg-white/10 rounded-xl p-1 backdrop-blur">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 text-sm rounded-lg transition inline-flex items-center gap-1 ${
                  tab === t.key
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-white/90 hover:bg-white/10"
                }`}
                title={t.label}
              >
                <span aria-hidden>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {tab === "overview" && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Snapshot */}
          <Card className="lg:col-span-2">
            <SectionTitle icon="📌">Snapshot</SectionTitle>
            <p className="text-gray-700 leading-relaxed">{summary?.company_snapshot}</p>

            {Array.isArray(summary?.investment_highlights) &&
              summary.investment_highlights.length > 0 && (
                <>
                  <h4 className="section-title flex items-center gap-2 mt-4">
                    ✅ <span>Investment Highlights</span>
                  </h4>
                  <ul className="space-y-2">
                    {summary.investment_highlights.map((h: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-gray-800">
                        <span className="mt-0.5">✅</span>
                        <span className="leading-snug">{h}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

            {summary?.next_steps && (
              <>
                <h4 className="section-title flex items-center gap-2 mt-4">
                  🗺️ <span>Next Steps</span>
                </h4>
                <ol className="list-decimal pl-5 text-gray-700 space-y-1">
                  {summary.next_steps.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </>
            )}
          </Card>

          {/* Metadata */}
          <Card className="lg:col-span-1">
            <SectionTitle icon="🧾">Metadata</SectionTitle>
            <div className="space-y-3">
              <IconStat icon="🆔" label="Extraction ID" value={meta?.extraction_id} />
              <IconStat icon="⏱️" label="Processing Time" value={`${meta?.processing_time ?? "-"} s`} />
              <IconStat icon="🏷️" label="Version" value={meta?.extractor_version} />
              <IconStat icon="⭐" label="Quality Score" value={meta?.quality_score} />
              <IconStat icon="✅" label="Review Status" value={meta?.review_status} />
            </div>
          </Card>

          {/* Key Metrics */}
          {keyMetricsEntries?.length > 0 && (
            <Card className="lg:col-span-3">
              <SectionTitle icon="📈">Key Metrics</SectionTitle>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {keyMetricsEntries.map(([label, value]) => {
                  const { icon, tone } = metricPresentation(label);
                  return (
                    <MetricCard key={label} icon={icon} label={label} value={String(value ?? "-")} tone={tone} />
                  );
                })}
              </div>
            </Card>
          )}

          {/* Products */}
          <Card className="lg:col-span-3">
            <SectionTitle icon="🧑‍🤝‍🧑">Products</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {products?.length ? (
                products.map((p: any, i: number) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 hover:shadow-sm transition"
                    title={p?.description || p?.name}
                  >
                    🧩 <span className="font-medium">{p?.name || "Product"}</span>
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500">No products listed</span>
              )}
            </div>
            {products?.[0]?.description && (
              <p className="mt-4 text-gray-700 leading-relaxed">{products[0].description}</p>
            )}
          </Card>
        </section>
      )}

      {tab === "company" && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card>
            <SectionTitle icon="🏢">Identity</SectionTitle>
            <Info label="Legal name" value={company?.legal_name} />
            <Info label="Brands" value={(company?.brand_names || []).join(", ")} />
            <Info label="Website" value={company?.website_url} />
          </Card>

          <Card className="lg:col-span-2">
            <SectionTitle icon="👥">Customers</SectionTitle>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(company?.customers || []).map((c: any, i: number) => (
                <Pill key={i} title={c?.name} subtitle={`${c?.type || ""} ${c?.tier ? `• ${c.tier}` : ""}`} />
              ))}
            </div>
            <h3 className="section-title mt-6 flex items-center gap-2">
              🤝 <span>Partners</span>
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(company?.partners || []).map((p: any, i: number) => (
                <Pill key={i} title={p?.name} subtitle={p?.type} />
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle icon="📍">Headquarters</SectionTitle>
            <Info label="City" value={locations?.headquarters?.city} />
            <Info label="Postal Code" value={locations?.headquarters?.postal_code} />
            <Info label="Country" value={locations?.headquarters?.country} />
          </Card>
        </section>
      )}

      {tab === "people" && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <SectionTitle icon="🧑‍💼">Founders</SectionTitle>
            <div className="space-y-3">
              {founders.map((f: any, i: number) => (
                <div key={i} className="p-3 border rounded-lg hover:shadow-sm transition">
                  <div className="font-medium">{f.full_name}</div>
                  <div className="text-sm text-gray-600">
                    {f.role || "Founder"} • {f.commitment?.replace("_", " ")}
                  </div>
                  <div className="text-xs text-gray-500">
                    {f.email || ""} {f.phone ? `• ${f.phone}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle icon="🔗">Relationships</SectionTitle>
            <Info label="Corporate structure" value={`${(relationships?.corporate_structure || []).length} items`} />
            <Info label="Founder relationships" value={`${(relationships?.founder_relationships || []).length} links`} />
            <Info label="Customers" value={`${(relationships?.customer_relationships || []).length} links`} />
          </Card>
        </section>
      )}

      {tab === "market" && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card>
            <SectionTitle icon="📊">TAM</SectionTitle>
            <Info label="Global value" value={fmt(market?.tam?.global_value)} />
            <Info label="Year" value={market?.tam?.year} />
          </Card>
          <Card>
            <SectionTitle icon="📊">SAM</SectionTitle>
            <Info label="Value" value={fmt(market?.sam?.value)} />
            <Info label="% of TAM" value={market?.sam?.percentage_of_tam} />
          </Card>
          <Card>
            <SectionTitle icon="📊">SOM</SectionTitle>
            <Info label="Value" value={fmt(market?.som?.value)} />
            <Info label="% of SAM" value={market?.som?.percentage_of_sam} />
          </Card>

          <Card className="lg:col-span-3">
            <SectionTitle icon="📈">Market Dynamics</SectionTitle>
            <div className="grid lg:grid-cols-4 sm:grid-cols-2 gap-4">
              <MetricCard icon="📈" label="Growth rate (CAGR)" value={`${market?.market_dynamics?.growth_rate ?? "-"}%`} tone="green" />
              <MetricCard icon="🎯" label="Positioning" value={market?.competitive_landscape?.positioning || "-"} tone="blue" />
              <MetricCard icon="🏷️" label="Model" value={data?.business_model_classification?.primary_model || "-"} tone="indigo" />
              <MetricCard icon="💵" label="Pricing" value={data?.business_model_classification?.pricing_strategy || "-"} tone="indigo" />
            </div>
            <h4 className="section-title mt-4 flex items-center gap-2">
              🧭 <span>Key Drivers</span>
            </h4>
            <Tags items={market?.market_dynamics?.key_drivers || []} />
          </Card>
        </section>
      )}

      {tab === "financials" && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <SectionTitle icon="📊">Projections</SectionTitle>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-4">Year</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2">Assumptions</th>
                  </tr>
                </thead>
                <tbody>
                  {(financial?.projections?.revenue_projections || []).map((r: any, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="py-2 pr-4">{r.year}</td>
                      <td className="py-2 pr-4">{fmt(r.amount)}</td>
                      <td className="py-2">{(r.assumptions || []).join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <SectionTitle icon="📌">Current Metrics</SectionTitle>
            <Info label="Runway (months)" value={financial?.current_metrics?.runway_months} />
            <Info label="Sales cycle (days)" value={ops?.sales_metrics?.sales_cycle_days} />
            <Info label="ACV" value={fmt(data?.named_entities?.monetary_values?.unit_economics?.acv)} />
          </Card>

          <Card className="lg:col-span-3">
            <SectionTitle icon="📐">Unit Economics</SectionTitle>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard icon="💰" label="LTV" value={fmt(data?.named_entities?.monetary_values?.unit_economics?.ltv)} tone="green" />
              <MetricCard icon="💼" label="ACV" value={fmt(data?.named_entities?.monetary_values?.unit_economics?.acv)} tone="blue" />
              <MetricCard icon="📦" label="Investment Ask" value={fmt(investment?.deal_terms?.investment_amount)} tone="indigo" />
              <MetricCard icon="🚀" label="Funding Round" value={investment?.funding_requirements?.[0]?.round || "-"} tone="purple" />
            </div>
          </Card>
        </section>
      )}

      {tab === "ops" && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <SectionTitle icon="🛠️">Sales Metrics</SectionTitle>
            <Info label="Sales cycle days" value={ops?.sales_metrics?.sales_cycle_days} />
            <Info label="Pipeline value" value={fmt(ops?.sales_metrics?.pipeline_value)} />
          </Card>
          <Card>
            <SectionTitle icon="⚙️">Efficiency</SectionTitle>
            <Info label="Revenue per employee" value={fmt(ops?.operational_efficiency?.revenue_per_employee)} />
            <Info label="Automation %" value={ops?.operational_efficiency?.automation_percentage} />
          </Card>
        </section>
      )}

      {tab === "risks" && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {Object.entries(risks?.business_risks || {}).map(([k, v]: any) => (
            <Card key={k}>
              <div className="flex items-center justify-between">
                <SectionTitle icon="⚠️">{k.replace("_", " ")}</SectionTitle>
                <Badge>{v?.level}</Badge>
              </div>
              <ul className="list-disc pl-5 text-gray-700 space-y-1 mt-2">
                {(v?.factors || []).map((f: string, i: number) => <li key={i}>{f}</li>)}
              </ul>
            </Card>
          ))}
          <Card className="lg:col-span-3">
            <SectionTitle icon="🚩">Red Flags</SectionTitle>
            <Tags items={Object.entries(risks?.red_flags || {}).filter(([_, val]) => !!val).map(([k]) => k)} />
          </Card>
        </section>
      )}

      {tab === "investment" && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <SectionTitle icon="🧭">Thesis</SectionTitle>
            <div className="mb-4">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 shadow-sm">
                <span className="text-xl">⚠️</span>
                <div>
                  <div className="font-semibold">Disclaimer</div>
                  <div className="text-sm">
                    This investment thesis is a preliminary assessment and subject to change upon deeper analysis and due diligence.
                  </div>
                </div>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed">{investment?.investment_thesis?.value_proposition}</p>
            <h4 className="section-title mt-3">Key Strengths</h4>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              {(investment?.investment_thesis?.key_strengths || []).map((s: string, i: number) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <SectionTitle icon="📃">Deal Terms</SectionTitle>
            <Info label="Investment amount" value={fmt(investment?.deal_terms?.investment_amount)} />
            <Info label="Observer rights" value={toYesNo(investment?.deal_terms?.observer_rights)} />
            <Info label="Recommendation" value={investment?.investment_score?.recommendation} />
          </Card>
        </section>
      )}

      {tab === "esg" && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card>
            <SectionTitle icon="🌿">Environmental</SectionTitle>
            <Info label="Renewable energy usage" value={esg?.environmental?.renewable_energy_usage} />
          </Card>
          <Card>
            <SectionTitle icon="🤝">Social</SectionTitle>
            <Info label="Community impact" value={esg?.social?.community_impact} />
          </Card>
          <Card>
            <SectionTitle icon="🏛️">Governance</SectionTitle>
            <Info label="Board independence" value={toYesNo(esg?.governance?.board_independence)} />
          </Card>
        </section>
      )}

      {tab === "quality" && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <SectionTitle icon="🧪">Completeness</SectionTitle>
            <Progress label="Mandatory fields" value={quality?.completeness?.mandatory_fields_present} />
            <Progress label="Optional fields" value={quality?.completeness?.optional_fields_present} />
            <Progress label="Overall" value={quality?.completeness?.overall_completeness} />
          </Card>
          <Card>
            <SectionTitle icon="🎯">Confidence Scores</SectionTitle>
            <Progress label="Extracted" value={quality?.confidence_scores?.extracted_data_confidence} />
            <Progress label="Inferred" value={quality?.confidence_scores?.inferred_data_confidence} />
            <Progress label="Calculated" value={quality?.confidence_scores?.calculated_data_confidence} />
            <Progress label="Overall" value={quality?.confidence_scores?.overall_confidence} />
          </Card>
        </section>
      )}
    </div>
  );
}

type TabKey =
  | "overview"
  | "company"
  | "people"
  | "market"
  | "financials"
  | "ops"
  | "risks"
  | "investment"
  | "esg"
  | "quality"
  | "raw";

/* UI Primitives */

function Card({
  children,
  className = "",
}: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`p-5 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: string }) {
  return (
    <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
      {icon ? <span className="text-lg">{icon}</span> : null}
      <span>{children}</span>
    </h3>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium">{value ?? "-"}</div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: any }) {
  return (
    <div className="p-4 rounded-lg border bg-indigo-50">
      <div className="text-xs text-indigo-700/80">{label}</div>
      <div className="text-lg font-semibold text-indigo-700">{value ?? "-"}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="text-sm py-1.5 flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value ?? "-"}</span>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs bg-indigo-50 text-indigo-700 border border-indigo-100">
      {children}
    </span>
  );
}

function Pill({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="p-3 rounded-xl border border-gray-100 hover:shadow-sm transition">
      <div className="font-medium">{title}</div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
    </div>
  );
}

function Tags({ items }: { items: string[] }) {
  if (!items?.length) return <div className="text-sm text-gray-500">No items</div>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t, i) => (
        <span key={i} className="px-2.5 py-1 rounded-full border border-gray-200 text-xs bg-gray-50 hover:bg-gray-100 transition">
          {t}
        </span>
      ))}
    </div>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  const pct = Math.round((value ?? 0) * 100);
  const width = `${Math.min(Math.max(pct, 0), 100)}%`;
  const color =
    pct >= 75 ? "bg-emerald-500"
      : pct >= 50 ? "bg-indigo-600"
      : pct >= 25 ? "bg-amber-500"
      : "bg-rose-500";

  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span>{isNaN(pct) ? "-" : `${pct}%`}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-full ${color} transition-[width] duration-500`} style={{ width }} />
      </div>
    </div>
  );
}

/* Fancy metric cards */

type Tone = "green" | "blue" | "indigo" | "purple" | "amber" | "rose";

function MetricCard({
  icon,
  label,
  value,
  tone = "indigo",
}: {
  icon: string;
  label: string;
  value: string;
  tone?: Tone;
}) {
  const tones: Record<Tone, string> = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    blue: "bg-sky-50 text-sky-700 border-sky-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    purple: "bg-violet-50 text-violet-700 border-violet-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
  };
  return (
    <div className={`p-4 rounded-xl border ${tones[tone]} hover:shadow-sm transition`}>
      <div className="flex items-start gap-2">
        <div className="text-xl leading-none">{icon}</div>
        <div>
          <div className="text-xs opacity-80">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
      </div>
    </div>
  );
}

function IconStat({ icon, label, value }: { icon: string; label: string; value: any }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="text-lg">{icon}</div>
      <div className="flex-1 flex items-center justify-between">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{value ?? "-"}</span>
      </div>
    </div>
  );
}

/* helpers */

function fmt(n: any) {
  if (n == null) return "-";
  if (typeof n === "number") {
    try {
      return n.toLocaleString();
    } catch {
      return String(n);
    }
  }
  return String(n);
}

function toYesNo(v: any) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "-";
}

function metricPresentation(label: string): { icon: string; tone: Tone } {
  const l = label.toLowerCase();

  if (l.includes("average contract value") || l.includes("acv")) return { icon: "💼", tone: "blue" };
  if (l.includes("client lifetime value") || l.includes("ltv")) return { icon: "💰", tone: "green" };
  if (l.includes("sales cycle")) return { icon: "🔄", tone: "amber" };
  if (l.includes("runway")) return { icon: "⏳", tone: "indigo" };
  if (l.includes("tam") || l.includes("som") || l.includes("revenue")) return { icon: "📊", tone: "indigo" };
  if (l.includes("time to insights") || l.includes("improvement")) return { icon: "⚡", tone: "green" };
  if (l.includes("budget")) return { icon: "💰", tone: "rose" };
  if (l.includes("deployment")) return { icon: "🚀", tone: "purple" };

  return { icon: "📈", tone: "indigo" };
}