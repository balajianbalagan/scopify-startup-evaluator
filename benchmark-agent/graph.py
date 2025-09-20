import logging
from typing import Any, AsyncIterator, Dict

from langchain_core.messages import SystemMessage
from langgraph.graph import StateGraph

from classes.state import InputState, ResearchState
from nodes import GroundingNode
from nodes.briefing import Briefing
from nodes.collector import Collector
from nodes.curator import Curator
from nodes.editor import Editor
from nodes.enricher import Enricher
from nodes.researchers import (
    CompanyAnalyzer,
    FinancialAnalyst,
    IndustryAnalyzer,
    NewsScanner,
    CompaniesProductsAnalyzer,
    ConsumerBrandsAnalyzer,
    CountriesRegionsAnalyzer,
    DigitalTrendsAnalyzer,
    IndustriesMarketsAnalyzer,
    PoliticsSocietyAnalyzer,
)

logger = logging.getLogger(__name__)

class Graph:
    def __init__(self, company=None, url=None, hq_location=None, industry=None,
                 startup_data=None, websocket_manager=None, job_id=None):
        self.websocket_manager = websocket_manager
        self.job_id = job_id

        # Initialize InputState
        self.input_state = InputState(
            company=company,
            company_url=url,
            hq_location=hq_location,
            industry=industry,
            startup_data=startup_data,  # Add startup data to state
            websocket_manager=websocket_manager,
            job_id=job_id,
            messages=[
                SystemMessage(content="Expert benchmark analyst starting comprehensive analysis")
            ]
        )

        # Initialize nodes with WebSocket manager and job ID
        self._init_nodes()
        self._build_workflow()

    def _init_nodes(self):
        """Initialize all workflow nodes"""
        self.ground = GroundingNode()

        # Original research analysts
        self.financial_analyst = FinancialAnalyst()
        self.news_scanner = NewsScanner()
        self.industry_analyst = IndustryAnalyzer()
        self.company_analyst = CompanyAnalyzer()

        # New benchmark analysts
        self.companies_products_analyst = CompaniesProductsAnalyzer()
        self.consumer_brands_analyst = ConsumerBrandsAnalyzer()
        self.countries_regions_analyst = CountriesRegionsAnalyzer()
        self.digital_trends_analyst = DigitalTrendsAnalyzer()
        self.industries_markets_analyst = IndustriesMarketsAnalyzer()
        self.politics_society_analyst = PoliticsSocietyAnalyzer()

        # Processing nodes
        self.collector = Collector()
        self.curator = Curator()
        self.enricher = Enricher()
        self.briefing = Briefing()
        self.editor = Editor()

    def _build_workflow(self):
        """Configure the state graph workflow"""
        self.workflow = StateGraph(ResearchState)

        # Add nodes with their respective processing functions
        self.workflow.add_node("grounding", self.ground.run)

        # Original research analysts
        self.workflow.add_node("financial_analyst", self.financial_analyst.run)
        self.workflow.add_node("news_scanner", self.news_scanner.run)
        self.workflow.add_node("industry_analyst", self.industry_analyst.run)
        self.workflow.add_node("company_analyst", self.company_analyst.run)

        # New benchmark analysts
        self.workflow.add_node("companies_products_analyst", self.companies_products_analyst.run)
        self.workflow.add_node("consumer_brands_analyst", self.consumer_brands_analyst.run)
        self.workflow.add_node("countries_regions_analyst", self.countries_regions_analyst.run)
        self.workflow.add_node("digital_trends_analyst", self.digital_trends_analyst.run)
        self.workflow.add_node("industries_markets_analyst", self.industries_markets_analyst.run)
        self.workflow.add_node("politics_society_analyst", self.politics_society_analyst.run)

        # Processing nodes
        self.workflow.add_node("collector", self.collector.run)
        self.workflow.add_node("curator", self.curator.run)
        self.workflow.add_node("enricher", self.enricher.run)
        self.workflow.add_node("briefing", self.briefing.run)
        self.workflow.add_node("editor", self.editor.run)

        # Configure workflow for benchmark analysis - back to sequential to avoid LangGraph concurrent update errors
        self.workflow.set_entry_point("collector")
        self.workflow.set_finish_point("editor")

        # Run analysts sequentially to avoid concurrent state updates (LangGraph limitation)
        self.workflow.add_edge("collector", "companies_products_analyst")
        self.workflow.add_edge("companies_products_analyst", "consumer_brands_analyst")
        self.workflow.add_edge("consumer_brands_analyst", "countries_regions_analyst")
        self.workflow.add_edge("countries_regions_analyst", "digital_trends_analyst")
        self.workflow.add_edge("digital_trends_analyst", "industries_markets_analyst")
        self.workflow.add_edge("industries_markets_analyst", "politics_society_analyst")

        # Then process the results
        self.workflow.add_edge("politics_society_analyst", "curator")
        self.workflow.add_edge("curator", "enricher")
        self.workflow.add_edge("enricher", "briefing")
        self.workflow.add_edge("briefing", "editor")

    def compile(self):
        """Compile the workflow for execution"""
        return self.workflow.compile()