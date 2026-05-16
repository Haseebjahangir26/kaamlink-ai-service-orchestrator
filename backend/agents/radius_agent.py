import time
import uuid
import datetime
from database import get_db
from models import Provider
from typing import List, Tuple
from memory_db import agent_logs_memory, providers_memory, radius_logs_memory

# Radius expansion steps in km
RADIUS_STEPS = [0.5, 1.5, 3.0, 5.0, 10.0]
MIN_PROVIDERS = 3


def _log(agent_name: str, decision: str, reasoning: str = ""):
    """Write to Supabase agent_logs, fall back to memory."""
    db = get_db()
    try:
        db.table('agent_logs').insert({
            'agent_name': agent_name,
            'decision': decision,
            'reasoning': reasoning
        }).execute()
    except Exception as e:
        agent_logs_memory.insert(0, {
            'id': str(uuid.uuid4()),
            'agent_name': agent_name,
            'decision': decision,
            'reasoning': reasoning,
            'created_at': datetime.datetime.now().isoformat()
        })


def _log_radius(radius_km: float, providers_found: int, expanded_to: float | None):
    """Write an expansion step to radius_logs table / memory."""
    db = get_db()
    entry = {
        'id': str(uuid.uuid4()),
        'radius_km': radius_km,
        'providers_found': providers_found,
        'expanded_to': expanded_to,
        'created_at': datetime.datetime.now().isoformat()
    }
    try:
        db.table('radius_logs').insert(entry).execute()
    except Exception:
        radius_logs_memory.insert(0, entry)


def _providers_within_radius(all_providers: list, intent_location: str, radius_km: float) -> list:
    """
    Simulate geographic filtering.
    Since we don't have real GPS data, we use radius as a progressive
    filter: radius 0.5 = exact location match only, wider = include all.
    """
    if radius_km <= 0.5:
        return [p for p in all_providers if p.get('location', '').lower() == intent_location.lower()]
    elif radius_km <= 1.5:
        # Same sector or adjacent (simplified: same first letter of location)
        prefix = intent_location[:2].lower() if len(intent_location) >= 2 else intent_location.lower()
        return [p for p in all_providers if p.get('location', '').lower().startswith(prefix)]
    else:
        # Include everything beyond 3km
        return all_providers


def expand_and_discover(service: str, location: str) -> Tuple[List[Provider], float]:
    """
    Progressively expands search radius until MIN_PROVIDERS are found.
    Returns (providers, final_radius_km).
    Each expansion is logged and includes a real-time delay for demo effect.
    """
    db = get_db()

    # Load all providers matching this service
    try:
        response = db.table('providers').select('*').execute()
        all_providers = response.data
    except Exception:
        all_providers = providers_memory

    service_matched = [
        p for p in all_providers
        if service.lower() in " ".join([s.lower() for s in p.get('services', [])])
    ]

    final_radius = RADIUS_STEPS[-1]

    for i, radius in enumerate(RADIUS_STEPS):
        next_radius = RADIUS_STEPS[i + 1] if i + 1 < len(RADIUS_STEPS) else None

        within = _providers_within_radius(service_matched, location, radius)
        count = len(within)

        _log(
            "Radius Expansion Agent",
            f"Searching within {radius}km... {count} provider{'s' if count != 1 else ''} found",
            f"Need {MIN_PROVIDERS} minimum. {'Expanding...' if count < MIN_PROVIDERS and next_radius else 'Sufficient providers found.'}"
        )
        _log_radius(radius, count, next_radius if count < MIN_PROVIDERS else None)

        # Real delay — creates the live "searching" effect in the UI
        time.sleep(2.0)

        if count >= MIN_PROVIDERS:
            final_radius = radius
            _log(
                "Radius Expansion Agent",
                f"Search complete at {radius}km radius",
                f"Found {count} eligible providers for {service}."
            )
            # Sort by rating descending, take top 3
            ranked = sorted(within, key=lambda x: -x.get('rating', 0))
            return [Provider(**p) for p in ranked[:3]], final_radius

    # Still not enough — return whatever we have from full set
    _log(
        "Radius Expansion Agent",
        f"Max radius {RADIUS_STEPS[-1]}km reached. Returning best available.",
        f"Found {len(service_matched)} provider(s) after full expansion."
    )
    ranked = sorted(service_matched, key=lambda x: -x.get('rating', 0))
    return [Provider(**p) for p in ranked[:3]], RADIUS_STEPS[-1]
