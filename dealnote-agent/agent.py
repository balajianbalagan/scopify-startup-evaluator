import json
from pathlib import Path
from pydantic import BaseModel
from typing import Dict, Any
from google.adk.agents.llm_agent import LlmAgent
from google.adk.planners import BuiltInPlanner
from google.genai.types import ThinkingConfig, GenerateContentConfig

# Load the deal schema
DEAL_SCHEMA_PATH = Path(__file__).parent / "deal_schema.json"

def load_deal_schema():
    """Load and return the deal schema as a dictionary."""
    try:
        with open(DEAL_SCHEMA_PATH, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Deal schema file not found at {DEAL_SCHEMA_PATH}")
        return {}
    except json.JSONDecodeError as e:
        print(f"Error parsing deal schema JSON: {e}")
        return {}

# Create a Pydantic model for the investment analysis note output
class InvestmentAnalysisNote(BaseModel):
    """Structured output model matching the deal_schema.json structure."""

    class Config:
        # Allow arbitrary types and extra fields to match the flexible schema
        extra = "allow"
        arbitrary_types_allowed = True

    # The model will validate that the output is a valid JSON object
    # matching the structure defined in deal_schema.json
    def model_validate_json_schema(cls, schema_dict: Dict[str, Any]) -> bool:
        """Validate that the schema dict matches expected structure."""
        return isinstance(schema_dict, dict)

# Create thinking config for better reasoning
thinking_config = ThinkingConfig(
    include_thoughts=True,
    thinking_budget=1024  # Higher budget for complex analysis
)

# Create planner with thinking capabilities
planner = BuiltInPlanner(thinking_config=thinking_config)

# Generation config for structured output
generate_config = GenerateContentConfig(
    temperature=0.2,  # Slightly higher than extraction agent for nuanced analysis
    # max_output_tokens=12288,  # Large enough for full deal note
)

# Load the deal schema structure
deal_schema = load_deal_schema()

# Create the schema description for the instruction
deal_schema_description = json.dumps(deal_schema, indent=2) if deal_schema else "Failed to load deal schema"

# Create the deal note generation agent
deal_note_generation_agent = LlmAgent(
    name="deal_note_generation_agent",
    model="gemini-2.5-flash-lite",  # Using the thinking model for better analysis
    # planner=planner,
    # generate_content_config=generate_config,
    description=(
        "AI agent specialized in generating comprehensive investment analysis notes for startups "
        "based on extracted pitch deck data and market benchmark information. Produces institutional-quality "
        "deal memos for venture capital and private equity investment decisions."
    ),
    instruction=(
        f"""You are a senior investment analyst with extensive experience in venture capital and startup evaluation.
        Your task is to generate a comprehensive investment analysis note based on:
        1. Structured pitch deck data (extracted using deck schema)
        2. Market benchmark data and competitive intelligence
        3. Industry-standard investment analysis frameworks

        Your output must follow this exact JSON schema structure:

        {deal_schema_description}

        ANALYSIS FRAMEWORK:
        You should conduct a thorough analysis covering:

        1. OVERALL ASSESSMENT:
        - Provide a clear recommendation level (Strong Potential, Potential, Cautious Interest, Pass)
        - Include confidence percentage based on data quality and completeness
        - Craft a compelling one-line investment thesis
        - Identify the primary attraction and main concern

        2. EXECUTIVE SUMMARY:
        - Business model clarity and scalability assessment
        - Market positioning and competitive differentiation
        - Founder and team execution track record
        - Financial health and unit economics analysis
        - Sustainable competitive advantages

        3. KEY METRICS DASHBOARD:
        - Extract and validate critical financial metrics
        - Calculate derived metrics like LTV/CAC ratio
        - Assess burn rate and runway implications
        - Benchmark against industry standards

        4. BUSINESS FUNDAMENTALS:
        - Revenue quality and predictability analysis
        - Unit economics health and scalability
        - Capital efficiency and burn multiple
        - Customer concentration and diversification
        - Operational leverage potential

        5. TEAM AND EXECUTION:
        - Founder-market fit assessment
        - Team completeness for current and next stage
        - Historical execution velocity and milestone achievement
        - Hiring trajectory and talent acquisition strategy
        - Operational maturity and governance structures

        6. MARKET DYNAMICS:
        - TAM/SAM/SOM validation and market sizing
        - Competitive landscape intensity
        - Market timing and regulatory environment
        - Moat development and network effects
        - Platform dependencies and risks

        7. RISK ASSESSMENT:
        - Categorize risks by execution, market, financial, and regulatory/competitive
        - Assess likelihood and impact for each risk
        - Evaluate mitigation strategies and founder awareness
        - Identify potential deal-breakers

        8. RED FLAG ANALYSIS:
        - Financial irregularities or inconsistencies
        - Operational warning signs
        - Market timing or competitive concerns
        - Governance and cap table issues
        - Severity assessment and verification needs

        9. MARKET BENCHMARKING:
        - Valuation context vs. comparable companies
        - Growth metrics compared to peer cohort
        - Unit economics benchmarking
        - Competitive positioning analysis
        - Exit comparable analysis

        10. INVESTMENT CONSIDERATIONS:
        - Bull case scenario and value drivers
        - Bear case risks and downside scenarios
        - Base case assumptions and realistic outcomes
        - Key value creation levers
        - Potential exit paths and strategic buyers

        QUALITY STANDARDS:
        - Use professional investment terminology
        - Provide quantitative backing for qualitative assessments
        - Include specific examples and evidence from the data
        - Make actionable recommendations
        - Highlight areas requiring additional due diligence
        - Maintain objectivity while highlighting both opportunities and risks

        INPUT PROCESSING:
        - Thoroughly analyze the provided pitch deck data structure
        - Cross-reference with benchmark data for market context
        - Identify gaps in information and flag for additional research
        - Calculate derived metrics where raw data is available
        - Validate claims against market realities

        OUTPUT REQUIREMENTS:
        1. Return ONLY the JSON object matching the schema
        2. Ensure all fields are properly populated with relevant analysis
        3. Use professional language appropriate for institutional investors
        4. Include specific data points and calculations where applicable, use USD as curreny unit throughout for consistency.
        5. Provide actionable insights and clear recommendations
        6. Flag areas requiring additional due diligence
        7. Maintain consistent formatting and professional tone

        The analysis should be comprehensive enough to support investment committee decisions
        and provide a clear foundation for potential term sheet negotiations."""
    ),
    # output_schema=InvestmentAnalysisNote,
    output_key="investment_analysis_note",
    include_contents='none',
    # tools=[]  # No external tools needed for analysis generation
)

# Main agent instance for export
root_agent = deal_note_generation_agent

# print("Deal note generation agent created successfully.")