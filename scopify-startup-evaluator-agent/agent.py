from google.adk.agents import Agent
from toolbox_core import ToolboxSyncClient

# Connect to running MCP Toolbox server
toolbox = ToolboxSyncClient("http://127.0.0.1:5000")

# Load toolset defined in tools.yaml
tools = toolbox.load_toolset("scopify_analysis")

# Define the Scopify Agent
root_agent = Agent(
    name="scopify_startup_agent",
    model="gemini-2.0-flash",
    description=(
        "An AI analyst that evaluates startups by retrieving details, "
        "benchmarking them against peers in the same industry, and "
        "providing risk insights from failed startups."
    ),
    instruction=(
        "You are a startup analyst. "
        "When given a startup name, use your tools to: "
        "1. Fetch the startup's details. "
        "2. Benchmark it against peers in the same industry. "
        "3. Review failures in the industry for risks and lessons. "
        "4. Provide clear recommendations for growth, differentiation, and funding strategy."
    ),
    tools=tools,
)
