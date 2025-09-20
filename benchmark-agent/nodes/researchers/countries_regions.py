import logging
from typing import Dict, Any
from .base import BaseResearcher
from classes import ResearchState

logger = logging.getLogger(__name__)

class CountriesRegionsAnalyzer(BaseResearcher):
    """
    Analyzes countries and regions economic data.
    Focuses on economic indicators like GDP, national finance, demographics,
    trade figures, and major industry players by region.
    """

    def __init__(self):
        super().__init__()
        self.analyst_type = "countries_regions_analyst"

    async def run(self, state: ResearchState) -> ResearchState:
        startup_data = state.get('startup_data', {})
        company = state.get('company', 'Unknown Company')
        industry = state.get('industry', 'Unknown Industry')
        hq_location = state.get('hq_location', 'Unknown Location')

        logger.info(f"Starting Countries & Regions analysis for {company}")

        # Generate specialized queries for countries and regions analysis
        prompt = self._build_analysis_prompt(startup_data, company, industry, hq_location)
        queries = await self.generate_queries(state, prompt)

        if queries:
            logger.info(f"Generated {len(queries)} Countries & Regions queries: {queries}")
            docs = await self.search_documents(state, queries)
            state['countries_regions_data'] = docs
            logger.info(f"Countries & Regions analysis collected {len(docs)} documents")
        else:
            logger.warning("No Countries & Regions queries generated")
            state['countries_regions_data'] = {}

        return state

    def _build_analysis_prompt(self, startup_data: Dict[str, Any], company: str, industry: str, hq_location: str) -> str:
        """
        Build a specialized prompt for Countries & Regions benchmark analysis
        """
        # Extract relevant information from startup schema
        target_markets = []
        headquarters_country = ""
        offices_countries = []
        market_entry_status = []

        if startup_data:
            # Extract location information
            locations = startup_data.get('named_entities', {}).get('locations', {})

            # Extract headquarters country
            hq_info = locations.get('headquarters', {})
            headquarters_country = hq_info.get('country', '')

            # Extract target markets
            if 'target_markets' in locations:
                for tm in locations['target_markets']:
                    if tm.get('region'):
                        target_markets.append(tm['region'])
                    if tm.get('countries'):
                        target_markets.extend(tm['countries'])
                    if tm.get('market_entry_status'):
                        market_entry_status.append(f"{tm.get('region', 'Unknown')}: {tm['market_entry_status']}")

            # Extract office locations
            if 'offices' in locations:
                offices_countries = [office.get('country', '') for office in locations['offices'] if office.get('country')]

        all_regions = list(set([headquarters_country] + target_markets + offices_countries))
        all_regions = [r for r in all_regions if r]  # Remove empty strings

        market_status_info = f"Market entry status: {', '.join(market_entry_status)}" if market_entry_status else ""

        return f"""
        You are analyzing economic and regional factors for benchmarking {company}.

        Company Context:
        - Company: {company}
        - Industry: {industry}
        - Headquarters: {headquarters_country or hq_location}
        - Target regions: {', '.join(target_markets)}
        - Office locations: {', '.join(offices_countries)}
        - {market_status_info}

        Generate search queries to find:
        1. Economic indicators (GDP, growth rates) for {', '.join(all_regions[:5]) if all_regions else hq_location}
        2. {industry} industry development and regulations by region
        3. Market size and opportunity assessment for each target region
        4. Trade policies and business environment in key markets
        5. Demographics and population trends affecting the industry
        6. Regional competitive landscape and major players

        Focus on understanding regional economic context and market opportunities.
        """