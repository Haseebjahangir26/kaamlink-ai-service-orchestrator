# Kaamlink AI Service Orchestrator (Phase 1 Completion)

This plan outlines the remaining 60% of Phase 1, focusing on the demo-critical flows: Provider Discovery & Ranking, the Booking Flow, and the Agent Trace Panel.

## Goal
Complete the Phase 1 backend endpoints (`/api/providers`, `/api/book`) and integrate them into the React Native app. Introduce the Agent Trace Panel to visualize the agentic reasoning process in real-time.

## User Review Required
> [!IMPORTANT]
> To support the new endpoints, we need two new tables in Supabase. Please run the following SQL in your Supabase SQL Editor:
> ```sql
> CREATE TABLE bookings (
>     id TEXT PRIMARY KEY,
>     user_id TEXT NOT NULL,
>     provider_id TEXT NOT NULL,
>     service TEXT NOT NULL,
>     status TEXT NOT NULL,
>     created_at TIMESTAMP DEFAULT NOW()
> );
> 
> CREATE TABLE agent_logs (
>     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
>     agent_name TEXT NOT NULL,
>     decision TEXT NOT NULL,
>     reasoning TEXT,
>     created_at TIMESTAMP DEFAULT NOW()
> );
> ```
> Let me know once you have executed this SQL so we can proceed with the execution!

## Proposed Changes

### [Backend Updates]
- **`agents/discovery_agent.py`**:
  - Connects to Supabase `providers` table.
  - Filters by the requested service/location.
  - Ranks the providers by rating and location.
  - Writes a trace log to the `agent_logs` table (e.g., "Discovery Agent", "Found 3 providers", "Filtered by location G-13...").
- **`main.py`**:
  - `POST /api/providers`: Accepts the extracted intent and returns ranked providers.
  - `POST /api/book`: Accepts a provider ID and user ID, creates a booking in the `bookings` table, and writes an `agent_logs` trace.
  - `GET /api/logs`: Returns the latest agent logs for the Trace Panel.

### [Mobile App Updates]
- **Agent Trace Panel**: A new component in `index.tsx` that polls `/api/logs` every 2 seconds to show the user what the AI is currently thinking/doing.
- **Provider Discovery Screen**: Updates the UI to show the top 3 ranked providers based on the user's intent after clicking "Find Provider".
- **Booking Flow**: A "Book Now" button on the provider card that hits `/api/book` and displays a Receipt Card with the new Booking ID.

## Verification Plan

### Automated Tests
- We will write a simple `test_phase1.py` script that acts as a user:
  1. Sends a Roman Urdu request to `/api/request`.
  2. Receives the extracted intent.
  3. Requests bids via `/api/providers`.
  4. Selects a bid and posts to `/api/book`.
  5. Verifies the successful booking response and logs.

### Manual Verification
- We will run the Expo web emulator and manually test the flow from entering text to booking a provider, ensuring the Agent Trace Panel accurately updates during the process.
