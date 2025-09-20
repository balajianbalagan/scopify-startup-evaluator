import logging
from typing import Dict, Any
from .base import BaseResearcher
from classes import ResearchState

logger = logging.getLogger(__name__)

class ConsumerBrandsAnalyzer(BaseResearcher):
    """
    Analyzes consumer behavior and brand sentiment.
    Focuses on survey data, usage patterns, behavior and attitudes,
    opinions and preferences across different countries and industries.
    """

    def __init__(self):
        super().__init__()
        self.analyst_type = "consumer_brands_analyst"

    async def run(self, state: ResearchState) -> ResearchState:
        startup_data = state.get('startup_data', {})
        company = state.get('company', 'Unknown Company')
        industry = state.get('industry', 'Unknown Industry')
        hq_location = state.get('hq_location', 'Unknown Location')

        logger.info(f"Starting Consumer & Brands analysis for {company}")

        # Generate specialized queries for consumer and brands analysis
        prompt = self._build_analysis_prompt(startup_data, company, industry, hq_location)
        queries = await self.generate_queries(state, prompt)

        if queries:
            logger.info(f"Generated {len(queries)} Consumer & Brands queries: {queries}")
            docs = await self.search_documents(state, queries)
            state['consumer_brands_data'] = docs
            logger.info(f"Consumer & Brands analysis collected {len(docs)} documents")
        else:
            logger.warning("No Consumer & Brands queries generated")
            state['consumer_brands_data'] = {}

        return state

    def _build_analysis_prompt(self, startup_data: Dict[str, Any], company: str, industry: str, hq_location: str) -> str:
        """
        Build a specialized prompt for Consumer & Brands benchmark analysis
        """
        # Extract relevant information from startup schema
        target_customers = ""
        business_model = ""
        customer_metrics = ""
        target_markets = []

        if startup_data:
            # Extract customer information
            orgs = startup_data.get('named_entities', {}).get('organizations', {})
            if 'customers' in orgs:
                customer_types = [cust.get('type', '') for cust in orgs['customers'] if cust.get('type')]
                target_customers = f"Customer types: {', '.join(set(customer_types))}"

            # Extract business model
            biz_model = startup_data.get('business_model_classification', {})
            primary_model = biz_model.get('primary_model', '')
            revenue_model = biz_model.get('revenue_model', '')
            business_model = f"Model: {primary_model} / {revenue_model}" if primary_model or revenue_model else ""

            # Extract customer metrics
            operational_metrics = startup_data.get('operational_metrics', {})
            if 'customer_metrics' in operational_metrics:
                cust_metrics = operational_metrics['customer_metrics']
                nps = cust_metrics.get('nps_score')
                csat = cust_metrics.get('csat_score')
                if nps or csat:
                    customer_metrics = f"NPS: {nps}, CSAT: {csat}"

            # Extract target markets
            locations = startup_data.get('named_entities', {}).get('locations', {})
            if 'target_markets' in locations:
                target_markets = [tm.get('region', '') for tm in locations['target_markets'] if tm.get('region')]

        target_market_info = f"Target markets: {', '.join(target_markets)}" if target_markets else ""

        return f"""
        Generate search queries for consumer behavior market analysis.

        Target Industry: {industry}
        Target Region: {hq_location}
        Business Model: {business_model}

        Generate exactly 4 search queries about MARKET BEHAVIOR (NOT specific companies):
        1. {industry} industry consumer behavior trends 2024 market research
        2. {industry} enterprise customer satisfaction benchmarks surveys {hq_location}
        3. {industry} market brand loyalty patterns adoption rates global
        4. {industry} customer demographics preferences market analysis

        CRITICAL: Do NOT include any specific company names in the queries.
        Focus only on industry-wide consumer behavior and market data.
        """