from database import get_db
from models import Intent, Provider
from typing import List
import uuid
import datetime
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
        log_agent_action(
            "Discovery Agent",
            f"Searching for '{intent.service}' providers in {intent.location}",
            f"Intent indicates urgency: {intent.urgency}"
        )
        
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
            # Simple keyword match
            if intent.service.lower() in " ".join(services):
                filtered.append(p)
                
        # Rank: Location match first, then Rating
        ranked = sorted(
            filtered, 
            key=lambda x: (
                0 if x.get('location', '').lower() == intent.location.lower() else 1,
                -x.get('rating', 0)
            )
        )
        
        top_3 = ranked[:3]
        
        log_agent_action(
            "Discovery Agent",
            f"Found {len(top_3)} matching providers.",
            f"Ranked by location and rating. Top provider: {top_3[0]['name'] if top_3 else 'None'}"
        )
        
        return [Provider(**p) for p in top_3]
    except Exception as e:
        log_agent_action("Discovery Agent", "Failed to discover providers", str(e))
        raise e
