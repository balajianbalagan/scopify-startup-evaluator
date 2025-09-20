import logging
from langchain_core.messages import AIMessage

from classes import ResearchState

logger = logging.getLogger(__name__)


class Collector:
    """Collects and organizes all research data before curation."""

    async def collect(self, state: ResearchState) -> ResearchState:
        """Collect and verify all research data is present."""
        if state is None:
            logger.error("State is None in collector!")
            return {"error": "State is None"}

        company = state.get('company', 'Unknown Company')
        msg = [f"📦 Collecting research data for {company}:"]
        logger.info(f"Collector processing state for {company}")

        if websocket_manager := state.get('websocket_manager'):
            if job_id := state.get('job_id'):
                await websocket_manager.send_status_update(
                    job_id=job_id,
                    status="processing",
                    message=f"Collecting research data for {company}",
                    result={"step": "Collecting"}
                )
        
        # Check each type of research data (original + benchmark vectors)
        research_types = {
            'financial_data': '💰 Financial',
            'news_data': '📰 News',
            'industry_data': '🏭 Industry',
            'company_data': '🏢 Company',
            'companies_products_data': '🏆 Companies & Products',
            'consumer_brands_data': '👥 Consumer & Brands',
            'countries_regions_data': '🌍 Countries & Regions',
            'digital_trends_data': '💻 Digital & Trends',
            'industries_markets_data': '📊 Industries & Markets',
            'politics_society_data': '🏛️ Politics & Society'
        }
        
        for data_field, label in research_types.items():
            data = state.get(data_field, {})
            if data:
                msg.append(f"• {label}: {len(data)} documents collected")
            else:
                msg.append(f"• {label}: No data found")
        
        # Update state with collection message
        messages = state.get('messages', [])
        messages.append(AIMessage(content="\n".join(msg)))
        state['messages'] = messages
        
        return state

    async def run(self, state: ResearchState) -> ResearchState:
        return await self.collect(state)