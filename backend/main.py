import os
from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Kaamlink AI Service Orchestrator API")

@app.get("/")
def read_root():
    return {"message": "Welcome to Kaamlink API"}
