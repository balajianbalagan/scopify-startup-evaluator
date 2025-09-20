# Benchmark Analysis System

This system has been updated to perform comprehensive benchmark analysis across 6 key vectors using flexible startup data input.

## New Features

### 1. Flexible Schema Input
- Accepts any startup data structure (based on deck schema)
- No rigid field requirements
- Backward compatibility with original simple inputs

### 2. Comprehensive Benchmark Vectors

The system now analyzes across 6 key vectors:

1. **Companies & Products** 🏆
   - Top performing companies and rankings
   - Revenue, employees, valuations, stock prices
   - Major competitors analysis
   - Similar to Yahoo Finance top performers

2. **Consumer & Brands** 👥
   - Consumer behavior and attitudes
   - Survey data on usage patterns
   - Brand preferences and sentiment
   - Sources like ProductHunt, Reddit discussions

3. **Countries & Regions** 🌍
   - Economic indicators (GDP, finance, demographics)
   - Regional development and trade figures
   - Major industry players by region
   - Market entry opportunities

4. **Digital & Trends** 💻
   - Technology trends (5G, AI, digitalization)
   - Cybersecurity, cloud computing, robotics
   - E-commerce and VR developments
   - Innovation and disruption patterns

5. **Industries & Markets** 📊
   - Comprehensive market data and revenues
   - Industry state, trends, and forecasts
   - Market consolidation and M&A activity
   - Employment and workforce statistics

6. **Politics & Society** 🏛️
   - Political stability and business climate
   - Demographics, education, health
   - ESG factors and social responsibility
   - Policy changes affecting business

## API Usage

### New Endpoint Format

```bash
POST /research
Content-Type: application/json

{
  "startup_data": {
    "named_entities": {
      "organizations": {
        "company": {
          "legal_name": "Your Company Name",
          "website_url": "https://yourcompany.com"
        },
        "competitors": [
          {"name": "Competitor A", "type": "direct"},
          {"name": "Competitor B", "type": "indirect"}
        ]
      },
      "locations": {
        "headquarters": {
          "city": "San Francisco",
          "country": "United States"
        },
        "target_markets": [
          {"region": "North America", "market_entry_status": "active"}
        ]
      }
    },
    "business_model_classification": {
      "primary_model": "b2b",
      "revenue_model": "saas"
    },
    "market_analysis": {
      "tam": {"global_value": 10000000000},
      "sam": {"value": 1000000000}
    },
    "technologies": {
      "core_tech": ["AI", "Machine Learning"],
      "ai_ml_capabilities": ["NLP", "Computer Vision"]
    }
  },

  // Backward compatibility (optional)
  "company": "Your Company Name",
  "industry": "Technology",
  "hq_location": "San Francisco, CA"
}
```

### Response

The system returns comprehensive analysis across all vectors:

- Market positioning and competitive intelligence
- Consumer sentiment and behavior insights
- Regional economic context and opportunities
- Technology trends and digital transformation
- Industry benchmarks and market data
- Political and social factors

## Testing

Run the test script to verify the system:

```bash
python test_benchmark.py
```

Make sure the application is running on localhost:8000 first.

## Key Improvements

1. **Flexible Input**: No more rigid schema requirements
2. **Comprehensive Analysis**: 10 specialized analysts vs 4 original
3. **Rich Context**: Uses full startup data context for better queries
4. **Benchmark Focus**: Specifically designed for competitive analysis
5. **Vector Coverage**: All major analysis dimensions covered
6. **Direct Results**: No MongoDB dependency, returns results directly

## Example Use Cases

- **Investment Analysis**: Comprehensive due diligence with market context
- **Competitive Intelligence**: Deep competitor and market analysis
- **Market Entry**: Regional opportunities and regulatory landscape
- **Strategic Planning**: Technology trends and industry forecasts
- **Risk Assessment**: Political, social, and economic factors
- **Brand Positioning**: Consumer insights and sentiment analysis

The system now provides institutional-grade analysis across all key dimensions needed for startup evaluation and benchmarking.