import os
import json
from google import genai
from google.genai import types
from models import Intent
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

def extract_intent(user_text: str) -> Intent:
    system_instruction = """
    You are an AI Intent Extractor for the Kaamlink Service Orchestrator in Pakistan.
    Your job is to read natural language service requests (in Roman Urdu or English) and extract the key details.
    Return a JSON object exactly matching this schema:
    {
        "service": str (e.g., "AC repair", "plumbing"),
        "issue": str (e.g., "not cooling", "leakage"),
        "location": str (e.g., "G-13", "F-8", or "unknown" if not provided),
        "preferred_time": str (e.g., "tomorrow morning", "asap"),
        "budget_sensitive": bool,
        "urgency": str (e.g., "low", "medium", "high"),
        "confidence": float (between 0.0 and 1.0)
    }
    """
    
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
