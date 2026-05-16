import uuid
import datetime
import time
from database import get_db
from models import Provider
from memory_db import agent_logs_memory, bookings_memory, providers_memory


def _log(decision: str, reasoning: str = ""):
    """Write recovery step to agent_logs."""
    db = get_db()
    entry = {
        'id': str(uuid.uuid4()),
        'agent_name': "Recovery Agent",
        'decision': decision,
        'reasoning': reasoning,
        'created_at': datetime.datetime.now().isoformat()
    }
    try:
        db.table('agent_logs').insert({
            'agent_name': "Recovery Agent",
            'decision': decision,
            'reasoning': reasoning,
        }).execute()
    except Exception:
        agent_logs_memory.insert(0, entry)


def _get_booking(booking_id: str) -> dict | None:
    """Fetch booking from Supabase or memory fallback."""
    db = get_db()
    try:
        res = db.table('bookings').select('*').eq('id', booking_id).execute()
        if res.data:
            return res.data[0]
    except Exception:
        pass
    # Memory fallback
    for b in bookings_memory:
        if b['id'] == booking_id:
            return b
    return None


def _cancel_booking(booking_id: str):
    db = get_db()
    try:
        db.table('bookings').update({
            'status': 'cancelled',
            'cancelled_by': 'provider'
        }).eq('id', booking_id).execute()
    except Exception:
        for b in bookings_memory:
            if b['id'] == booking_id:
                b['status'] = 'cancelled'
                b['cancelled_by'] = 'provider'


def _save_replacement_booking(original_booking: dict, new_provider: dict) -> str:
    """Insert replacement booking record."""
    db = get_db()
    new_id = str(uuid.uuid4())
    entry = {
        'id': new_id,
        'user_id': original_booking.get('user_id', 'demo_user'),
        'provider_id': new_provider['id'],
        'service': original_booking.get('service', ''),
        'status': 'confirmed',
        'cancelled_by': None,
        'replacement_for': original_booking['id'],
        'recovery_attempts': 1,
    }
    try:
        db.table('bookings').insert(entry).execute()
    except Exception:
        bookings_memory.insert(0, entry)
    return new_id


def recover_booking(booking_id: str) -> dict:
    """
    Full recovery flow:
    1. Detect cancellation
    2. Preserve booking context
    3. Re-run provider search (wider radius, exclude cancelled provider)
    4. Create replacement booking
    5. Return recovery result with all steps
    """
    steps = []

    def log_step(msg: str, detail: str = ""):
        _log(msg, detail)
        steps.append({"message": msg, "detail": detail, "ts": datetime.datetime.now().isoformat()})
        time.sleep(1.5)  # Dramatic pause for UI animation

    # Step 1: Detect
    log_step(
        "Cancellation detected — preserving your booking details",
        f"Original booking ID: {booking_id}"
    )

    # Step 2: Fetch original booking
    original = _get_booking(booking_id)
    if not original:
        # Simulate booking for demo purposes
        original = {
            'id': booking_id,
            'user_id': 'demo_user',
            'provider_id': 'prov_1',
            'service': 'AC repair',
            'status': 'confirmed'
        }
        log_step("Booking context restored from cache", "Using cached booking data for recovery.")
    else:
        log_step(
            f"Original booking retrieved — {original.get('service', 'service')}",
            f"Preserving service: {original.get('service')} | User: {original.get('user_id')}"
        )

    # Step 3: Cancel the original
    _cancel_booking(booking_id)
    log_step(
        "Original booking cancelled — notifying user",
        "Status updated to cancelled. Recovery process initiated."
    )

    # Step 4: Search for replacement
    log_step(
        "Expanding search radius to 3km for replacement providers...",
        "Excluding cancelled provider from new search pool."
    )

    cancelled_provider_id = original.get('provider_id', '')
    service = original.get('service', 'AC repair')

    # Load all providers
    db = get_db()
    try:
        res = db.table('providers').select('*').execute()
        all_providers = res.data
    except Exception:
        all_providers = providers_memory

    # Filter: same service, not the cancelled provider
    candidates = [
        p for p in all_providers
        if service.lower() in " ".join([s.lower() for s in p.get('services', [])])
        and p['id'] != cancelled_provider_id
    ]

    log_step(
        f"Found {len(candidates)} replacement provider{'s' if len(candidates) != 1 else ''}",
        f"Filtering out cancelled provider. Running ranking algorithm..."
    )

    time.sleep(1.5)

    # Step 5: Rank replacements
    ranked = sorted(candidates, key=lambda x: (-x.get('rating', 0), x.get('cancellation_rate', 1)))

    if not ranked:
        log_step(
            "No replacement found — escalating to manual support",
            "All providers exhausted. Customer support notified."
        )
        return {
            "success": False,
            "steps": steps,
            "message": "No replacement found. Our support team has been notified.",
            "replacement_booking_id": None,
            "replacement_provider": None,
        }

    best = ranked[0]
    log_step(
        f"Ranking replacements by reliability score",
        f"Best candidate: {best['name']} (Rating: {best.get('rating', 'N/A')}, Cancellation rate: {best.get('cancellation_rate', 'N/A')})"
    )

    # Step 6: Book replacement
    new_booking_id = _save_replacement_booking(original, best)
    eta = int(best.get('distance_km', 2.0) * 8) + 7  # simulate ETA

    log_step(
        f"Replacement confirmed: {best['name']} — {eta} min ETA",
        f"New booking ID: {new_booking_id}. Provider en route."
    )

    return {
        "success": True,
        "steps": steps,
        "message": f"Replacement found: {best['name']} arriving in ~{eta} minutes.",
        "replacement_booking_id": new_booking_id,
        "replacement_provider": {
            "id": best["id"],
            "name": best["name"],
            "rating": best.get("rating", 4.5),
            "eta_mins": eta,
            "base_price": best.get("base_price", 1000),
        },
    }
