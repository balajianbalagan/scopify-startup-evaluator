import logging
from typing import Dict, Any
from .base import BaseResearcher
from classes import ResearchState

logger = logging.getLogger(__name__)

class CompaniesProductsAnalyzer(BaseResearcher):
    """
    Analyzes top companies and products in all major industries and regions.
    Focuses on company overviews, rankings, revenue, employees, company value,
    stock price, and major competitors.
    """

    def __init__(self):
        super().__init__()
        self.analyst_type = "companies_products_analyst"

    async def run(self, state: ResearchState) -> ResearchState:
        startup_data = state.get('startup_data', {})
        company = state.get('company', 'Unknown Company')
        industry = state.get('industry', 'Unknown Industry')
        hq_location = state.get('hq_location', 'Unknown Location')

        logger.info(f"Starting Companies & Products analysis for {company}")

        # Generate specialized queries for companies and products analysis
        prompt = self._build_analysis_prompt(startup_data, company, industry, hq_location)
        queries = await self.generate_queries(state, prompt)

        if queries:
            logger.info(f"Generated {len(queries)} Companies & Products queries: {queries}")
            docs = await self.search_documents(state, queries)
            state['companies_products_data'] = docs
            logger.info(f"Companies & Products analysis collected {len(docs)} documents")
        else:
            logger.warning("No Companies & Products queries generated")
            state['companies_products_data'] = {}

        return state

    def _build_analysis_prompt(self, startup_data: Dict[str, Any], company: str, industry: str, hq_location: str) -> str:
        """
        Build a specialized prompt for Companies & Products benchmark analysis
        """
        # Extract relevant information from startup schema
        competitors = []
        target_market = ""
        products_services = []
        market_size = ""

        if startup_data:
            # Extract competitors
            orgs = startup_data.get('named_entities', {}).get('organizations', {})
            if 'competitors' in orgs:
                competitors = [comp.get('name', '') for comp in orgs['competitors'] if comp.get('name')]

            # Extract products/services
            if 'products_services' in startup_data:
                products_services = [p.get('name', '') for p in startup_data['products_services'] if p.get('name')]

            # Extract market analysis
            market_analysis = startup_data.get('market_analysis', {})
            if 'tam' in market_analysis:
                market_size = f"TAM: ${market_analysis['tam'].get('global_value', 'Unknown')}"

            # Extract target markets
            locations = startup_data.get('named_entities', {}).get('locations', {})
            if 'target_markets' in locations:
                target_market = ', '.join([tm.get('region', '') for tm in locations['target_markets'] if tm.get('region')])

        competitor_info = f"Known competitors: {', '.join(competitors[:5])}" if competitors else ""
        product_info = f"Products/Services: {', '.join(products_services[:3])}" if products_services else ""

        return f"""
        You are conducting market-level competitive intelligence and benchmarking analysis.

        Context for Benchmarking:
        - Target Industry: {industry}
        - Geographic Focus: {hq_location}
        - Business Model Context: {product_info}
        - Known Competitors: {competitor_info}
        - Market Size Context: {market_size}
        - Target Markets: {target_market}

        Generate search queries to find MARKET-LEVEL insights:
        1. Top performing companies in {industry} industry 2024 rankings revenue
        2. {industry} market leaders financial performance valuations funding
        3. {industry} industry competitive landscape market share analysis
        4. {industry} technology companies stock performance unicorns IPO
        5. Global {industry} market size growth rate competition trends

        Focus on industry benchmarks, market data, and competitive landscape - NOT specific company research.
        """