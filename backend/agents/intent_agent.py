import os
import json
import re
from google import genai
from google.genai import types
from models import Intent
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

# ── Keyword fallback (used when Gemini API is unavailable) ────────────────────

_SERVICE_KEYWORDS = {
    "AC repair":        ["ac", "air condition", "cooling", "thanda", "compressor", "gas filling"],
    "plumbing":         ["plumber", "plumbing", "pipe", "leakage", "water motor", "geyser", "nali"],
    "electrician":      ["electrician", "wiring", "bijli", "short circuit", "fan", "switchboard", "ups"],
    "home cleaning":    ["cleaning", "safai", "maid", "sofa clean", "carpet", "deep clean"],
    "carpentry":        ["carpenter", "carpentry", "furniture", "wood", "door", "cabinet", "almirah"],
    "painting":         ["painter", "painting", "paint", "polish", "distemper"],
    "pest control":     ["pest", "termite", "fumigation", "cockroach", "bug"],
    "car wash":         ["car wash", "car clean", "auto detail", "gaari"],
    "towing":           ["towing", "tow", "breakdown", "roadside", "vehicle recovery"],
}

_LOCATION_PATTERN = re.compile(
    r'\b(G-\d+|F-\d+|I-\d+|E-\d+|H-\d+|DHA|Bahria Town|Saddar|Rawalpindi Cantt|RWP|PWD|CDA)\b',
    re.IGNORECASE
)

def _fallback_extract(user_text: str) -> Intent:
    """Rule-based intent extractor — used as fallback when Gemini is down."""
    text_lower = user_text.lower()

    detected_service = "invalid"
    for service, keywords in _SERVICE_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            detected_service = service
            break

    loc_match = _LOCATION_PATTERN.search(user_text)
    detected_location = loc_match.group(0) if loc_match else "unknown"

    urgency = "high" if any(w in text_lower for w in ["urgent", "jaldi", "asap", "abhi"]) else "medium"

    return Intent(
        service=detected_service,
        issue="detected via keyword fallback",
        location=detected_location,
        preferred_time="asap",
        budget_sensitive=False,
        urgency=urgency,
        confidence=0.6
    )


# ── Main extractor ────────────────────────────────────────────────────────────

def extract_intent(user_text: str) -> Intent:
    system_instruction = """
    You are an AI Intent Extractor for the Kaamlink Service Orchestrator in Pakistan.
    Your job is to read natural language service requests (in Roman Urdu or English) and extract the key details.
    
    CRITICAL: You MUST map the service to one of the following exact categories. DO NOT invent new categories:
    ["AC repair", "plumbing", "electrician", "home cleaning", "carpentry", "painting", "pest control", "car wash", "towing"]

    EDGE CASES:
    1. If the user's input is gibberish, an everyday greeting, or NOT related to home/local services, you MUST set the "service" field to the exact string "invalid".
    2. If the user asks for a valid service but does not provide a location, set the "location" field to the exact string "unknown".

    Return a JSON object exactly matching this schema:
    {
        "service": str (MUST be from the allowed list above, or "invalid"),
        "issue": str (e.g., "not cooling", "leakage"),
        "location": str (e.g., "G-13", "F-8", or "unknown"),
        "preferred_time": str (e.g., "tomorrow morning", "asap"),
        "budget_sensitive": bool,
        "urgency": str (e.g., "low", "medium", "high"),
        "confidence": float (between 0.0 and 1.0)
    }
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=user_text,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                system_instruction=system_instruction,
                temperature=0.1
            ),
        )
        data = json.loads(response.text)
        return Intent(**data)

    except Exception as e:
        err = str(e)
        # Quota / permission errors — gracefully degrade to keyword fallback
        if any(k in err for k in ["403", "quota", "PERMISSION_DENIED", "429", "rate", "Resource"]):
            print(f"[WARN] Gemini API unavailable ({err[:80]}). Using keyword fallback.")
            return _fallback_extract(user_text)
        raise

