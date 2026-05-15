import os
from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv

load_dotenv()

from models import UserRequest, Intent
from agents.intent_agent import extract_intent

app = FastAPI(title="Kaamlink AI Service Orchestrator API")

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
