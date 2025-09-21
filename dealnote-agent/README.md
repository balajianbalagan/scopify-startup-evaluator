# DealNote Agent

A sophisticated AI agent that generates comprehensive investment analysis notes for venture capital and private equity investment decisions. The agent takes structured pitch deck data and market benchmark information to produce institutional-quality deal memos.

## Overview

The DealNote Agent is built using Google's Agents SDK and is designed to:

- Analyze structured pitch deck data extracted using the Scopify agent
- Process market benchmark and competitive intelligence data
- Generate comprehensive investment analysis notes following institutional standards
- Provide actionable insights for investment committee decisions
- Support due diligence prioritization and term sheet negotiations

## Architecture

### Input Sources
1. **Structured Pitch Deck Data**: JSON format following the `deck_schema.json` structure from the scopify-startup-evaluator-agent
2. **Market Benchmark Data**: Markdown format containing competitive intelligence and market analysis

### Output
- **Investment Analysis Note**: JSON format following the `deal_schema.json` structure
- Comprehensive analysis including:
  - Overall assessment and recommendation
  - Executive summary with key insights
  - Financial metrics dashboard
  - Risk assessment and red flag analysis
  - Market benchmarking and competitive positioning
  - Investment considerations and due diligence priorities

## Schema Structure

The agent outputs follow the comprehensive `deal_schema.json` which includes:

- **Header Information**: Company details, stage, sector, analyst info
- **Overall Assessment**: Recommendation level, confidence, thesis
- **Executive Summary**: Business model, market positioning, execution track record
- **Key Metrics Dashboard**: Financial KPIs and derived metrics
- **Business Fundamentals**: Revenue quality, unit economics, scalability
- **Team & Execution**: Founder-market fit, team completeness, operational maturity
- **Market Dynamics**: TAM/SAM/SOM, competitive landscape, timing
- **Risk Assessment**: Categorized risks with likelihood and impact
- **Red Flag Analysis**: Financial, operational, market, and governance concerns
- **Market Benchmarking**: Valuation context and peer comparisons
- **Investment Considerations**: Bull/bear cases, exit scenarios
- **Due Diligence Priorities**: Action items and next steps

## Installation

1. Clone the repository and navigate to the dealnote-agent directory:
```bash
cd dealnote-agent
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Command Line Interface

Generate an investment analysis note using the main script:

```bash
python main.py --deck-data <path_to_deck_data.json> --benchmark-data <path_to_benchmark.md> [--output <output_file.json>]
```

#### Examples

Basic usage:
```bash
python main.py --deck-data extracted_deck.json --benchmark-data market_benchmark.md
```

With custom output file:
```bash
python main.py --deck-data data/deck.json --benchmark-data data/benchmark.md --output investment_analysis.json
```

With verbose output:
```bash
python main.py --deck-data deck.json --benchmark-data benchmark.md --output analysis.json --verbose
```

### Programmatic Usage

```python
from agent import root_agent
import json

# Load your data
with open('deck_data.json', 'r') as f:
    deck_data = json.load(f)

with open('benchmark_data.md', 'r') as f:
    benchmark_data = f.read()

# Prepare input prompt
input_prompt = f"""
Please generate a comprehensive investment analysis note based on the following data:

PITCH DECK DATA (Structured):
```json
{json.dumps(deck_data, indent=2)}
```

MARKET BENCHMARK DATA:
```markdown
{benchmark_data}
```

Please analyze this information thoroughly and generate a complete investment analysis note.
"""

# Generate analysis
response = root_agent.run(input_prompt)
deal_note = response.data['investment_analysis_note']

# Save or process the result
with open('investment_note.json', 'w') as f:
    json.dump(deal_note, f, indent=2)
```

## Input Data Format

### Deck Data (JSON)
The deck data should follow the structure defined in `../scopify-startup-evaluator-agent/schema/deck_schema.json`. Key sections include:

- Named entities (organizations, persons, locations, dates)
- Monetary values (revenue, costs, funding, unit economics)
- Business model classification
- Market analysis (TAM/SAM/SOM)
- Financial data and projections
- Operational metrics
- Industry-specific metrics
- Risk assessment

### Benchmark Data (Markdown)
The benchmark data should contain:

- Market size and growth data
- Competitive landscape analysis
- Industry benchmarks and KPIs
- Valuation multiples and comparables
- Regulatory environment
- Technology trends
- Customer behavior insights

## Output Analysis Categories

### 1. Overall Assessment
- Recommendation level (Strong Potential, Potential, Cautious Interest, Pass)
- Confidence percentage based on data quality
- One-line investment thesis
- Key attraction and primary concern

### 2. Financial Analysis
- Revenue quality and predictability
- Unit economics health (LTV/CAC, payback period)
- Capital efficiency and burn metrics
- Path to profitability analysis

### 3. Market & Competition
- Market sizing validation (TAM/SAM/SOM)
- Competitive positioning assessment
- Market timing and regulatory factors
- Moat development and defensibility

### 4. Team & Execution
- Founder-market fit evaluation
- Team completeness for stage
- Historical execution track record
- Operational maturity assessment

### 5. Risk Analysis
- Execution, market, financial, and regulatory risks
- Red flag identification and severity assessment
- Mitigation strategies evaluation

### 6. Investment Considerations
- Bull and bear case scenarios
- Key value drivers and exit paths
- Due diligence priorities
- Investment conditions and terms

## Agent Configuration

The agent is configured with:

- **Model**: `gemini-2.0-flash-thinking-exp` for enhanced analytical reasoning
- **Temperature**: 0.2 for balanced creativity and consistency
- **Thinking Budget**: 1024 tokens for complex analysis
- **Output Schema**: Structured JSON following deal_schema.json

## Quality Standards

The agent is designed to produce analysis that meets institutional investment standards:

- Professional investment terminology
- Quantitative backing for qualitative assessments
- Specific examples and evidence from data
- Actionable recommendations
- Clear identification of information gaps
- Objective assessment of both opportunities and risks

## Integration with Scopify Ecosystem

This agent is designed to work seamlessly with:

- **Scopify Startup Evaluator Agent**: Provides structured deck data extraction
- **Benchmark Agent**: Supplies market intelligence and competitive data
- **Investment Pipeline**: Feeds into decision-making workflows

## Contributing

When contributing to the DealNote Agent:

1. Ensure new features maintain schema compatibility
2. Add comprehensive tests for new analysis frameworks
3. Update documentation for new capabilities
4. Follow institutional investment analysis standards

## License

This project is part of the Scopify startup evaluation ecosystem.