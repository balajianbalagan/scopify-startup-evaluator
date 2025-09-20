export type CompanyInformationRead = {
  id: number;
  company_name: string;
  search_query?: string | null;
  search_timestamp: string; // ISO string for demo
  requested_by_id: number;
  created_at: string;
  updated_at: string;
  ai_generated_info?: any;
};

export const dummyCompanies: CompanyInformationRead[] = [
  {
    id: 1,
    company_name: "Acme AI",
    search_query: "Acme AI healthcare NLP",
    search_timestamp: new Date().toISOString(),
    requested_by_id: 42,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ai_generated_info: {
      named_entities: {
        organizations: { company: { legal_name: "Acme AI", website_url: "https://acme.ai" } },
        products_services: [{ name: "InsightX", description: "AI-assisted clinical coding for hospitals." }],
        persons: { founders: [{ full_name: "Jane Doe", role: "CEO", commitment: "full_time" }] },
        locations: { headquarters: { city: "San Francisco", postal_code: "94103", country: "USA" } },
        monetary_values: { unit_economics: { ltv: 45000, acv: 12000 } },
      },
      extraction_output: {
        summary: {
          company_snapshot: "Acme AI builds NLP tools to automate medical coding, reducing claim denials.",
          investment_highlights: ["Strong MoM growth", "HIPAA compliant pipeline", "Sticky enterprise ACV"],
          next_steps: ["Intro call", "Request detailed cohort metrics"],
        },
        metadata: {
          extraction_id: "demo-1",
          processing_time: 3.2,
          extractor_version: "1.0.0",
          quality_score: "A",
          review_status: "auto",
        },
      },
      market_analysis: {
        tam: { global_value: 5_000_000_000, year: 2025 },
        sam: { value: 1_000_000_000, percentage_of_tam: "20%" },
        som: { value: 150_000_000, percentage_of_sam: "15%" },
        market_dynamics: { growth_rate: 22, key_drivers: ["AI adoption", "Regulatory changes"] },
        competitive_landscape: { positioning: "Upmarket" },
      },
      financial_data: {
        projections: { revenue_projections: [{ year: 2025, amount: 3_000_000, assumptions: ["10 enterprise customers"] }] },
        current_metrics: { runway_months: 18 },
      },
      operational_metrics: {
        sales_metrics: { sales_cycle_days: 45, pipeline_value: 1_500_000 },
        operational_efficiency: { revenue_per_employee: 230000, automation_percentage: "40%" },
      },
      risk_assessment: {
        business_risks: { market_risk: { level: "medium", factors: ["Incumbent pressure"] } },
        red_flags: { ip_issues: false, churn_risk: true },
      },
      investment_analysis: {
        deal_terms: { investment_amount: 2_000_000, observer_rights: true },
        funding_requirements: [{ round: "Seed" }],
        investment_thesis: { value_proposition: "Automates coding and reduces denials", key_strengths: ["Team", "Traction"] },
        investment_score: { recommendation: "Proceed to DD" },
      },
      esg_impact: {
        environmental: { renewable_energy_usage: "50%" },
        social: { community_impact: "Improved healthcare access" },
        governance: { board_independence: true },
      },
      data_quality_validation: {
        completeness: { mandatory_fields_present: 0.9, optional_fields_present: 0.6, overall_completeness: 0.8 },
        confidence_scores: { extracted_data_confidence: 0.85, inferred_data_confidence: 0.7, calculated_data_confidence: 0.9, overall_confidence: 0.82 },
      },
      business_model_classification: { primary_model: "SaaS", pricing_strategy: "Per seat" },
    },
  },
  {
    id: 2,
    company_name: "Nova Robotics",
    search_query: "warehouse automation robotics",
    search_timestamp: new Date().toISOString(),
    requested_by_id: 7,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ai_generated_info: {
      named_entities: {
        organizations: { company: { legal_name: "Nova Robotics", website_url: "https://nova-robotics.io" } },
        products_services: [{ name: "NovaPick", description: "Autonomous picking robots for 3PLs." }],
        persons: { founders: [{ full_name: "John Smith", role: "CTO", commitment: "full_time" }] },
        locations: { headquarters: { city: "Austin", postal_code: "73301", country: "USA" } },
        monetary_values: { unit_economics: { ltv: 120000, acv: 60000 } },
      },
      extraction_output: {
        summary: {
          company_snapshot: "Nova Robotics deploys autonomous pick-and-place robots for warehouses.",
          investment_highlights: ["High ACV", "Strong hardware margins", "Rapid deployments"],
          next_steps: ["Meet product lead", "Site visit"],
        },
        metadata: { extraction_id: "demo-2", processing_time: 2.6, extractor_version: "1.0.0", quality_score: "B", review_status: "auto" },
      },
    },
  },
];