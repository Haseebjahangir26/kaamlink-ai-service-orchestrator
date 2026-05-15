# Kaamlink AI Service Orchestrator (Phase 1 Build - V2)

This implementation plan outlines the first phase of the Kaamlink AI Service Orchestrator. Based on your feedback, we will be building a **React Native** application for the mobile frontend alongside the **FastAPI** backend.

## Goal
Build the foundational backend (FastAPI) and the initial mobile app structure (React Native using Expo). The system will handle natural language service requests, extract user intent using Gemini, find available providers from a mock dataset, simulate the bidding process, and complete a booking.

## User Review Required
> [!IMPORTANT]
> 1. **Database:** You didn't specify the database choice. I propose we use **SQLite** for this initial phase to get up and running quickly. We can easily migrate to Supabase PostgreSQL later. Is SQLite okay for now?

## Proposed Architecture

### 1. Backend (`/backend` folder)
- **Framework**: FastAPI (Python)
- **Database**: SQLite (via SQLAlchemy)
- **AI Agent**: Gemini API (`google-genai`)
- **Key Files**: 
  - `main.py`: Entry point for FastAPI.
  - `models.py`: Database schemas for `User`, `Provider`, `Booking`, and `Bid`.
  - `agents/intent_agent.py`: Uses Gemini to extract service intent from Roman Urdu/English text.
  - `agents/discovery_agent.py`: Filters mock providers based on the extracted intent.
  - `agents/bid_simulation_agent.py`: Simulates bids from nearby providers.

### 2. Mobile App (`/mobile` folder)
- **Framework**: React Native (with Expo)
- **Key Screens (Phase 1)**:
  - `HomeScreen`: Input natural language request (e.g. "AC thanda nahi kar raha").
  - `BiddingScreen`: See live simulated bids from providers.
  - `ConfirmationScreen`: Confirm the booking.

## Execution Steps

1. **Backend Setup**: Initialize FastAPI project in `backend/`, set up SQLite DB and mock provider data.
2. **AI Integration**: Build the `/api/request` endpoint with the Gemini intent extraction agent.
3. **Mobile Setup**: Initialize React Native Expo project in `mobile/` using `npx create-expo-app`.
4. **Integration**: Connect the React Native app to the local FastAPI server to send the text request and display the parsed intent and simulated bids.

## Verification Plan
1. Send a Roman Urdu request from the React Native app to the backend.
2. The backend extracts the intent and returns it.
3. The mobile app successfully displays the parsed service, location, and urgency.
