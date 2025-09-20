import logging
from typing import Dict, Any
from .base import BaseResearcher
from classes import ResearchState

logger = logging.getLogger(__name__)

class IndustriesMarketsAnalyzer(BaseResearcher):
    """
    Analyzes comprehensive market and industry data.
    Focuses on market overviews, revenues, employee counts,
    industry state, trends, and forecasts.
    """

    def __init__(self):
        super().__init__()
        self.analyst_type = "industries_markets_analyst"

    async def run(self, state: ResearchState) -> ResearchState:
        startup_data = state.get('startup_data', {})
        company = state.get('company', 'Unknown Company')
        industry = state.get('industry', 'Unknown Industry')
        hq_location = state.get('hq_location', 'Unknown Location')

        logger.info(f"Starting Industries & Markets analysis for {company}")

        # Generate specialized queries for industries and markets analysis
        prompt = self._build_analysis_prompt(startup_data, company, industry, hq_location)
        queries = await self.generate_queries(state, prompt)

        if queries:
            logger.info(f"Generated {len(queries)} Industries & Markets queries: {queries}")
            docs = await self.search_documents(state, queries)
            state['industries_markets_data'] = docs
            logger.info(f"Industries & Markets analysis collected {len(docs)} documents")
        else:
            logger.warning("No Industries & Markets queries generated")
            state['industries_markets_data'] = {}

        return state

    def _build_analysis_prompt(self, startup_data: Dict[str, Any], company: str, industry: str, hq_location: str) -> str:
        """
        Build a specialized prompt for Industries & Markets benchmark analysis
        """
        # Extract relevant information from startup schema
        market_size_info = ""
        growth_rates = ""
        business_model = ""
        revenue_model = ""
        market_position = ""

        if startup_data:
            # Extract market analysis
            market_analysis = startup_data.get('market_analysis', {})

            # TAM/SAM/SOM information with defensive programming
            tam = market_analysis.get('tam') or {}
            sam = market_analysis.get('sam') or {}
            som = market_analysis.get('som') or {}

            if tam and tam.get('global_value'):
                market_size_info = f"TAM: ${tam['global_value']}"
            if sam and sam.get('value'):
                market_size_info += f", SAM: ${sam['value']}"
            if som and som.get('value'):
                market_size_info += f", SOM: ${som['value']}"

            # Market dynamics with defensive programming
            dynamics = market_analysis.get('market_dynamics') or {}
            if dynamics and dynamics.get('growth_rate'):
                growth_rates = f"Market growth rate: {dynamics['growth_rate']}%"

            # Competitive landscape with defensive programming
            competitive = market_analysis.get('competitive_landscape') or {}
            if competitive and competitive.get('positioning'):
                market_position = f"Positioning: {competitive['positioning']}"

            # Business model with defensive programming
            biz_model = startup_data.get('business_model_classification') or {}
            business_model = biz_model.get('primary_model', '') if biz_model else ''
            revenue_model = biz_model.get('revenue_model', '') if biz_model else ''

        return f"""
        You are conducting comprehensive market and industry benchmarking analysis.

        Market Context:
        - Industry: {industry}
        - Region: {hq_location}
        - Business Model: {business_model}
        - Revenue Model: {revenue_model}
        - {market_size_info}
        - {growth_rates}
        - {market_position}

        Generate search queries for MARKET-LEVEL industry insights:
        1. {industry} industry market size revenue trends 2024 global analysis
        2. {industry} market growth forecasts projections industry reports
        3. {industry} industry employment workforce statistics trends
        4. {industry} market consolidation M&A activity venture funding
        5. Global {industry} market dynamics regulatory environment standards

        Focus on comprehensive industry data and market benchmarks - NOT specific companies.
        """