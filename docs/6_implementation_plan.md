# Phase 2: Backend Logic Enhancements & Edge Cases

To ensure the Kaamlink AI Service Orchestrator is bulletproof for production and the hackathon demo, we need to handle edge cases gracefully. The current backend assumes perfectly formed user inputs ("AC repair in G-13") and doesn't handle deviations well.

## Goal
Implement robust error handling, input validation, and fallback mechanisms within the AI orchestration flow to handle gibberish inputs, missing parameters, and database anomalies without crashing.

## Edge Cases to Cover

### 1. Out-of-Domain Requests (Gibberish)
*Scenario:* The user types "Who is the Prime Minister?" or "asdasdasd".
*Current Behavior:* Gemini attempts to force it into a service intent, leading to weird results or crashes.
*Proposed Change:* Update `intent_agent.py` prompt to explicitly return `"service": "invalid"` if the request is not related to home services. `discovery_agent.py` will intercept this and return an empty list, logging: *"Request rejected: Non-service query detected."*

### 2. Missing Location Data
*Scenario:* The user types "I need an electrician urgently" without specifying a sector.
*Current Behavior:* The discovery agent strictly matches location, so it will return 0 providers if `intent.location` is "unknown".
*Proposed Change:* Update `discovery_agent.py` to handle `"unknown"` locations. If the location is missing, it will log *"Location missing, expanding search radius globally"* and return the top-rated providers for that service across *all* locations.

### 3. Service Unavailable (No Matches)
*Scenario:* The user requests a service that isn't in our database (e.g., "Helicopter repair").
*Current Behavior:* Returns an empty array without logging the failure gracefully.
*Proposed Change:* Add a specific trace log: *"No providers found matching criteria. Fallback triggered."*

### 4. API Resilience
*Scenario:* The Gemini API times out or fails.
*Current Behavior:* The backend throws a raw 500 error.
*Proposed Change:* Catch Gemini errors explicitly in `main.py` and return a clean `503 Service Unavailable: AI Engine Offline` message to the frontend.

## User Review Required
> [!IMPORTANT]
> By default, if a user does not provide a location (e.g., "Fix my fridge"), my proposed logic will return the top-rated fridge repairmen across the entire city. Are you okay with this fallback behavior, or would you prefer the API to reject the request and demand a location?

## Verification Plan
1. Send a gibberish request ("tell me a joke") and verify it is rejected cleanly.
2. Send a request without a location ("need a plumber") and verify it returns global matches.
