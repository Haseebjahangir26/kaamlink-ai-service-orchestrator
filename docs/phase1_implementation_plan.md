# Kaamlink AI Service Orchestrator (Phase 1 Build)

This implementation plan outlines the first phase of the Kaamlink AI Service Orchestrator, tailored for the informal economy (plumbers, electricians, etc.) as requested for the Google Antigravity Hackathon.

## Goal
Build the foundational backend and simulated agentic workflows to handle natural language service requests, extract user intent using Gemini, find available providers from a mock dataset, simulate the bidding process, and complete a booking.

## User Review Required
> [!IMPORTANT]
> 1. **Database:** Do you want to use **Supabase PostgreSQL** for the database as recommended in the hackathon doc, or should we start with **SQLite** for faster, local prototyping?
> 2. **Frontend UI:** The doc recommends Flutter for mobile. Since I can build web UIs, would you like me to build a simple HTML/JS dashboard to test and demonstrate the APIs for Phase 1, or do you just want the FastAPI backend endpoints?

## Proposed Changes

### [Backend Setup]
- `requirements.txt`: Add `fastapi`, `uvicorn`, `google-genai`, `sqlalchemy`, `python-dotenv`.
- `main.py`: Entry point for FastAPI application.
- `.env`: Template for `GEMINI_API_KEY`.

### [Database & Models]
- `database.py`: Database connection and schema setup (SQLite/Supabase).
- `models.py`: Pydantic and SQLAlchemy models for `User`, `Provider`, `Booking`, and `Bid`.
- `seed_data.py`: A script to populate the database with mock local providers (e.g., plumbers in G-13, electricians in F-8).

### [Agent Workflows]
- `agents/intent_agent.py`: Uses Gemini to extract service type, location, urgency, and preferred time from Roman Urdu/English text.
- `agents/discovery_agent.py`: Filters mock providers based on the extracted intent.
- `agents/bid_simulation_agent.py`: Simulates bids from nearby providers.

### [API Endpoints]
- `POST /api/request`: Accepts natural language and returns structured intent.
- `POST /api/bids`: Takes intent, discovers providers, and returns simulated bids.
- `POST /api/book`: Accepts a chosen bid and creates a confirmed booking.

## Verification Plan

### Automated Tests
- We will write a simple `test_flow.py` script that acts as a user:
  1. Sends a Roman Urdu request to `/api/request`.
  2. Receives the extracted intent.
  3. Requests bids via `/api/bids`.
  4. Selects a bid and posts to `/api/book`.
  5. Verifies the successful booking response.

### Manual Verification
- Run the FastAPI server and use Swagger UI (`/docs`) to test endpoints manually with different natural language prompts to ensure robust intent extraction.
