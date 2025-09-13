# app.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from datetime import datetime
import asyncio
import json
import os
import re
from typing import Any, Dict, List, Optional

# browser_use imports (your existing library)
from browser_use import Agent, ChatGoogle, Browser

load_dotenv()

app = FastAPI(title="Startup Evaluator Agent (Merged Output)")

# Load prompt files (these are the files you provided). See prompts for extraction rules. 
PROMPTS_DIR = "prompts"
PROMPTS = {
    "profile": open(os.path.join(PROMPTS_DIR, "core_company_profile.txt"), "r", encoding="utf-8").read(),
    "funding": open(os.path.join(PROMPTS_DIR, "funding_investors.txt"), "r", encoding="utf-8").read(),
    "market": open(os.path.join(PROMPTS_DIR, "market_product_news.txt"), "r", encoding="utf-8").read(),
}

# Input model
class CompanyRequest(BaseModel):
    company_name: str

# Utility: safe filename
def safe_filename(name: str) -> str:
    return re.sub(r"[^a-z0-9_-]", "_", name.lower().replace(" ", "_"))

# Utility: try to parse amounts like "12M", "$5,000,000", "€3.5M", "3,500,000 USD"
def parse_amount_to_usd(val: Any) -> Optional[float]:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    if s == "":
        return None

    # Remove commas and currency symbols, keep M/B/T multipliers
    s2 = s.replace(",", "").replace(" ", "")
    # common suffix multipliers
    m = re.match(r"^\$?([0-9]*\.?[0-9]+)\s*([MKBTmkbt]?)", s2)
    if m:
        num = float(m.group(1))
        mul = m.group(2).upper()
        if mul == "K":
            num *= 1e3
        elif mul == "M":
            num *= 1e6
        elif mul == "B":
            num *= 1e9
        elif mul == "T":
            num *= 1e12
        return float(num)

    # fallback: remove non-digit/dot and try
    s_digits = re.sub(r"[^0-9.]", "", s2)
    try:
        if s_digits == "":
            return None
        return float(s_digits)
    except:
        return None

# Normalizer: map profile/funding/market into a master schema (best-effort)
def normalize_to_master(profile: Dict[str, Any], funding: Dict[str, Any], market: Dict[str, Any], company: str) -> Dict[str, Any]:
    now = datetime.utcnow().isoformat()
    master = {
        "id": (profile.get("id") if isinstance(profile, dict) else None) or safe_filename(company),
        "name": (profile.get("name") if isinstance(profile, dict) else company) or company,
        "website": None,
        "status": None,
        "location": {
            "city": None,
            "state": None,
            "country": None,
            "region": None
        },
        "description": None,
        "industry": None,
        "sub_categories": [],
        "is_unicorn": False,
        "founded_year": None,
        "founders": [],
        "number_of_employees": None,
        "valuation": {
            "total_valuation_usd": None,
            "last_valuation_date": None,
            "exit_type": None,
            "exited": False
        },
        # funding fields
        "funding_total_raised_usd": None,
        "funding_stage": None,
        "funding_rounds": [],
        "investors": [],
        "leading_investor": None,
        # market/product/news signals
        "market_news": [],
        "product_news": [],
        # meta
        "evaluated_at": now,
        "raw": { "profile": profile, "funding": funding, "market": market }
    }

    # ----- PROFILE mapping (expected schema per core_company_profile prompt).:contentReference[oaicite:3]{index=3}
    if isinstance(profile, dict):
        # straightforward mappings if the agent returned the expected schema
        master["website"] = profile.get("website") or master["website"]
        master["status"] = profile.get("status") or master["status"]
        loc = profile.get("location") or {}
        if isinstance(loc, dict):
            for k in ("city", "state", "country", "region"):
                if loc.get(k):
                    master["location"][k] = loc.get(k)
        master["description"] = profile.get("description") or master["description"]
        master["industry"] = profile.get("industry") or master["industry"]
        master["sub_categories"] = profile.get("sub_categories") or master["sub_categories"]
        master["is_unicorn"] = bool(profile.get("is_unicorn")) if "is_unicorn" in profile else master["is_unicorn"]
        master["founded_year"] = profile.get("founded_year") or master["founded_year"]
        master["founders"] = profile.get("founders") or master["founders"]
        master["number_of_employees"] = profile.get("number_of_employees") or master["number_of_employees"]
        val = profile.get("valuation") or {}
        if isinstance(val, dict):
            master["valuation"]["total_valuation_usd"] = parse_amount_to_usd(val.get("total_valuation_usd")) or master["valuation"]["total_valuation_usd"]
            master["valuation"]["last_valuation_date"] = val.get("last_valuation_date") or master["valuation"]["last_valuation_date"]
            master["valuation"]["exit_type"] = val.get("exit_type") or master["valuation"]["exit_type"]
            master["valuation"]["exited"] = bool(val.get("exited")) if "exited" in val else master["valuation"]["exited"]

    # ----- FUNDING mapping (expected schema per funding_investors / market file).:contentReference[oaicite:4]{index=4} :contentReference[oaicite:5]{index=5}
    if isinstance(funding, dict):
        funding_block = funding.get("funding") if "funding" in funding else funding
        if isinstance(funding_block, dict):
            master["funding_total_raised_usd"] = parse_amount_to_usd(funding_block.get("total_funding_raised_usd")) or master["funding_total_raised_usd"]
            master["funding_stage"] = funding_block.get("funding_stage") or master["funding_stage"]
            fr = funding_block.get("funding_rounds") or []
            if isinstance(fr, list):
                for r in fr:
                    r_parsed = {
                        "round_type": r.get("round_type"),
                        "amount_raised_usd": parse_amount_to_usd(r.get("amount_raised_usd")),
                        "date": r.get("date"),
                        "investors": r.get("investors") or []
                    }
                    master["funding_rounds"].append(r_parsed)
            # top-level investors list
            invs = funding_block.get("investors") or funding.get("investors") or []
            master["investors"] = invs
        # leading investor top-level
        if funding.get("leading_investor"):
            master["leading_investor"] = funding.get("leading_investor")

    # ----- MARKET mapping (free-form — attempt to extract news / product mentions)
    if isinstance(market, dict):
        # if market contains lists named news, product_news, or 'items', map them
        # fallback: put entire market block in market_news
        possible_news = []
        if market.get("news"):
            possible_news = market.get("news")
        elif market.get("articles"):
            possible_news = market.get("articles")
        elif market.get("items"):
            possible_news = market.get("items")
        elif isinstance(market, list):
            possible_news = market
        else:
            # best-effort: convert the dict to a string summary (if agent returned text)
            possible_news = [market]

        # separate product mentions if items have "product" keys
        for it in possible_news:
            if isinstance(it, dict) and it.get("type") == "product":
                master["product_news"].append(it)
            else:
                master["market_news"].append(it)

    # Final normalization fixes
    # de-dup investors
    try:
        master["investors"] = list(dict.fromkeys(master["investors"]))
    except Exception:
        pass

    return master

