import logging
import os
from typing import Any, Dict

import google.generativeai as genai
from langchain_core.messages import AIMessage

from classes import ResearchState
from utils.references import format_references_section

logger = logging.getLogger(__name__)




class Editor:
    """Compiles individual section briefings into a cohesive final report."""
    
    def __init__(self) -> None:
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        if not self.gemini_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")

        # Configure Gemini - using Flash Lite for faster processing
        genai.configure(api_key=self.gemini_key)
        self.gemini_model = genai.GenerativeModel('gemini-2.5-flash-lite')

        # Initialize context dictionary for use across methods
        self.context = {
            "company": "Unknown Company",
            "industry": "Unknown",
            "hq_location": "Unknown"
        }

    async def compile_briefings(self, state: ResearchState) -> ResearchState:
        """Compile individual briefing categories from state into a final report."""
        company = state.get('company', 'Unknown Company')
        
        # Update context with values from state
        self.context = {
            "company": company,
            "industry": state.get('industry', 'Unknown'),
            "hq_location": state.get('hq_location', 'Unknown')
        }
        
        # Send initial compilation status
        if websocket_manager := state.get('websocket_manager'):
            if job_id := state.get('job_id'):
                await websocket_manager.send_status_update(
                    job_id=job_id,
                    status="processing",
                    message=f"Starting report compilation for {company}",
                    result={
                        "step": "Editor",
                        "substep": "initialization"
                    }
                )

        context = {
            "company": company,
            "industry": state.get('industry', 'Unknown'),
            "hq_location": state.get('hq_location', 'Unknown')
        }
        
        msg = [f"📑 Compiling final report for {company}..."]
        
        # Pull individual briefings from dedicated state keys - updated for benchmark analysis
        briefing_keys = {
            'companies_products': 'companies_products_briefing',
            'consumer_brands': 'consumer_brands_briefing',
            'countries_regions': 'countries_regions_briefing',
            'digital_trends': 'digital_trends_briefing',
            'industries_markets': 'industries_markets_briefing',
            'politics_society': 'politics_society_briefing'
        }

        # Send briefing collection status
        if websocket_manager := state.get('websocket_manager'):
            if job_id := state.get('job_id'):
                await websocket_manager.send_status_update(
                    job_id=job_id,
                    status="processing",
                    message="Collecting section briefings",
                    result={
                        "step": "Editor",
                        "substep": "collecting_briefings"
                    }
                )

        individual_briefings = {}
        for category, key in briefing_keys.items():
            if content := state.get(key):
                individual_briefings[category] = content
                msg.append(f"Found {category} briefing ({len(content)} characters)")
            else:
                msg.append(f"No {category} briefing available")
                logger.error(f"Missing state key: {key}")
        
        if not individual_briefings:
            msg.append("\n⚠️ No briefing sections available to compile")
            logger.error("No briefings found in state")
        else:
            try:
                compiled_report = await self.edit_report(state, individual_briefings, context)
                if not compiled_report or not compiled_report.strip():
                    logger.error("Compiled report is empty!")
                else:
                    logger.info(f"Successfully compiled report with {len(compiled_report)} characters")
            except Exception as e:
                logger.error(f"Error during report compilation: {e}")
        state.setdefault('messages', []).append(AIMessage(content="\n".join(msg)))
        return state
    
    async def edit_report(self, state: ResearchState, briefings: Dict[str, str], context: Dict[str, Any]) -> str:
        """Compile section briefings into a final report and update the state."""
        try:
            company = self.context["company"]
            
            # Step 1: Initial Compilation
            if websocket_manager := state.get('websocket_manager'):
                if job_id := state.get('job_id'):
                    await websocket_manager.send_status_update(
                        job_id=job_id,
                        status="processing",
                        message="Compiling initial research report",
                        result={
                            "step": "Editor",
                            "substep": "compilation"
                        }
                    )

            edited_report = await self.compile_content(state, briefings, company)
            if not edited_report:
                logger.error("Initial compilation failed")
                return ""

            # Step 2: Deduplication and Cleanup
            if websocket_manager := state.get('websocket_manager'):
                if job_id := state.get('job_id'):
                    await websocket_manager.send_status_update(
                        job_id=job_id,
                        status="processing",
                        message="Cleaning up and organizing report",
                        result={
                            "step": "Editor",
                            "substep": "cleanup"
                        }
                    )

            # Step 3: Formatting Final Report
            if websocket_manager := state.get('websocket_manager'):
                if job_id := state.get('job_id'):
                    await websocket_manager.send_status_update(
                        job_id=job_id,
                        status="processing",
                        message="Formatting final report",
                        result={
                            "step": "Editor",
                            "substep": "format"
                        }
                    )
            final_report = await self.content_sweep(state, edited_report, company)
            
            final_report = final_report or ""
            
            logger.info(f"Final report compiled with {len(final_report)} characters")
            if not final_report.strip():
                logger.error("Final report is empty!")
                return ""
            
            logger.info("Final report preview:")
            logger.info(final_report[:500])
            
            # Update state with the final report in two locations
            state['report'] = final_report
            state['status'] = "editor_complete"
            if 'editor' not in state or not isinstance(state['editor'], dict):
                state['editor'] = {}
            state['editor']['report'] = final_report
            logger.info(f"Report length in state: {len(state.get('report', ''))}")
            
            if websocket_manager := state.get('websocket_manager'):
                if job_id := state.get('job_id'):
                    await websocket_manager.send_status_update(
                        job_id=job_id,
                        status="editor_complete",
                        message="Research report completed",
                        result={
                            "step": "Editor",
                            "report": final_report,
                            "company": company,
                            "is_final": True,
                            "status": "completed"
                        }
                    )
            
            return final_report
        except Exception as e:
            logger.error(f"Error in edit_report: {e}")
            return ""
    
    async def compile_content(self, state: ResearchState, briefings: Dict[str, str], company: str) -> str:
        """Initial compilation of research sections."""
        combined_content = "\n\n".join(content for content in briefings.values())
        
        references = state.get('references', [])
        reference_text = ""

        # Debug: Log state keys and reference data
        logger.info(f"Editor state keys: {list(state.keys())}")
        logger.info(f"References from state: {references}")

        if references:
            logger.info(f"Found {len(references)} references to add during compilation")
            
            # Get pre-processed reference info from curator
            reference_info = state.get('reference_info', {})
            reference_titles = state.get('reference_titles', {})
            
            logger.info(f"Reference info from state: {reference_info}")
            logger.info(f"Reference titles from state: {reference_titles}")
            
            # Use the references module to format the references section
            reference_text = format_references_section(references, reference_info, reference_titles)
            logger.info(f"Added {len(references)} references during compilation")
        
        # Use values from centralized context
        company = self.context["company"]
        industry = self.context["industry"]
        hq_location = self.context["hq_location"]
        
        prompt = f"""Create a comprehensive benchmark analysis report for {company} ({industry}, {hq_location}) with interactive charts.

CHART CAPABILITIES:
You can embed interactive charts in Markdown using fenced code blocks with language "markdown-ui-widget".

**Available Chart Types:**
- chart-line: For trends over time (revenue growth, market trends, performance over years)
- chart-bar: For comparisons between entities (competitor revenue, market share, employee counts)
- chart-pie: For distribution/breakdown (market share, regional revenue, funding sources)
- chart-scatter: For correlation analysis (technology adoption vs impact, risk vs return)

**Chart Syntax:**
```markdown-ui-widget
chart-line
title: Market Growth Trends
height: 300
Year,Revenue ($M),Growth Rate (%)
2020,100,15
2021,115,18
2022,135,20
```

**CHART RULES:**
- ALWAYS use ```markdown-ui-widget as the fenced code block language
- Use real data from briefings to populate charts
- All monetary values in USD ($)
- Choose appropriate chart type based on data nature
- Add charts only where data supports meaningful visualization

Source briefings:
{combined_content}

REPORT STRUCTURE:

# {company} Benchmark Analysis Report

## Competitive Landscape
- Market Leaders (with comparative charts)
- Direct Competitors (with competitive analysis)
- Product Benchmarking (with feature/performance comparisons)

## Market Intelligence
- Industry Overview (with market trend charts)
- Market Dynamics (with growth/size visualizations)
- Performance Metrics (with comparative data)

## Consumer Insights
- Consumer Sentiment (with trend analysis)
- Usage Patterns (with behavioral data)
- Market Preferences (with preference analysis)

## Technology Trends
- Technology Adoption (with adoption curves)
- Digital Transformation (with implementation data)
- Emerging Technologies (with impact analysis)

## Regional Analysis
- Economic Indicators (with regional breakdowns)
- Market Opportunities (with geographic data)
- Regulatory Environment (with compliance analysis)

## Political & Social Context
- Political Environment (with stability metrics)
- Social Trends (with demographic shifts)
- ESG Factors (with sustainability metrics)

INSTRUCTIONS:
1. Use real data from briefings to create meaningful charts
2. Add charts strategically where data supports visualization
3. Keep all existing analytical depth and insights
4. CURRENCY: All monetary values in USD ($) with conversions
5. Choose chart types based on data characteristics and analytical value"""

        try:
            full_prompt = f"""You are an expert report editor that compiles research briefings into comprehensive company reports.

{prompt}"""

            response = self.gemini_model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0,
                    max_output_tokens=4096,
                )
            )
            initial_report = response.text.strip()
            
            # Append the references section after LLM processing
            if reference_text:
                initial_report = f"{initial_report}\n\n{reference_text}"
            
            return initial_report
        except Exception as e:
            logger.error(f"Error in initial compilation: {e}")
            return (combined_content or "").strip()
        
    async def content_sweep(self, state: ResearchState, content: str, company: str) -> str:
        """Sweep the content for any redundant information."""
        # Use values from centralized context
        company = self.context["company"]
        industry = self.context["industry"]
        hq_location = self.context["hq_location"]
        
        prompt = f"""Clean and format interactive benchmark report for {company} ({industry}, {hq_location}).

Input:
{content}

Tasks:
1. Remove redundancy/repetition
2. Remove empty sections
3. Remove meta-commentary
4. Keep ALL substantive market insights and analysis
5. PRESERVE ALL ```markdown-ui-widget blocks EXACTLY as they are
6. Maintain full content depth in all sections

Required structure:
# {company} Benchmark Analysis Report
## Competitive Landscape
## Market Intelligence
## Consumer Insights
## Technology Trends
## Regional Analysis
## Political & Social Context
## References

CRITICAL RULES:
- Preserve ALL ```markdown-ui-widget blocks completely unchanged
- Keep full analysis depth in each section
- Maintain all bullet points and detailed insights
- Ensure clean markdown formatting with ### subsections
- Interactive widgets should enhance, not replace content
- CURRENCY: Display ALL monetary values in USD ($) only. Convert foreign currencies to USD approximations."""

        try:
            full_prompt = f"""You are an expert markdown formatter that ensures consistent document structure.

{prompt}"""

            response = self.gemini_model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0,
                    max_output_tokens=4096,
                ),
                stream=True
            )
            
            accumulated_text = ""
            buffer = ""

            for chunk in response:
                chunk_text = chunk.text
                if chunk_text:
                    accumulated_text += chunk_text
                    buffer += chunk_text

                    if any(char in buffer for char in ['.', '!', '?', '\n']) and len(buffer) > 10:
                        if websocket_manager := state.get('websocket_manager'):
                            if job_id := state.get('job_id'):
                                await websocket_manager.send_status_update(
                                    job_id=job_id,
                                    status="report_chunk",
                                    message="Formatting final report",
                                    result={
                                        "chunk": buffer,
                                        "step": "Editor"
                                    }
                                )
                        buffer = ""

            # Send final buffer if any remains
            websocket_manager = state.get('websocket_manager')
            if websocket_manager and buffer:
                job_id = state.get('job_id')
                if job_id:
                    await websocket_manager.send_status_update(
                        job_id=job_id,
                        status="report_chunk",
                        message="Formatting final report",
                        result={
                            "chunk": buffer,
                            "step": "Editor"
                        }
                    )
            
            return (accumulated_text or "").strip()
        except Exception as e:
            logger.error(f"Error in formatting: {e}")
            return (content or "").strip()

    async def run(self, state: ResearchState) -> ResearchState:
        state = await self.compile_briefings(state)
        # Ensure the Editor node's output is stored both top-level and under "editor"
        if 'report' in state:
            if 'editor' not in state or not isinstance(state['editor'], dict):
                state['editor'] = {}
            state['editor']['report'] = state['report']
        return state
