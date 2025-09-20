import asyncio
import logging
import os
from typing import Any, Dict, List, Union

import google.generativeai as genai

from classes import ResearchState

logger = logging.getLogger(__name__)

class Briefing:
    """Creates briefings for each research category and updates the ResearchState."""
    
    def __init__(self) -> None:
        self.max_doc_length = 8000  # Maximum document content length
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        if not self.gemini_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")
        
        # Configure Gemini - using Flash Lite for faster processing
        genai.configure(api_key=self.gemini_key)
        self.gemini_model = genai.GenerativeModel('gemini-2.5-flash-lite')

    async def generate_category_briefing(
        self, docs: Union[Dict[str, Any], List[Dict[str, Any]]], 
        category: str, context: Dict[str, Any]
    ) -> Dict[str, Any]:
        company = context.get('company', 'Unknown')
        industry = context.get('industry', 'Unknown')
        hq_location = context.get('hq_location', 'Unknown')
        logger.info(f"Generating {category} briefing for {company} using {len(docs)} documents")

        # Send category start status
        if websocket_manager := context.get('websocket_manager'):
            if job_id := context.get('job_id'):
                await websocket_manager.send_status_update(
                    job_id=job_id,
                    status="briefing_start",
                    message=f"Generating {category} briefing",
                    result={
                        "step": "Briefing",
                        "category": category,
                        "total_docs": len(docs)
                    }
                )

        prompts = {
            'company': f"""Create a focused company briefing for {company}, a {industry} company based in {hq_location}.
Key requirements:
1. Start with: "{company} is a [what] that [does what] for [whom]"
2. Structure using these exact headers and bullet points:

### Core Product/Service
* List distinct products/features
* Include only verified technical capabilities

### Leadership Team
* List key leadership team members
* Include their roles and expertise

### Target Market
* List specific target audiences
* List verified use cases
* List confirmed customers/partners

### Key Differentiators
* List unique features
* List proven advantages

### Business Model
* Discuss product / service pricing
* List distribution channels

3. Each bullet must be a single, complete fact
4. Never mention "no information found" or "no data available"
5. No paragraphs, only bullet points
6. Provide only the briefing. No explanations or commentary.""",

            'industry': f"""Create a focused industry briefing for {company}, a {industry} company based in {hq_location}.
Key requirements:
1. Structure using these exact headers and bullet points:

### Market Overview
* State {company}'s exact market segment
* List market size with year
* List growth rate with year range

### Direct Competition
* List named direct competitors
* List specific competing products
* List market positions

### Competitive Advantages
• List unique technical features
• List proven advantages

### Market Challenges
• List specific verified challenges

2. Each bullet must be a single, complete news event.
3. No paragraphs, only bullet points
4. Never mention "no information found" or "no data available"
5. Provide only the briefing. No explanation.""",

            'financial': f"""Create a focused financial briefing for {company}, a {industry} company based in {hq_location}.
Key requirements:
1. Structure using these headers and bullet points:

### Funding & Investment
* Total funding amount with date
* List each funding round with date
* List named investors

### Revenue Model
* Discuss product / service pricing if applicable

2. Include specific numbers when possible
3. No paragraphs, only bullet points
4. Never mention "no information found" or "no data available"
5. NEVER repeat the same round of funding multiple times. ALWAYS assume that multiple funding rounds in the same month are the same round.
6. NEVER include a range of funding amounts. Use your best judgement to determine the exact amount based on the information provided.
6. Provide only the briefing. No explanation or commentary.""",

            'news': f"""Create a focused news briefing for {company}, a {industry} company based in {hq_location}.
Key requirements:
1. Structure into these categories using bullet points:

### Major Announcements
* Product / service launches
* New initiatives

### Partnerships
* Integrations
* Collaborations

### Recognition
* Awards
* Press coverage

2. Sort newest to oldest
3. One event per bullet point
4. Do not mention "no information found" or "no data available"
5. Never use ### headers, only bullet points
6. Provide only the briefing. Do not provide explanations or commentary.""",

            'companies_products': f"""Create a comprehensive competitive benchmarking briefing for {company}, a {industry} company based in {hq_location}.
Key requirements:
1. Structure using these exact headers and bullet points:

### Market Leaders
* List top 5 companies in the industry with revenue/valuation
* Include market share percentages where available
* List stock performance for public companies

### Direct Competitors
* List companies competing directly with {company}
* Include their key product offerings
* Compare company sizes (employees, revenue, funding)

### Product Benchmarking
* Compare feature sets and capabilities
* List pricing models and strategies
* Include customer bases and target markets

### Performance Metrics
* Revenue comparisons where available
* Growth rates and market positioning
* Employee counts and company valuations

2. Focus on quantitative benchmarking data
3. Include specific numbers and metrics
4. Provide only verified information
5. No explanations or commentary.""",

            'consumer_brands': f"""Create a consumer behavior and brand analysis briefing for {company}, a {industry} company based in {hq_location}.
Key requirements:
1. Structure using these exact headers and bullet points:

### Consumer Sentiment
* Brand perception and reputation scores
* Customer satisfaction metrics
* Social media sentiment analysis

### Usage Patterns
* Adoption rates and user engagement
* Demographics of typical users
* Regional preferences and behaviors

### Market Preferences
* Consumer trends affecting the industry
* Preference shifts and emerging behaviors
* Competitive brand loyalty patterns

### Customer Insights
* Survey data and market research findings
* User feedback and review analysis
* Purchase decision factors

2. Focus on consumer behavior insights
3. Include demographic and psychographic data
4. Reference survey data and market research
5. No explanations or commentary.""",

            'countries_regions': f"""Create a regional economic and market analysis briefing for {company}, a {industry} company based in {hq_location}.
Key requirements:
1. Structure using these exact headers and bullet points:

### Economic Indicators
* GDP growth rates for relevant regions
* Market size by country/region
* Economic development status

### Market Opportunities
* Regional market penetration rates
* Growth potential by geography
* Market entry barriers and opportunities

### Regulatory Environment
* Key regulations affecting the industry
* Government policies and initiatives
* Trade policies and business environment

### Regional Competition
* Major players by region
* Local market leaders and competitors
* Regional competitive advantages

2. Focus on macroeconomic context
3. Include specific economic data and metrics
4. Cover regulatory and policy landscape
5. No explanations or commentary.""",

            'digital_trends': f"""Create a technology and digital transformation briefing for {company}, a {industry} company based in {hq_location}.
Key requirements:
1. Structure using these exact headers and bullet points:

### Technology Adoption
* Digital transformation trends in the industry
* Technology adoption rates and timelines
* Innovation cycles and emerging technologies

### Industry Digitalization
* Automation and AI implementation
* Cloud computing and infrastructure trends
* Cybersecurity requirements and standards

### Emerging Technologies
* Impact of 5G, IoT, blockchain on the sector
* Virtual/Augmented reality applications
* Machine learning and AI use cases

### Digital Competitive Landscape
* Technology leaders and innovators
* Digital product offerings and capabilities
* Technology investment trends

2. Focus on technology impact and adoption
3. Include specific technology metrics
4. Cover innovation and disruption patterns
5. No explanations or commentary.""",

            'industries_markets': f"""Create a comprehensive industry and market analysis briefing for {company}, a {industry} company based in {hq_location}.
Key requirements:
1. Structure using these exact headers and bullet points:

### Industry Overview
* Total market size and revenue
* Industry growth rates and projections
* Key market segments and subsectors

### Market Dynamics
* Supply and demand patterns
* Pricing trends and models
* Market consolidation and M&A activity

### Industry Performance
* Revenue trends and profitability
* Employment and workforce statistics
* Investment flows and funding patterns

### Market Forecasts
* Growth projections and market outlook
* Emerging opportunities and threats
* Industry transformation trends

2. Focus on comprehensive market data
3. Include specific revenue and growth metrics
4. Cover industry-wide trends and patterns
5. No explanations or commentary.""",

            'politics_society': f"""Create a political and social context briefing for {company}, a {industry} company based in {hq_location}.
Key requirements:
1. Structure using these exact headers and bullet points:

### Political Environment
* Government stability and business climate
* Election outcomes affecting the industry
* Policy changes and regulatory shifts

### Social Trends
* Demographic changes affecting the market
* Social movements and consumer behavior
* Educational and workforce development

### ESG Factors
* Environmental regulations and requirements
* Social responsibility expectations
* Governance standards and compliance

### Societal Impact
* Employment and economic contribution
* Community development initiatives
* Social innovation and impact metrics

2. Focus on political and social context
3. Include demographic and policy data
4. Cover ESG and sustainability factors
5. No explanations or commentary.""",
        }
        
        # Normalize docs to a list of (url, doc) tuples
        items = list(docs.items()) if isinstance(docs, dict) else [
            (doc.get('url', f'doc_{i}'), doc) for i, doc in enumerate(docs)
        ]
        # Sort documents by evaluation score (highest first)
        sorted_items = sorted(
            items, 
            key=lambda x: float(x[1].get('evaluation', {}).get('overall_score', '0')), 
            reverse=True
        )
        
        doc_texts = []
        total_length = 0
        for _ , doc in sorted_items:
            title = doc.get('title', '')
            content = doc.get('raw_content') or doc.get('content', '')
            if len(content) > self.max_doc_length:
                content = content[:self.max_doc_length] + "... [content truncated]"
            doc_entry = f"Title: {title}\n\nContent: {content}"
            if total_length + len(doc_entry) < 120000:  # Keep under limit
                doc_texts.append(doc_entry)
                total_length += len(doc_entry)
            else:
                break
        
        separator = "\n" + "-" * 40 + "\n"
        prompt = f"""{prompts.get(category, 'Create a focused, informative and insightful research briefing on the company: {company} in the {industry} industry based on the provided documents.')}

Analyze the following documents and extract key information. Provide only the briefing, no explanations or commentary:

{separator}{separator.join(doc_texts)}{separator}

"""
        
        try:
            logger.info("Sending prompt to LLM")
            response = self.gemini_model.generate_content(prompt)
            content = response.text.strip()
            if not content:
                logger.error(f"Empty response from LLM for {category} briefing")
                return {'content': ''}

            # Send completion status
            if websocket_manager := context.get('websocket_manager'):
                if job_id := context.get('job_id'):
                    await websocket_manager.send_status_update(
                        job_id=job_id,
                        status="briefing_complete",
                        message=f"Completed {category} briefing",
                        result={
                            "step": "Briefing",
                            "category": category
                        }
                    )

            return {'content': content}
        except Exception as e:
            logger.error(f"Error generating {category} briefing: {e}")
            return {'content': ''}

    async def create_briefings(self, state: ResearchState) -> ResearchState:
        """Create briefings for all categories in parallel."""
        company = state.get('company', 'Unknown Company')
        websocket_manager = state.get('websocket_manager')
        job_id = state.get('job_id')
        
        # Send initial briefing status
        if websocket_manager and job_id:
            await websocket_manager.send_status_update(
                job_id=job_id,
                status="processing",
                message="Starting research briefings",
                result={"step": "Briefing"}
            )

        context = {
            "company": company,
            "industry": state.get('industry', 'Unknown'),
            "hq_location": state.get('hq_location', 'Unknown'),
            "websocket_manager": websocket_manager,
            "job_id": job_id
        }
        logger.info(f"Creating section briefings for {company}")
        
        # Mapping of curated data fields to briefing categories
        categories = {
            'financial_data': ("financial", "financial_briefing"),
            'news_data': ("news", "news_briefing"),
            'industry_data': ("industry", "industry_briefing"),
            'company_data': ("company", "company_briefing"),
            'companies_products_data': ("companies_products", "companies_products_briefing"),
            'consumer_brands_data': ("consumer_brands", "consumer_brands_briefing"),
            'countries_regions_data': ("countries_regions", "countries_regions_briefing"),
            'digital_trends_data': ("digital_trends", "digital_trends_briefing"),
            'industries_markets_data': ("industries_markets", "industries_markets_briefing"),
            'politics_society_data': ("politics_society", "politics_society_briefing")
        }
        
        briefings = {}

        # Create tasks for parallel processing
        briefing_tasks = []
        for data_field, (cat, briefing_key) in categories.items():
            curated_key = f'curated_{data_field}'
            curated_data = state.get(curated_key, {})
            
            if curated_data:
                logger.info(f"Processing {data_field} with {len(curated_data)} documents")
                
                # Create task for this category
                briefing_tasks.append({
                    'category': cat,
                    'briefing_key': briefing_key,
                    'data_field': data_field,
                    'curated_data': curated_data
                })
            else:
                logger.info(f"No data available for {data_field}")
                state[briefing_key] = ""

        # Process briefings in parallel with rate limiting
        if briefing_tasks:
            # Rate limiting semaphore for LLM API
            briefing_semaphore = asyncio.Semaphore(2)  # Limit to 2 concurrent briefings
            
            async def process_briefing(task: Dict[str, Any]) -> Dict[str, Any]:
                """Process a single briefing with rate limiting."""
                async with briefing_semaphore:
                    result = await self.generate_category_briefing(
                        task['curated_data'],
                        task['category'],
                        context
                    )
                    
                    if result['content']:
                        briefings[task['category']] = result['content']
                        state[task['briefing_key']] = result['content']
                        logger.info(f"Completed {task['data_field']} briefing ({len(result['content'])} characters)")
                    else:
                        logger.error(f"Failed to generate briefing for {task['data_field']}")
                        state[task['briefing_key']] = ""
                    
                    return {
                        'category': task['category'],
                        'success': bool(result['content']),
                        'length': len(result['content']) if result['content'] else 0
                    }

            # Process all briefings in parallel
            results = await asyncio.gather(*[
                process_briefing(task) 
                for task in briefing_tasks
            ])
            
            # Log completion statistics
            successful_briefings = sum(1 for r in results if r['success'])
            total_length = sum(r['length'] for r in results)
            logger.info(f"Generated {successful_briefings}/{len(briefing_tasks)} briefings with total length {total_length}")

        state['briefings'] = briefings
        return state

    async def run(self, state: ResearchState) -> ResearchState:
        return await self.create_briefings(state)