# run_agent: runs with fresh browser for each agent to reduce captcha overlap
async def run_agent(company_name: str, prompt_template: str) -> Any:
    task = prompt_template.replace("{company_name}", company_name)
    llm = ChatGoogle(model="gemini-2.5-flash")

    browser = Browser(
        headless=False,
        is_local=True,
        window_size={'width': 1000, 'height': 700},
        # you may want to expose options here for proxies/user-agent in production
    )

    agent = Agent(task=task, llm=llm, browser=browser)
    result = await agent.run()
    return result

# helper to persist raw outputs and merged output
def save_output(company: str, suffix: str, data: dict):
    os.makedirs("output", exist_ok=True)
    filename = safe_filename(company) + f"_{suffix}.json"
    with open(os.path.join("output", filename), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

# ---------------- ENDPOINTS ---------------- #

@app.post("/evaluate/merged")
async def evaluate_merged(request: CompanyRequest):
    """
    Runs profile, funding, market agents in parallel.
    Returns a single merged JSON normalized to master schema and saves it to output/{company}_merged.json
    """
    company = request.company_name.strip()
    if not company:
        raise HTTPException(status_code=400, detail="company_name is required")

    # Kick off all three agents concurrently (each creates a fresh Browser)
    profile_task = run_agent(company, PROMPTS["profile"])
    funding_task = run_agent(company, PROMPTS["funding"])
    market_task = run_agent(company, PROMPTS["market"])

    # Await them together
    profile_res, funding_res, market_res = await asyncio.gather(profile_task, funding_task, market_task)

    # Save raw outputs separately (helpful for debugging)
    save_output(company, "raw_profile", {"company": company, "profile": profile_res, "evaluated_at": datetime.utcnow().isoformat()})
    save_output(company, "raw_funding", {"company": company, "funding": funding_res, "evaluated_at": datetime.utcnow().isoformat()})
    save_output(company, "raw_market", {"company": company, "market": market_res, "evaluated_at": datetime.utcnow().isoformat()})

    # Normalize -> master schema
    merged = normalize_to_master(profile_res if isinstance(profile_res, dict) else {}, funding_res if isinstance(funding_res, dict) else {}, market_res if isinstance(market_res, dict) else {}, company)

    # Save merged
    save_output(company, "merged", merged)

    return merged

# keep the existing single-agent endpoints if helpful for debugging / progressive runs:
@app.post("/evaluate/profile")
async def evaluate_profile(request: CompanyRequest):
    return await run_agent(request.company_name, PROMPTS["profile"])

@app.post("/evaluate/funding")
async def evaluate_funding(request: CompanyRequest):
    return await run_agent(request.company_name, PROMPTS["funding"])

@app.post("/evaluate/market")
async def evaluate_market(request: CompanyRequest):
    return await run_agent(request.company_name, PROMPTS["market"])
