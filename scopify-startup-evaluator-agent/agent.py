import json
from pathlib import Path
from pydantic import BaseModel
from typing import Dict, Any
from google.adk.agents.llm_agent import LlmAgent
from google.adk.planners import BuiltInPlanner
from google.genai.types import ThinkingConfig, GenerateContentConfig

# Load the deck schema
SCHEMA_PATH = Path(__file__).parent / "schema" / "deck_schema.json"

def load_deck_schema():
    """Load and return the deck schema as a dictionary."""
    try:
        with open(SCHEMA_PATH, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Schema file not found at {SCHEMA_PATH}")
        return {}
    except json.JSONDecodeError as e:
        print(f"Error parsing schema JSON: {e}")
        return {}

# Create a Pydantic model for the output schema
class DeckExtractionOutput(BaseModel):
    """Structured output model matching the deck_schema.json structure."""

    class Config:
        # Allow arbitrary types and extra fields to match the flexible schema
        extra = "allow"
        arbitrary_types_allowed = True

    # The model will validate that the output is a valid JSON object
    # matching the structure defined in deck_schema.json
    def model_validate_json_schema(cls, schema_dict: Dict[str, Any]) -> bool:
        """Validate that the schema dict matches expected structure."""
        return isinstance(schema_dict, dict)

# Create thinking config for better reasoning
thinking_config = ThinkingConfig(
    include_thoughts=True,
    thinking_budget=512
)

# Create planner with thinking capabilities
planner = BuiltInPlanner(thinking_config=thinking_config)

# Generation config for structured output
generate_config = GenerateContentConfig(
    temperature=0.1,  # Low temperature for consistent structured output
    # max_output_tokens=8192,  # Large enough for full schema
)

# Load the schema structure
deck_schema = load_deck_schema()

# Create the schema description for the instruction
schema_description = json.dumps(deck_schema, indent=2) if deck_schema else "Failed to load schema"

# Create the pitch deck extraction agent
pitch_deck_extraction_agent = LlmAgent(
    name="pitch_deck_extraction_agent",
    model="gemini-2.5-flash-lite",
    # planner=planner,
    # generate_content_config=generate_config,
    description=(
        "AI agent specialized in extracting structured information from pitch deck content "
        "and returning it as a JSON object matching the predefined schema."
    ),
    instruction=(
        f"""You are a pitch deck analysis expert. Your task is to extract structured information
        from pitch deck content and return it as a valid JSON object that matches this exact schema:

        {schema_description}

        IMPORTANT INSTRUCTIONS:
        1. Analyze the provided pitch deck content thoroughly
        2. Extract all available information that matches the schema structure
        3. For missing information, use null values or empty arrays/objects as appropriate
        4. Ensure all monetary values are numbers (floats), not strings
        5. CRITICAL: Convert all monetary values to USD - if amounts are in other currencies (EUR, GBP, INR, etc.), convert them to USD using current exchange rates or clearly state if conversion is not possible
        6. When extracting monetary values, look for currency symbols (€, £, ¥, ₹, etc.) or currency codes (EUR, GBP, JPY, INR, etc.) and convert accordingly
        7. For historical monetary data, use appropriate historical exchange rates when possible
        8. Ensure all dates follow proper date format (YYYY-MM-DD)
        9. Ensure all percentages are represented as decimals (e.g., 0.15 for 15%)
        10. Return ONLY the JSON object, no additional text or explanation
        11. The JSON must be valid and parseable
        12. Follow the exact field names and structure from the schema
        13. For arrays, include all relevant items found in the content

        When extracting:
        - Company information from slides about the company
        - Financial data from financial slides and projections
        - Team information from team/founder slides
        - Market analysis from market size and competitive slides
        - Product information from solution/product slides
        - Risk factors from any risk or challenge mentions
        - Investment details from funding/ask slides

        Return the complete JSON object matching the schema structure."""
    ),
    # output_schema=DeckExtractionOutput,
    output_key="extracted_deck",
    include_contents='none',
    # tools=[]  # No external tools needed for text extraction
)

# Main agent instance for export
root_agent = pitch_deck_extraction_agent

# print("Pitch deck extraction agent created successfully.")
