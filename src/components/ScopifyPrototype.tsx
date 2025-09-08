"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Tailwind v4 global fixes:
// - Explicit border colors: border-gray-200 (containers), divide-gray-200 (dividers)
// - Inputs/selects/textarea: border-gray-300
// - No supports-[backdrop-filter] variant

export function Button({
  children,
  variant = "solid",
  size = "md",
  className = "",
  ...props
}: any) {
  const base =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<string, string> = {
    solid: "bg-indigo-600 text-white hover:bg-indigo-700",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
  };
  const sizes: Record<string, string> = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-3 py-2 text-sm",
  };
  return (
    <button
      className={`${base} ${variants[variant] || ""} ${sizes[size] || ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "", ...props }: any) {
  return (
    <div
      className={`border border-gray-200 rounded-xl bg-white shadow ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
export function CardHeader({ children, className = "", ...props }: any) {
  return (
    <div className={`p-4 border-b border-gray-200 ${className}`} {...props}>
      {children}
    </div>
  );
}
export function CardTitle({ children, className = "", ...props }: any) {
  return (
    <h2 className={`text-lg font-semibold ${className}`} {...props}>
      {children}
    </h2>
  );
}
export function CardContent({ children, className = "", ...props }: any) {
  return (
    <div className={`p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

// -----------------------------
// Simple vertical nav component
// -----------------------------
function VNav({
  items,
  active,
  onChange,
}: {
  items: string[];
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="w-64 shrink-0 border-r border-gray-200 bg-white rounded-l-2xl overflow-hidden"
      data-testid="vnav"
    >
      <div className="p-3 text-xs uppercase tracking-wide text-gray-500">
        Sections
      </div>
      <ul className="flex flex-col">
        {items.map((it) => (
          <li key={it}>
            <button
              onClick={() => onChange(it)}
              className={`w-full text-left px-4 py-3 transition ${
                active === it
                  ? "bg-indigo-50 text-indigo-700 font-medium border-l-4 border-indigo-500"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              {it}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------
// Main prototype component (exported)
// ---------------------------------
export default function ScopifyPrototype() {
  const [step, setStep] = useState(1);
  const [agentOpen, setAgentOpen] = useState(true);
  const [agentWidth, setAgentWidth] = useState<number>(384); // ~w-96
  const [resizing, setResizing] = useState(false);

  // --- DETAIL DATA STATE (for right pane) ---
  const [companyData, setCompanyData] = useState({
    name: "ExampleAI",
    sector: "SaaS",
    stage: "Seed",
    hq: "Bengaluru, IN",
  });
  const [companyStatus, setCompanyStatus] = useState<
    Record<string, "confirmed" | "review">
  >({
    name: "confirmed",
    sector: "confirmed",
    stage: "review",
    hq: "confirmed",
  });

  const [financialsData, setFinancialsData] = useState({
    arr: "$2.5M",
    burn: "$100k / month",
    margin: "78%",
    runway: "14 months",
  });
  const [financialsStatus, setFinancialsStatus] = useState<
    Record<string, "confirmed" | "review">
  >({
    arr: "review",
    burn: "confirmed",
    margin: "confirmed",
    runway: "confirmed",
  });

  const [teamData, setTeamData] = useState({
    founders: "Jane Doe, John Smith",
    employees: "20",
    plan: "+6 engineers, +2 sales in 2Q",
  });
  const [teamStatus, setTeamStatus] = useState<
    Record<string, "confirmed" | "review">
  >({
    founders: "confirmed",
    employees: "confirmed",
    plan: "review",
  });

  // --- UI helpers for detail pane ---
  const [filterQuery, setFilterQuery] = useState("");
  function countStatuses(map: Record<string, "confirmed" | "review">) {
    const vals = Object.values(map);
    return {
      confirmed: vals.filter((v) => v === "confirmed").length,
      review: vals.filter((v) => v === "review").length,
      total: vals.length,
    };
  }

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
  };
  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      setAgentWidth((w) => {
        const next = w - e.movementX;
        return Math.min(640, Math.max(280, next));
      });
    };
    const onUp = () => setResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  // Active sub-section per step
  const [s1, setS1] = useState("Company");
  const [s2, setS2] = useState("Revenue Benchmarks");
  const [s3, setS3] = useState("Metric Mismatches");
  const [s4, setS4] = useState("Recommendations");

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 4));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-row gap-4">
      {/* Main Content */}
      <Card className="flex-1 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="flex justify-between items-center border-b border-gray-200 pb-3">
          <CardTitle className="text-2xl font-bold text-indigo-600">
            Scopify Prototype
          </CardTitle>
          <div className="text-gray-500" data-testid="step-indicator">
            Step {step} of 4
          </div>
        </CardHeader>

        {/* STEP CONTENT WRAPPER */}
        <CardContent className="p-0">
          {step === 1 && (
            <div className="grid grid-cols-[16rem_1fr]">
              <VNav
                items={["Company", "Financials", "Team", "Attachments"]}
                active={s1}
                onChange={setS1}
              />
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-2">
                  📂 Extract & Confirm
                </h2>
                <p className="mb-6 text-gray-600">
                  Here’s what we extracted from your pitch deck. Confirm or edit
                  fields.
                </p>

                {s1 === "Company" && (
                  <div className="space-y-3">
                    <StickySection
                      title="Company"
                      onConfirm={() => console.log("confirm company")}
                      data-testid="sticky-company"
                    />
                    <SectionToolbar
                      stats={countStatuses(companyStatus)}
                      filter={filterQuery}
                      onFilter={setFilterQuery}
                      onConfirmAll={() =>
                        setCompanyStatus(
                          Object.fromEntries(
                            Object.keys(companyData).map((k) => [k, "confirmed"])
                          ) as any
                        )
                      }
                      onMarkAllReview={() =>
                        setCompanyStatus(
                          Object.fromEntries(
                            Object.keys(companyData).map((k) => [k, "review"])
                          ) as any
                        )
                      }
                    />
                    <DetailsTable
                      id="company"
                      data={companyData}
                      setData={setCompanyData}
                      labels={{
                        name: "Name",
                        sector: "Sector",
                        stage: "Stage",
                        hq: "HQ",
                      }}
                      status={companyStatus}
                      setStatus={setCompanyStatus}
                      filter={filterQuery}
                    />
                  </div>
                )}

                {s1 === "Financials" && (
                  <div className="space-y-3">
                    <StickySection
                      title="Financials"
                      onConfirm={() => console.log("confirm financials")}
                      data-testid="sticky-financials"
                    />
                    <SectionToolbar
                      stats={countStatuses(financialsStatus)}
                      filter={filterQuery}
                      onFilter={setFilterQuery}
                      onConfirmAll={() =>
                        setFinancialsStatus(
                          Object.fromEntries(
                            Object.keys(financialsData).map((k) => [
                              k,
                              "confirmed",
                            ])
                          ) as any
                        )
                      }
                      onMarkAllReview={() =>
                        setFinancialsStatus(
                          Object.fromEntries(
                            Object.keys(financialsData).map((k) => [k, "review"])
                          ) as any
                        )
                      }
                    />
                    <DetailsTable
                      id="financials"
                      data={financialsData}
                      setData={setFinancialsData}
                      labels={{
                        arr: "ARR",
                        burn: "Burn Rate",
                        margin: "Gross Margin",
                        runway: "Runway",
                      }}
                      status={financialsStatus}
                      setStatus={setFinancialsStatus}
                      filter={filterQuery}
                    />
                  </div>
                )}

                {s1 === "Team" && (
                  <div className="space-y-3">
                    <StickySection
                      title="Team"
                      onConfirm={() => console.log("confirm team")}
                      data-testid="sticky-team"
                    />
                    <SectionToolbar
                      stats={countStatuses(teamStatus)}
                      filter={filterQuery}
                      onFilter={setFilterQuery}
                      onConfirmAll={() =>
                        setTeamStatus(
                          Object.fromEntries(
                            Object.keys(teamData).map((k) => [k, "confirmed"])
                          ) as any
                        )
                      }
                      onMarkAllReview={() =>
                        setTeamStatus(
                          Object.fromEntries(
                            Object.keys(teamData).map((k) => [k, "review"])
                          ) as any
                        )
                      }
                    />
                    <DetailsTable
                      id="team"
                      data={teamData}
                      setData={setTeamData}
                      labels={{
                        founders: "Founders",
                        employees: "Employees",
                        plan: "Hiring Plan",
                      }}
                      status={teamStatus}
                      setStatus={setTeamStatus}
                      filter={filterQuery}
                    />
                  </div>
                )}

                {s1 === "Attachments" && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-3">
                      Pitch deck + any supporting files detected.
                    </p>
                    <div className="flex items-center justify-between border border-gray-200 rounded-lg p-3 bg-white">
                      <span>ExampleAI_Pitch.pdf</span>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-[16rem_1fr]">
              <VNav
                items={["Revenue Benchmarks", "Unit Economics", "Hiring vs Peers"]}
                active={s2}
                onChange={setS2}
              />
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-2">📊 Benchmark & Compare</h2>
                <p className="mb-6 text-gray-600">
                  Your metrics in context of sector peers.
                </p>

                {s2 === "Revenue Benchmarks" && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                    <KPI label="ARR vs Median" value="+10%" hint="Above peers" />
                    <KPI label="Growth QoQ" value="28%" hint="Top quartile" />
                  </div>
                )}
                {s2 === "Unit Economics" && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                    <KPI label="CAC" value="$420" hint="20% below median" />
                    <KPI label="LTV" value="$6,800" hint="Healthy" />
                    <KPI label="LTV/CAC" value="16.2x" hint="Excellent" />
                  </div>
                )}
                {s2 === "Hiring vs Peers" && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                    <KPI label="Team Size" value="20" hint="In line for Seed" />
                    <KPI label="Eng/Sales Mix" value="70/30" hint="Typical" />
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-[16rem_1fr]">
              <VNav
                items={["Metric Mismatches", "Market Sizing", "Other Flags"]}
                active={s3}
                onChange={setS3}
              />
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-2">⚠️ Flagging & Q&A</h2>
                <p className="mb-6 text-gray-600">
                  Resolve anomalies or mark as risk.
                </p>

                {s3 === "Metric Mismatches" && (
                  <FlagCard
                    title="ARR inconsistency"
                    details="Slide 4 shows $2.0M, Slide 7 shows $2.5M"
                    cta1="Use $2.5M"
                    cta2="Use $2.0M"
                  />
                )}
                {s3 === "Market Sizing" && (
                  <FlagCard
                    title="TAM inflation"
                    details="Claimed $10B vs source estimate $7B"
                    cta1="Adjust to $7B"
                    cta2="Provide source"
                  />
                )}
                {s3 === "Other Flags" && (
                  <FlagCard
                    title="Churn data missing"
                    details="Please provide M3/M6 churn or flag as unknown"
                    cta1="Add data"
                    cta2="Flag as risk"
                  />
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid grid-cols-[16rem_1fr]">
              <VNav
                items={[
                  "Recommendations",
                  "Risks & Concerns",
                  "Next Steps",
                  "Founder Assessment",
                ]}
                active={s4}
                onChange={setS4}
              />
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-2">📑 Deal Note</h2>
                <p className="mb-6 text-gray-600">
                  Investor-ready, editable sections.
                </p>

                {s4 === "Recommendations" && (
                  <SectionCard title="Recommendations">
                    Strong early traction in SaaS with efficient CAC. Consider
                    leading a Seed+ with milestone tranche tied to enterprise
                    logos.
                  </SectionCard>
                )}
                {s4 === "Risks & Concerns" && (
                  <SectionCard title="Risks & Concerns">
                    Market sizing uncertainty; revenue inconsistency previously
                    flagged; churn not yet verified.
                  </SectionCard>
                )}
                {s4 === "Next Steps" && (
                  <SectionCard title="Next Steps">
                    Request detailed cohort churn; validate TAM source; reference
                    checks with two design partners.
                  </SectionCard>
                )}
                {s4 === "Founder Assessment" && (
                  <SectionCard title="Founder Assessment">
                    Founders show strong domain and execution velocity;
                    complementary skill mix across product and GTM.
                  </SectionCard>
                )}
              </div>
            </div>
          )}

          {/* Footer nav */}
          <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-white">
            <Button onClick={prevStep} disabled={step === 1} variant="outline">
              Back
            </Button>
            <div className="text-sm text-gray-500">
              Use the left panel to switch sub-sections within this step.
            </div>
            <Button onClick={nextStep} disabled={step === 4}>
              {step === 3 ? "Generate Deal Note" : "Next"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Agent Side Panel — VS Code Copilot–style */}
      <AnimatePresence>
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={`relative flex h-[calc(100vh-3rem)] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden box-border`}
          style={{ width: agentOpen ? agentWidth : 56 }}
          data-testid="agent-panel"
        >
          {/* Rail (always visible) */}
          <div
            className="w-14 bg-white border-r border-gray-200 flex flex-col items-center py-3 gap-3"
            data-testid="agent-rail"
          >
            <button
              className="h-10 w-10 rounded-xl hover:bg-gray-100 flex items-center justify-center"
              title="Toggle Agent"
              onClick={() => setAgentOpen((v) => !v)}
            >
              <span className="text-indigo-600 text-xl">★</span>
            </button>
            <div className="h-px w-8 bg-gray-200" />
            <button className="h-9 w-9 rounded-lg hover:bg-gray-100" title="Threads">
              💬
            </button>
            <button className="h-9 w-9 rounded-lg hover:bg-gray-100" title="Files">
              📎
            </button>
            <button className="h-9 w-9 rounded-lg hover:bg-gray-100" title="Settings">
              ⚙️
            </button>
            <div className="mt-auto text-[10px] text-gray-400 rotate-[-90deg] mb-6">
              Scopify
            </div>
          </div>

          {/* Expanded content */}
          <AnimatePresence initial={false}>
            {agentOpen && (
              <div
                onMouseDown={startResize}
                className="absolute -left-1 top-0 h-full w-2 cursor-ew-resize z-20"
                title="Drag to resize"
              />
            )}
            {agentOpen && (
              <motion.div
                key="agent-expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col min-w-0 overflow-hidden"
                data-testid="agent-expanded"
              >
                {/* Title bar */}
                <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-indigo-50">
                  <div className="px-2 py-1 text-xs rounded-md bg-white border border-gray-200 text-indigo-700">
                    Chat
                  </div>
                  <div className="text-sm text-indigo-800 font-medium">
                    Scopify Agent
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <select className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white">
                      <option>Default mode</option>
                      <option>Benchmark mode</option>
                      <option>Risk review</option>
                    </select>
                    <Button size="sm" variant="outline">
                      New Chat
                    </Button>
                  </div>
                </div>

                {/* Message area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3 min-w-0">
                  <SystemMsg>Upload received. Spawning sub-agents…</SystemMsg>
                  <AgentStatus />
                  <UserMsg>/** generate benchmarks for unit economics */</UserMsg>
                  <AgentMsg>
                    Acknowledged. Routing request to <Badge>Unit-Economics</Badge>{" "}
                    with context from <Badge>#Financials</Badge> and{" "}
                    <Badge>#Company</Badge>.
                  </AgentMsg>
                  <AgentMsg>
                    Summary so far:
                    <ul className="list-disc ml-5 mt-2 text-sm">
                      <li>
                        ARR vs median: <b>+10%</b>
                      </li>
                      <li>
                        CAC vs median: <b>-20%</b>
                      </li>
                    </ul>
                  </AgentMsg>
                </div>

                {/* Command bar */}
                <div
                  className="border-t border-gray-200 bg-white p-2"
                  data-testid="command-bar"
                >
                  <div className="flex flex-col gap-3 w-full">
                    {/* Bottom row: icons + Send (same line) */}
                    <div
                      className="flex items-center gap-3 order-3 w-full"
                      data-testid="command-row"
                    >
                      <div className="flex items-center gap-3 text-gray-600">
                        <button
                          className="h-9 w-9 rounded-lg hover:bg-gray-100"
                          title="Slash commands"
                        >
                          /
                        </button>
                        <button
                          className="h-9 w-9 rounded-lg hover:bg-gray-100"
                          title="Variables"
                        >
                          #
                        </button>
                        <button
                          className="h-9 w-9 rounded-lg hover:bg-gray-100"
                          title="Attach file"
                        >
                          📎
                        </button>
                      </div>
                      <Button size="sm" className="ml-auto">
                        Send
                      </Button>
                    </div>

                    {/* Message box + Suggestions */}
                    <div className="w-full order-1" data-testid="composer">
                      <textarea
                        rows={3}
                        placeholder="Ask Scopify or type / for commands…"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none text-black"
                      />
                      <div
                        className="mt-2 overflow-x-auto whitespace-nowrap flex gap-2"
                        data-testid="suggestions-row"
                      >
                        <Hint>/benchmarks</Hint>
                        <Hint>/extract</Hint>
                        <Hint>/risks</Hint>
                        <Hint>/email-followup</Hint>
                        <Hint>/compare-peers</Hint>
                        <Hint>/summarize-call</Hint>
                        <Hint>/flag-inconsistency</Hint>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------
// Field + KPI + Flag + Section blocks + DetailsTable + Toolbar
// ---------------------------------
function Field({
  label,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <div
      className="grid grid-cols-[12rem_1fr] items-center gap-3"
      data-testid={`field-${label.toLowerCase()}`}
    >
      <div className="text-sm text-gray-500">{label}</div>
      <input
        className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white ${
          disabled ? "bg-gray-100 text-gray-500" : ""
        }`}
        defaultValue={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}

function DetailsTable<T extends Record<string, any>>({
  id,
  data,
  setData,
  labels,
  status,
  setStatus,
  filter,
}: {
  id: string;
  data: T;
  setData: (v: T) => void;
  labels: Record<keyof T & string, string>;
  status: Record<keyof T & string, "confirmed" | "review">;
  setStatus: (v: Record<keyof T & string, "confirmed" | "review">) => void;
  filter?: string;
}) {
  return (
    <div
      className="border border-gray-200 rounded-xl bg-gray-50"
      data-testid={`details-${id}`}
    >
      <div className="grid grid-cols-12 text-xs text-gray-500 px-4 py-2">
        <div className="col-span-4">Field</div>
        <div className="col-span-6">Value</div>
        <div className="col-span-2 text-right">Status</div>
      </div>
      <div className="divide-y divide-gray-200">
        {Object.keys(labels)
          .filter((key) => {
            if (!filter) return true;
            const k = key as keyof T & string;
            const label = String(labels[k]).toLowerCase();
            const value = String(data[k] ?? "").toLowerCase();
            const q = filter.toLowerCase();
            return label.includes(q) || value.includes(q);
          })
          .map((key) => {
            const k = key as keyof T & string;
            const label = labels[k];
            const value = data[k];
            const st = status[k] || "review";
            return (
              <Row
                key={`${id}-${k}`}
                label={label}
                value={String(value)}
                status={st}
                onSave={(v) => setData({ ...data, [k]: v } as T)}
                onToggleStatus={() =>
                  setStatus({
                    ...status,
                    [k]: st === "confirmed" ? "review" : "confirmed",
                  })
                }
              />
            );
          })}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  status,
  onSave,
  onToggleStatus,
}: {
  label: string;
  value: string;
  status: "confirmed" | "review";
  onSave: (v: string) => void;
  onToggleStatus: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const invalid = /ARR|Burn|Margin|Runway/i.test(label) && draft.trim().length === 0;

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !invalid) {
      onSave(draft);
      setEditing(false);
    } else if (e.key === "Escape") {
      setDraft(value);
      setEditing(false);
    }
  }

  return (
    <div className="grid grid-cols-12 items-center px-4 py-3 bg-white odd:bg-gray-50/50 hover:bg-indigo-50/40 transition-colors">
      <div className="col-span-4 text-sm text-gray-600">{label}</div>
      <div className="col-span-6">
        {!editing ? (
          <div className="text-sm break-words">{value}</div>
        ) : (
          <input
            className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm ${
              invalid ? "border-red-400" : ""
            }`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
          />
        )}
      </div>
      <div className="col-span-2 flex items-center justify-end gap-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            status === "confirmed"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}
        >
          {status === "confirmed" ? "Confirmed" : "Needs review"}
        </span>
        {!editing ? (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                onSave(draft);
                setEditing(false);
              }}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDraft(value);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        )}
        <Button size="sm" variant="outline" onClick={onToggleStatus}>
          {status === "confirmed" ? "Mark Review" : "Confirm"}
        </Button>
      </div>
    </div>
  );
}

function KPI({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div
      className={`flex items-center justify-between bg-white rounded-lg border border-gray-200 p-3`}
      data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div>
        <div className="text-sm text-gray-600">{label}</div>
        {hint && <div className="text-xs text-gray-400">{hint}</div>}
      </div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}

function FlagCard({
  title,
  details,
  cta1,
  cta2,
}: {
  title: string;
  details: string;
  cta1: string;
  cta2: string;
}) {
  return (
    <div
      className={`border border-gray-200 rounded-xl bg-white p-4`}
      data-testid={`flag-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="font-medium text-red-600 mb-1">{title}</div>
      <div className="text-sm text-gray-600 mb-3">{details}</div>
      <div className="flex gap-2">
        <Button size="sm">{cta1}</Button>
        <Button size="sm" variant="outline">
          {cta2}
        </Button>
      </div>
    </div>
  );
}

function StickySection({
  title,
  onConfirm,
  ...rest
}: { title: string; onConfirm: () => void } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className="sticky top-0 z-10 -mx-6 px-6 py-2 bg-white/80 backdrop-blur border-b border-gray-200 flex items-center gap-3"
      {...rest}
    >
      <div className="text-sm text-gray-500">Section</div>
      <div className="font-medium">{title}</div>
      <Button size="sm" className="ml-auto" onClick={onConfirm}>
        Confirm Section
      </Button>
    </div>
  );
}

function SectionToolbar({
  stats,
  filter,
  onFilter,
  onConfirmAll,
  onMarkAllReview,
}: {
  stats: { confirmed: number; review: number; total: number };
  filter: string;
  onFilter: (s: string) => void;
  onConfirmAll: () => void;
  onMarkAllReview: () => void;
}) {
  return (
    <div className="flex items-center gap-3 -mx-6 px-6 py-2 bg-white/70 backdrop-blur sticky top-9 z-10 border-b border-gray-200">
      <div className="flex items-center gap-2 text-xs">
        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          Confirmed: {stats.confirmed}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          Review: {stats.review}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200">
          Total: {stats.total}
        </span>
      </div>
      <div className="ml-2 flex-1" />
      <input
        value={filter}
        onChange={(e) => onFilter(e.target.value)}
        placeholder="Filter fields…"
        className="w-56 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
      />
      <div className="h-6 w-px bg-gray-200" />
      <Button size="sm" variant="outline" onClick={onMarkAllReview}>
        Mark all review
      </Button>
      <Button size="sm" onClick={onConfirmAll}>
        Confirm all
      </Button>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: any }) {
  return (
    <div
      className={`border border-gray-200 rounded-xl bg-gray-50 p-4`}
      data-testid={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="font-semibold mb-2">{title}</div>
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  );
}

// ---------------------------------
// VS Code-like chat components
// ---------------------------------
function Badge({ children }: { children: any }) {
  return (
    <span className="inline-flex items-center text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md">
      {children}
    </span>
  );
}
function Hint({ children }: { children: any }) {
  return (
    <span className="text-xs px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-gray-600">
      {children}
    </span>
  );
}
function Bubble({
  children,
  role,
}: {
  children: any;
  role?: "agent" | "user" | "system";
}) {
  const base = "max-w-[90%] rounded-2xl px-3 py-2 text-sm shadow-sm";
  if (role === "user")
    return <div className={`self-end bg-indigo-600 text-white ${base}`}>{children}</div>;
  if (role === "system")
    return (
      <div className={`self-center bg-gray-100 text-gray-700 ${base}`}>{children}</div>
    );
  return <div className={`self-start bg-white text-black ${base}`}>{children}</div>;
}
function UserMsg({ children }: { children: any }) {
  return (
    <div className="flex w-full justify-end">
      <Bubble role="user">{children}</Bubble>
    </div>
  );
}
function AgentMsg({ children }: { children: any }) {
  return (
    <div className="flex w-full">
      <Bubble role="agent">{children}</Bubble>
    </div>
  );
}
function SystemMsg({ children }: { children: any }) {
  return (
    <div className="flex w-full">
      <Bubble role="system">{children}</Bubble>
    </div>
  );
}
function AgentStatus() {
  const items = [
    { label: "Financial Info", status: "Running" },
    { label: "Hiring Data", status: "Running" },
    { label: "Founder Profile", status: "Running" },
    { label: "Company Snapshot", status: "Running" },
  ];
  return (
    <div className="grid grid-cols-1 gap-2">
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-center gap-2 border border-gray-200 rounded-lg p-2 bg-white"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-sm text-gray-700">{it.label}</div>
          <div className="ml-auto text-xs text-gray-500">{it.status}</div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------
// Dev smoke tests (non-blocking, console-only)
// ---------------------------------
function DevSmoke() {
  useEffect(() => {
    const stepEl = document.querySelector('[data-testid="step-indicator"]');
    console.assert(!!stepEl, "[Smoke] step indicator renders");
    const vnav = document.querySelector('[data-testid="vnav"]');
    console.assert(!!vnav, "[Smoke] vertical nav renders");
    const agent = document.querySelector('[data-testid="agent-panel"]');
    console.assert(!!agent, "[Smoke] agent panel renders");
    const command = document.querySelector('[data-testid="command-row"]');
    console.assert(!!command, "[Smoke] command row renders in single line");
    const suggestions = document.querySelector('[data-testid="suggestions-row"]');
    console.assert(!!suggestions, "[Smoke] suggestions row renders");
    const detailsCompany = document.querySelector('[data-testid="details-company"]');
    console.assert(!!detailsCompany, "[Smoke] company details table renders");
    const sticky = document.querySelector('[data-testid="sticky-company"]');
    console.assert(!!sticky, "[Smoke] sticky section header renders");
    const resizer = document.querySelector('[title="Drag to resize"]');
    console.assert(!!resizer, "[Smoke] resizer handle present]");
  }, []);
  return null;
}

export function ScopifyPrototypeWithSmoke() {
  return (
    <>
      <ScopifyPrototype />
      <DevSmoke />
    </>
  );
}
