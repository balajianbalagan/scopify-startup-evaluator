from typing import TypedDict, NotRequired, Required, Dict, List, Any
from services.websocket_manager import WebSocketManager

#Define the input state
class InputState(TypedDict, total=False):
    company: Required[str]
    company_url: NotRequired[str]
    hq_location: NotRequired[str]
    industry: NotRequired[str]
    startup_data: NotRequired[Dict[str, Any]]  # Full deck schema data
    websocket_manager: NotRequired[WebSocketManager]
    job_id: NotRequired[str]

class ResearchState(InputState):
    site_scrape: Dict[str, Any]
    messages: List[Any]

    # Original research data fields
    financial_data: Dict[str, Any]
    news_data: Dict[str, Any]
    industry_data: Dict[str, Any]
    company_data: Dict[str, Any]

    # New benchmark analysis data fields
    companies_products_data: Dict[str, Any]  # Top companies and products analysis
    consumer_brands_data: Dict[str, Any]     # Consumer behavior and attitudes
    countries_regions_data: Dict[str, Any]   # Economic indicators and development
    digital_trends_data: Dict[str, Any]      # Technology trends and digitalization
    industries_markets_data: Dict[str, Any]  # Market overviews and industry data
    politics_society_data: Dict[str, Any]    # Political and social topics

    # Curated data for each vector
    curated_financial_data: Dict[str, Any]
    curated_news_data: Dict[str, Any]
    curated_industry_data: Dict[str, Any]
    curated_company_data: Dict[str, Any]
    curated_companies_products_data: Dict[str, Any]
    curated_consumer_brands_data: Dict[str, Any]
    curated_countries_regions_data: Dict[str, Any]
    curated_digital_trends_data: Dict[str, Any]
    curated_industries_markets_data: Dict[str, Any]
    curated_politics_society_data: Dict[str, Any]

    # Briefings for each vector
    financial_briefing: str
    news_briefing: str
    industry_briefing: str
    company_briefing: str
    companies_products_briefing: str
    consumer_brands_briefing: str
    countries_regions_briefing: str
    digital_trends_briefing: str
    industries_markets_briefing: str
    politics_society_briefing: str

    references: List[str]
    briefings: Dict[str, Any]
    report: str
