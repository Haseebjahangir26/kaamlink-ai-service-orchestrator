import os
import json
import uuid
import datetime
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

# ── Base pricing table per service (PKR) ──────────────────────────────────────
BASE_PRICES = {
    "AC repair":      {"min": 1500, "max": 3000},
    "plumbing":       {"min": 500,  "max": 1500},
    "electrician":    {"min": 600,  "max": 2000},
    "home cleaning":  {"min": 1000, "max": 3000},
    "carpentry":      {"min": 800,  "max": 2500},
    "painting":       {"min": 2000, "max": 8000},
    "pest control":   {"min": 2500, "max": 6000},
    "car wash":       {"min": 300,  "max": 800},
    "towing":         {"min": 1000, "max": 3000},
}

URGENCY_MULTIPLIERS = {
    "low":    1.0,
    "medium": 1.15,
    "high":   1.35,
}

def _fallback_pricing(service: str, urgency: str, user_budget: int | None):
    base = BASE_PRICES.get(service.lower(), {"min": 800, "max": 2000})
    mult = URGENCY_MULTIPLIERS.get(urgency.lower(), 1.0)
    market_min = int(base["min"] * mult)
    market_max = int(base["max"] * mult)
    suggested = int((market_min + market_max) / 2)

    acceptance_prob = None
    recommendation = f"Suggested offer of PKR {suggested} is fair for {service}."
    if user_budget is not None:
        prob = min(95, int((user_budget / suggested) * 100))
        acceptance_prob = prob
        if prob < 50:
            recommendation = f"Below average. Consider PKR {suggested} for faster matching."
        elif prob < 75:
            recommendation = f"Decent offer. PKR {suggested} would secure faster providers."
        else:
            recommendation = f"Great offer! You'll get fast matches at this price."

    return {
        "market_min": market_min,
        "market_max": market_max,
        "suggested_offer": suggested,
        "factors": [f"{urgency} urgency", f"{service} standard rate"],
        "user_budget": user_budget,
        "acceptance_probability": acceptance_prob,
        "recommendation": recommendation,
    }


def calculate_pricing(
    service: str,
    complexity: str,
    urgency: str,
    location: str,
    user_budget: int | None = None,
    log_fn=None,
) -> dict:
    """
    Main pricing function. Tries Gemini first, falls back to rule-based.
    log_fn: optional callable(agent_name, decision, reasoning) to log to agent_logs.
    """
    if log_fn:
        log_fn(
            "Pricing Agent",
            f"Calculating market price for {service}",
            f"Complexity: {complexity}, Urgency: {urgency}, Location: {location}"
        )

    system_prompt = f"""
You are a pricing intelligence agent for Kaamlink, a home services platform in Pakistan (Islamabad/Rawalpindi).
Given a service request, calculate fair PKR pricing.

Service: {service}
Complexity: {complexity}
Urgency: {urgency}
Location: {location}
User Budget (optional): {user_budget if user_budget else 'not specified'}

Urgency multipliers to apply on the base price:
- low urgency: 1.0x
- medium urgency: 1.15x  
- high urgency: 1.35x

Base price ranges (PKR):
- AC repair: 1500-3000
- plumbing: 500-1500
- electrician: 600-2000
- home cleaning: 1000-3000
- carpentry: 800-2500
- painting: 2000-8000
- pest control: 2500-6000
- car wash: 300-800
- towing: 1000-3000

Return ONLY valid JSON matching this schema exactly:
{{
  "market_min": <integer PKR>,
  "market_max": <integer PKR>,
  "suggested_offer": <integer PKR, midpoint adjusted for complexity>,
  "factors": [<list of 2-3 short factor strings>],
  "user_budget": <integer or null>,
  "acceptance_probability": <integer 0-95 or null if no user_budget>,
  "recommendation": <one sentence plain English recommendation>
}}
"""

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents="Calculate pricing.",
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                system_instruction=system_prompt,
                temperature=0.1
            ),
        )
        result = json.loads(response.text)
        if user_budget and result.get("acceptance_probability") is None:
            suggested = result.get("suggested_offer", 1500)
            result["acceptance_probability"] = min(95, int((user_budget / suggested) * 100))
        result["user_budget"] = user_budget

        if log_fn:
            log_fn(
                "Pricing Agent",
                f"Price range PKR {result['market_min']} – {result['market_max']} | Suggested: PKR {result['suggested_offer']}",
                result["recommendation"]
            )
        return result

    except Exception as e:
        err = str(e)
        print(f"[WARN] Pricing Agent falling back to rule-based: {err[:80]}")
        result = _fallback_pricing(service, urgency, user_budget)
        if log_fn:
            log_fn(
                "Pricing Agent",
                f"[Fallback] Price range PKR {result['market_min']} – {result['market_max']}",
                result["recommendation"]
            )
        return result
