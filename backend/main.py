import os
import random
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import List

load_dotenv()

from models import (
    UserRequest, Intent, Provider, Bid,
    BookingRequest, AgentLog,
    PricingRequest, PricingResponse,
    BidRequest, BidResponse,
    RecoveryRequest, RecoveryResponse, RecoveryStep,
)
from agents.intent_agent import extract_intent
from agents.discovery_agent import discover_providers, log_agent_action
from agents.pricing_agent import calculate_pricing
from agents.radius_agent import expand_and_discover
from agents.recovery_agent import recover_booking
from database import get_db
from memory_db import agent_logs_memory, bookings_memory

app = FastAPI(title="Kaamlink AI Service Orchestrator API — Phase 2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Existing Phase 1 endpoints ────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"message": "Kaamlink AI Service Orchestrator — Phase 2 Ready 🚀"}


@app.post("/api/request", response_model=Intent)
def process_request(req: UserRequest):
    try:
        intent = extract_intent(req.text)
        return intent
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/providers", response_model=List[Provider])
def get_providers(intent: Intent):
    try:
        return discover_providers(intent)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/book")
def create_booking(req: BookingRequest):
    db = get_db()
    booking_id = str(uuid.uuid4())
    entry = {
        'id': booking_id,
        'user_id': req.user_id,
        'provider_id': req.provider_id,
        'service': req.service,
        'status': 'confirmed',
        'cancelled_by': None,
        'replacement_for': None,
        'recovery_attempts': 0,
    }
    try:
        db.table('bookings').insert(entry).execute()
    except Exception as e:
        print(f"Fallback: writing booking to memory: {e}")
        bookings_memory.append(entry)

    log_agent_action(
        "Booking Agent",
        f"Confirmed booking {booking_id}",
        f"User {req.user_id} booked provider {req.provider_id} for {req.service}"
    )
    return {"booking_id": booking_id, "status": "confirmed"}


@app.get("/api/logs", response_model=List[AgentLog])
def get_logs():
    db = get_db()
    try:
        res = db.table('agent_logs').select('*').order('created_at', desc=True).limit(20).execute()
        return [AgentLog(**log) for log in res.data]
    except Exception:
        return [AgentLog(**log) for log in agent_logs_memory[:20]]


# ── Phase 2 endpoints ─────────────────────────────────────────────────────────

@app.post("/api/pricing", response_model=PricingResponse)
def get_pricing(req: PricingRequest):
    """
    Agent 5 — Pricing Agent.
    Returns market price range, suggested offer, and acceptance probability.
    """
    try:
        result = calculate_pricing(
            service=req.service,
            complexity=req.complexity or "intermediate",
            urgency=req.urgency,
            location=req.location,
            user_budget=req.user_budget,
            log_fn=log_agent_action,
        )
        return PricingResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/bids", response_model=BidResponse)
def simulate_bids(req: BidRequest):
    """
    Simulates realistic bids from the provided providers list.
    Applies urgency multipliers and random variation (±15%).
    Returns bids sorted cheapest first.
    """
    if not req.providers:
        raise HTTPException(status_code=400, detail="No providers supplied.")

    urgency_mult = {"low": 1.0, "medium": 1.0, "high": 1.2}.get(req.urgency.lower(), 1.0)
    bids = []

    for provider in req.providers:
        variation = random.uniform(0.85, 1.15)
        amount = int(provider.base_price * variation * urgency_mult)
        eta = int(provider.distance_km * 8) + random.randint(2, 8)
        bids.append(Bid(
            id=str(uuid.uuid4()),
            provider_id=provider.id,
            provider_name=provider.name,
            amount=amount,
            eta_mins=eta,
            expires_in=120,
        ))

    bids.sort(key=lambda b: b.amount)

    log_agent_action(
        "Bid Simulation Agent",
        f"Generated {len(bids)} bids | Lowest: PKR {bids[0].amount} from {bids[0].provider_name}",
        f"Urgency multiplier: {urgency_mult}x. Bids sorted cheapest first."
    )

    return BidResponse(bids=bids)


@app.post("/api/recover", response_model=RecoveryResponse)
def trigger_recovery(req: RecoveryRequest):
    """
    Agent 7 — Recovery Agent.
    Cancels the original booking and finds a replacement provider.
    Returns step-by-step recovery trace for UI animation.
    """
    try:
        result = recover_booking(req.booking_id)
        steps = [RecoveryStep(**s) for s in result["steps"]]
        return RecoveryResponse(
            success=result["success"],
            steps=steps,
            message=result["message"],
            replacement_booking_id=result.get("replacement_booking_id"),
            replacement_provider=result.get("replacement_provider"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/booking/{booking_id}")
def get_booking(booking_id: str):
    """Fetch a booking by ID — used for status polling."""
    db = get_db()
    try:
        res = db.table('bookings').select('*').eq('id', booking_id).execute()
        if res.data:
            return res.data[0]
    except Exception:
        pass
    for b in bookings_memory:
        if b['id'] == booking_id:
            return b
    raise HTTPException(status_code=404, detail="Booking not found.")


@app.post("/api/discover-radius")
def discover_with_radius(intent: Intent):
    """
    Agent 6 — Radius Expansion Agent endpoint.
    Progressive radius expansion until 3+ providers found.
    """
    try:
        providers, final_radius = expand_and_discover(intent.service, intent.location)
        return {
            "providers": [p.model_dump() for p in providers],
            "final_radius_km": final_radius
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
