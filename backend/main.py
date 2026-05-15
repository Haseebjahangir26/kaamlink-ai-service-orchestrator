import os
from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv

load_dotenv()

from models import UserRequest, Intent, Provider, BookingRequest, AgentLog
from agents.intent_agent import extract_intent
from agents.discovery_agent import discover_providers, log_agent_action
from database import get_db
from memory_db import agent_logs_memory, bookings_memory
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import uuid

app = FastAPI(title="Kaamlink AI Service Orchestrator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Kaamlink API"}

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
    try:
        db.table('bookings').insert({
            'id': booking_id,
            'user_id': req.user_id,
            'provider_id': req.provider_id,
            'service': req.service,
            'status': 'confirmed'
        }).execute()
    except Exception as e:
        print(f"Fallback: writing booking to memory: {e}")
        bookings_memory.append({
            'id': booking_id,
            'user_id': req.user_id,
            'provider_id': req.provider_id,
            'service': req.service,
            'status': 'confirmed'
        })
        
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
        # Get the latest 10 logs
        res = db.table('agent_logs').select('*').order('created_at', desc=True).limit(10).execute()
        return [AgentLog(**log) for log in res.data]
    except Exception as e:
        # Return top 10 from memory
        return [AgentLog(**log) for log in agent_logs_memory[:10]]
