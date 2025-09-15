from google.adk.agents import Agent
from toolbox_core import ToolboxSyncClient
from google.adk.planners import BasePlanner, BuiltInPlanner, PlanReActPlanner
from google.adk.tools import google_search
from google.genai.types import ThinkingConfig
from google.genai.types import GenerateContentConfig
TOOLBOX_URL = "http://127.0.0.1:5000"  # change if your toolbox is elsewhere

# Connect to MCP Toolbox
toolbox = ToolboxSyncClient(TOOLBOX_URL)

def safe_load_toolset(name):
    """Try to load toolset; return list (possibly empty) and log name used."""
    try:
        tools = toolbox.load_toolset(name)
        print(f"Loaded toolset: {name} (tools: {len(tools)})")
        return tools
    except Exception as e:
        print(f"Could not load toolset '{name}': {e}")
        return []

# Try the single 'scopify_analysis' first (your current agent used this);
# if not present the code below will load the specific toolsets.
scopify_analysis_tools = safe_load_toolset("scopify_analysis")

# Load per-domain toolsets as fallback / extras
scopify_core_tools = safe_load_toolset("scopify_core") or scopify_analysis_tools
companies_tools = safe_load_toolset("companies_products") or scopify_analysis_tools
consumer_tools = safe_load_toolset("consumer_brands") or scopify_analysis_tools
countries_tools = safe_load_toolset("countries_regions") or scopify_analysis_tools
trends_tools = safe_load_toolset("digital_trends") or scopify_analysis_tools
industries_tools = safe_load_toolset("industries_markets") or scopify_analysis_tools
politics_tools = safe_load_toolset("politics_society") or scopify_analysis_tools
market_insights_tools = safe_load_toolset("market_insights") or scopify_analysis_tools
# scopify_core_tools.append(google_search)
# ---------------------------
# Agents (one per domain)
# ---------------------------
# Step 1: Create a ThinkingConfig
thinking_config = ThinkingConfig(
    include_thoughts=True,   # Ask the model to include its thoughts in the response
    thinking_budget=256      # Limit the 'thinking' to 256 tokens (adjust as needed)
)
print("ThinkingConfig:", thinking_config)

# Step 2: Instantiate BuiltInPlanner
planner = BuiltInPlanner(
    thinking_config=thinking_config
)
print("BuiltInPlanner created.")
# Your original root agent (keeps same name)
root_agent = Agent(
    name="scopify_startup_agent",
    model="gemini-2.5-flash",
    planner=planner,
    description=(
        "An AI analyst that evaluates startups by retrieving details, "
        "benchmarking them against peers in the same industry, and "
        "providing risk insights from failed startups."
    ),
    instruction=(
        "You are a startup analyst. "
        "When given a startup idea, use your tools to, focus on idea not name: "
        "1. Fetch the startup's details. by industry use keywords if needed (use small keywords and even search partially). "
        "2. Benchmark it against peers in the same industry. "
        "3. Review failures in the industry for risks and lessons. "
        "4. Provide clear recommendations for growth, differentiation, and funding strategy."
    ),
    tools=scopify_analysis_tools or scopify_core_tools,
)

scopify_core_agent = Agent(
    name="scopify_core_agent",
    model="gemini-2.0-flash",
    description="Core scopify operations: fetch startup details, search, list top companies and peers.",
    instruction="Use your tools to return structured startup rows, peer lists, and core benchmarks when asked.",
    tools=scopify_core_tools,
)

companies_agent = Agent(
    name="companies_products_agent",
    model="gemini-2.0-flash",
    description="Company & Product intelligence: overviews, competitor extraction, product TAM rankings.",
    instruction="Use company and product tools to return concise overviews, competitor lists and product rankings.",
    tools=companies_tools,
)

consumer_agent = Agent(
    name="consumer_brands_agent",
    model="gemini-2.0-flash",
    description="Consumer & Brands: surface latest news, social signals and brand presence.",
    instruction="Use consumer tools to return social/media signals and a short interpretation of consumer sentiment proxies.",
    tools=consumer_tools,
)

countries_agent = Agent(
    name="countries_regions_agent",
    model="gemini-2.0-flash",
    description="Country & Region summaries and KPIs from the scopify dataset.",
    instruction="Use country tools to produce an aggregated KPI view for a country or region and short insight bullets.",
    tools=countries_tools,
)

trends_agent = Agent(
    name="digital_trends_agent",
    model="gemini-2.0-flash",
    description="Digital & Trends: find hot subcategories and recent startup growth signals.",
    instruction="Use trend tools to list top subcategories, counts, and recent new-startup activity.",
    tools=trends_tools,
)

industries_agent = Agent(
    name="industries_markets_agent",
    model="gemini-2.0-flash",
    description="Industry & Market summaries: medians, averages, and comparison to a given startup.",
    instruction="Use industry tools to compute medians (funding, valuation, employees) and return an industry snapshot.",
    tools=industries_tools,
)

politics_agent = Agent(
    name="politics_society_agent",
    model="gemini-2.0-flash",
    description="Politics & Society (dataset proxies): company counts by country and simple regional indicators.",
    instruction="Use politics tools to return regional company counts and a short note about distribution.",
    tools=politics_tools,
)

market_insights_agent = Agent(
    name="market_insights_agent",
    model="gemini-2.0-flash",
    description="Market Insights: comparisons across regions and product TAM rankings.",
    instruction="Use market insights tools to compare up to 5 regions and summarize product TAM ranking results.",
    tools=market_insights_tools,
)

# ---------------------------
# Main Orchestrator agent
# ---------------------------
main_orchestrator = Agent(
    name="scopify_main_orchestrator",
    model="gemini-2.0-flash",
    description=(
        "Orchestration agent that accepts a startup name or pitch text, "
        "validates industry/subcategory using discovery tools, dispatches work to domain agents, "
        "and synthesizes a structured JSON response."
    ),
    instruction=(
        "You are an orchestration coordinator. When given a startup name or pitch: "
        "1) Use discovery tools to list available industries/subcategories if needed. "
        "2) Call the appropriate domain agents (core, companies, consumer, industries, trends, countries, market_insights) "
        "to gather raw outputs. 3) Synthesize a structured JSON with keys: startup, core, peers, failures, companies, consumer, trends, industries, countries, market_insights, recommendations."
    ),
    tools=[],  # orchestration logic in your ADK web can call other agents directly
)

# ---------------------------
# Agent registry (for convenience)
# ---------------------------
agents = {
    "root": root_agent,
    "core": scopify_core_agent,
    "companies": companies_agent,
    "consumer": consumer_agent,
    "countries": countries_agent,
    "trends": trends_agent,
    "industries": industries_agent,
    "politics": politics_agent,
    "market_insights": market_insights_agent,
    "orchestrator": main_orchestrator,
}

print("Agents defined:", ", ".join(agents.keys()))
