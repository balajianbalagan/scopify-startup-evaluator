from browser_use import Agent, ChatGoogle, Browser
from dotenv import load_dotenv
import asyncio

load_dotenv()

browser = Browser(
	headless=True,  # Show browser window
	window_size={'width': 1000, 'height': 700},  # Set window size
)

async def main():
    llm = ChatGoogle(model="gemini-2.5-flash")
    task = """
    1. Search Google for "{company_name} Crunchbase".
    2. Open the first Crunchbase (or equivalent) company profile result.
    3. Use extract_structured_data action to return company details in the following JSON schema:

    {
    "id": "",
    "name": "",
    "website": "",
    "status": "",
    "location": {
        "city": "",
        "state": "",
        "country": "",
        "region": ""
    },
    "description": "",
    "leading_investor": "",
    "industry": "",
    "sub_categories": [],
    "is_unicorn": false,
    "founded_year": "",
    "founders": [],
    "number_of_employees": "",
    "funding": {
        "total_funding_raised_usd": "",
        "funding_stage": "",
        "funding_rounds": [
        {
            "round_type": "",
            "amount_raised_usd": "",
            "date": "",
            "investors": []
        }
        ],
        "investors": []
    },
    "valuation": {
        "total_valuation_usd": "",
        "last_valuation_date": "",
        "exit_type": "",
        "exited": false
    },
    "financials": {
        "arr_usd": "",
        "tam_usd": "",
        "estimated_revenue_usd": "",
        "burn_rate_usd": "",
        "profit_margin_percent": ""
    },
    "product": {
        "name": "",
        "description": "",
        "business_model": "",
        "pricing_model": "",
        "technology_stack": [],
        "patents_or_ip": []
    },
    "market": {
        "target_customers": [],
        "geographic_focus": [],
        "distribution_channels": [],
        "growth_rate_percent": ""
    },
    "competitors": [],
    "differentiator": "",
    "challenges": [],
    "latest_news": [],
    "social_media_links": {
        "linkedin": "",
        "twitter": "",
        "facebook": "",
        "youtube": "",
        "github": "",
        "crunchbase": ""
    },
    "additional_information": {},
    "created_at": "{current_timestamp}",
    "updated_at": "{current_timestamp}"
    }

    4. If Crunchbase profile is blocked or incomplete:
    - Use search_google action to find the company’s official website, LinkedIn, and news.
    - Cross-check missing fields from LinkedIn company page, official site, TechCrunch, PitchBook, or news sources.
    5. Normalize all financial values in USD (without currency symbols).
    6. Normalize employee counts into exact numbers if possible (otherwise provide ranges).
    7. If any field is not available, leave it as an empty string or empty array.
    """

    agent = Agent(task=task, llm=llm, browser=browser)
    await agent.run()

if __name__ == "__main__":
    asyncio.run(main())