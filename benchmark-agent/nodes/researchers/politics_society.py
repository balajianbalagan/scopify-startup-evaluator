import logging
from typing import Dict, Any
from .base import BaseResearcher
from classes import ResearchState

logger = logging.getLogger(__name__)

class PoliticsSocietyAnalyzer(BaseResearcher):
    """
    Analyzes political and social factors.
    Focuses on economic situation, elections, demographics,
    religious affiliations, education, and health by region.
    """

    def __init__(self):
        super().__init__()
        self.analyst_type = "politics_society_analyst"

    async def run(self, state: ResearchState) -> ResearchState:
        startup_data = state.get('startup_data', {})
        company = state.get('company', 'Unknown Company')
        industry = state.get('industry', 'Unknown Industry')
        hq_location = state.get('hq_location', 'Unknown Location')

        logger.info(f"Starting Politics & Society analysis for {company}")

        # Generate specialized queries for politics and society analysis
        prompt = self._build_analysis_prompt(startup_data, company, industry, hq_location)
        queries = await self.generate_queries(state, prompt)

        if queries:
            logger.info(f"Generated {len(queries)} Politics & Society queries: {queries}")
            docs = await self.search_documents(state, queries)
            state['politics_society_data'] = docs
            logger.info(f"Politics & Society analysis collected {len(docs)} documents")
        else:
            logger.warning("No Politics & Society queries generated")
            state['politics_society_data'] = {}

        return state

    def _build_analysis_prompt(self, startup_data: Dict[str, Any], company: str, industry: str, hq_location: str) -> str:
        """
        Build a specialized prompt for Politics & Society benchmark analysis
        """
        # Extract relevant information from startup schema
        target_regions = []
        headquarters_country = ""
        regulatory_risks = []
        esg_impact = ""

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
                        target_regions.append(tm['region'])
                    if tm.get('countries'):
                        target_regions.extend(tm['countries'])

            # Extract regulatory risks
            risk_assessment = startup_data.get('risk_assessment', {})
            if 'business_risks' in risk_assessment:
                reg_risk = risk_assessment['business_risks'].get('regulatory_risk', {})
                if reg_risk.get('factors'):
                    regulatory_risks = reg_risk['factors']

            # Extract ESG impact information
            esg = startup_data.get('esg_impact', {})
            if esg:
                social_impact = esg.get('social', {})
                if social_impact.get('jobs_created'):
                    esg_impact = f"Jobs created: {social_impact['jobs_created']}"
                if social_impact.get('community_impact'):
                    esg_impact += f", Community impact: {social_impact['community_impact']}"

        all_regions = list(set([headquarters_country] + target_regions))
        all_regions = [r for r in all_regions if r]  # Remove empty strings

        regulatory_context = ', '.join(regulatory_risks[:3]) if regulatory_risks else ""

        return f"""
        You are analyzing political and social factors for benchmarking {company}.

        Company Context:
        - Company: {company}
        - Industry: {industry}
        - Headquarters: {headquarters_country or hq_location}
        - Target regions: {', '.join(target_regions)}
        - Regulatory concerns: {regulatory_context}
        - {esg_impact}

        Generate search queries to find:
        1. Political stability and business environment in {', '.join(all_regions[:5]) if all_regions else hq_location}
        2. Regulatory landscape and policy changes affecting {industry}
        3. Social trends and demographics impacting the business
        4. Education and workforce development in key markets
        5. Healthcare and social infrastructure quality
        6. ESG regulations and social responsibility expectations
        7. Election outcomes and policy implications for business

        Focus on understanding political and social context affecting business operations.
        """