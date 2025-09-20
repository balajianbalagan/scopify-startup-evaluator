import logging
from typing import Dict, Any
from .base import BaseResearcher
from classes import ResearchState

logger = logging.getLogger(__name__)

class DigitalTrendsAnalyzer(BaseResearcher):
    """
    Analyzes digital transformation and technology trends.
    Focuses on topics like 5G, AI, digitalization, cyber security,
    cloud computing, robotics, e-commerce, and virtual reality.
    """

    def __init__(self):
        super().__init__()
        self.analyst_type = "digital_trends_analyst"

    async def run(self, state: ResearchState) -> ResearchState:
        startup_data = state.get('startup_data', {})
        company = state.get('company', 'Unknown Company')
        industry = state.get('industry', 'Unknown Industry')
        hq_location = state.get('hq_location', 'Unknown Location')

        logger.info(f"Starting Digital & Trends analysis for {company}")
        logger.info(f"Digital trends startup_data keys: {list(startup_data.keys()) if startup_data else 'None'}")

        # Generate specialized queries for digital trends analysis
        prompt = self._build_analysis_prompt(startup_data, company, industry, hq_location)
        logger.info(f"Digital trends prompt preview: {prompt[:200]}...")
        queries = await self.generate_queries(state, prompt)

        if queries:
            logger.info(f"Generated {len(queries)} Digital & Trends queries: {queries}")
            docs = await self.search_documents(state, queries)
            state['digital_trends_data'] = docs
            logger.info(f"Digital & Trends analysis collected {len(docs)} documents")
        else:
            logger.warning("No Digital & Trends queries generated")
            state['digital_trends_data'] = {}

        return state

    def _build_analysis_prompt(self, startup_data: Dict[str, Any], company: str, industry: str, hq_location: str) -> str:
        """
        Build a specialized prompt for Digital & Trends benchmark analysis
        """
        # Extract relevant information from startup schema
        core_technologies = []
        ai_ml_capabilities = []
        infrastructure = []
        frameworks = []
        product_types = []

        if startup_data:
            # Extract technology information
            tech_info = startup_data.get('technologies', {})
            core_technologies = tech_info.get('core_tech', [])
            ai_ml_capabilities = tech_info.get('ai_ml_capabilities', [])
            infrastructure = tech_info.get('infrastructure', [])
            frameworks = tech_info.get('frameworks', [])

            # Extract product types to understand digital context
            products = startup_data.get('products_services', [])
            product_types = [p.get('type', '') for p in products if p.get('type')]

        tech_stack = ', '.join(core_technologies + frameworks + infrastructure)
        ai_capabilities = ', '.join(ai_ml_capabilities) if ai_ml_capabilities else ""
        product_context = ', '.join(set(product_types)) if product_types else ""

        return f"""
        Generate search queries for technology market analysis.

        Target Industry: {industry}
        Target Region: {hq_location}

        Generate exactly 4 search queries about MARKET TRENDS (NOT specific companies):
        1. {industry} industry digital transformation trends 2024 global market
        2. {industry} AI ML adoption enterprise market analysis {hq_location}
        3. {industry} cybersecurity cloud computing market trends 2024
        4. {industry} automation robotics innovation market impact

        CRITICAL: Do NOT include any specific company names in the queries.
        Focus only on industry-wide trends and market data.
        """