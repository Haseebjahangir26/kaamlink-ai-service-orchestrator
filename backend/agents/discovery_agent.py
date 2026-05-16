from database import get_db
from models import Intent, Provider
from typing import List
import uuid
import datetime
import time
from memory_db import agent_logs_memory, providers_memory

def log_agent_action(agent_name: str, decision: str, reasoning: str = ""):
    db = get_db()
    try:
        db.table('agent_logs').insert({
            'agent_name': agent_name,
            'decision': decision,
            'reasoning': reasoning
        }).execute()
    except Exception as e:
        print(f"Fallback: writing agent log to memory: {e}")
        agent_logs_memory.insert(0, {
            'id': str(uuid.uuid4()),
            'agent_name': agent_name,
            'decision': decision,
            'reasoning': reasoning,
            'created_at': datetime.datetime.now().isoformat()
        })

def discover_providers(intent: Intent) -> List[Provider]:
    db = get_db()
    try:
        time.sleep(1.0)
        
        # EDGE CASE 1: Gibberish / Non-Service Query
        if intent.service.lower() == "invalid":
            log_agent_action(
                "Discovery Agent",
                "Request rejected",
                "Non-service query detected. Halting discovery process."
            )
            time.sleep(1.0)
            return []

        # EDGE CASE 2: Missing Location
        loc_text = f"Location bounds: {intent.location}"
        if intent.location.lower() == "unknown":
            loc_text = "Location missing, expanding search radius globally."

        log_agent_action(
            "Discovery Agent",
            f"Scanning database for '{intent.service}' providers",
            loc_text
        )
        time.sleep(1.5)
        
        try:
            response = db.table('providers').select('*').execute()
            providers_data = response.data
        except Exception as e:
            print(f"Fallback: reading providers from memory: {e}")
            providers_data = providers_memory
        
        # Filter by service match
        filtered = []
        for p in providers_data:
            services = [s.lower() for s in p.get('services', [])]
            if intent.service.lower() in " ".join(services):
                filtered.append(p)
                
        if len(filtered) == 0:
            log_agent_action(
                "Discovery Agent",
                f"No matching providers found",
                f"Could not locate any registered providers for '{intent.service}'."
            )
            time.sleep(1.0)
            return []

        log_agent_action(
            "Discovery Agent",
            f"Filtering providers by service capabilities",
            f"Matched {len(filtered)} potential candidates for '{intent.service}'."
        )
        time.sleep(1.5)
                
        # Rank: Location match first, then Rating
        ranked = sorted(
            filtered, 
            key=lambda x: (
                0 if intent.location.lower() != "unknown" and x.get('location', '').lower() == intent.location.lower() else 1,
                -x.get('rating', 0)
            )
        )
        
        top_3 = ranked[:3]
        
        log_agent_action(
            "Discovery Agent",
            f"Ranking top {len(top_3)} candidates.",
            f"Ranked by geographic proximity and highest rating. Winner: {top_3[0]['name']}"
        )
        time.sleep(1.0)
        
        return [Provider(**p) for p in top_3]
    except Exception as e:
        log_agent_action("Discovery Agent", "Failed to discover providers", str(e))
        raise e
