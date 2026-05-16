# Kaamlink AI Service Orchestrator — Project Artifacts

This file lists every artifact produced during the design, development, and iteration of the Kaamlink project for hackathon submission.

---

## 📋 Planning & Design Artifacts

| File | Description |
|---|---|
| [`docs/1_implementation_plan.md`](docs/1_implementation_plan.md) | Initial system architecture and Phase 1 agent design |
| [`docs/2_implementation_plan.md`](docs/2_implementation_plan.md) | Provider discovery and ranking agent plan |
| [`docs/3_implementation_plan.md`](docs/3_implementation_plan.md) | Database schema and Supabase integration plan |
| [`docs/4_implementation_plan.md`](docs/4_implementation_plan.md) | Mobile UI redesign plan (dark theme, state machine) |
| [`docs/5_implementation_plan.md`](docs/5_implementation_plan.md) | Resilience and edge case handling plan |
| [`docs/6_implementation_plan.md`](docs/6_implementation_plan.md) | Phase 2 agent additions and UI expansion |
| [`docs/7_phase2_implementation_plan.md`](docs/7_phase2_implementation_plan.md) | Full Phase 2 build plan (3 new agents + 5 screens) |
| [`docs/8_audit_and_walkthrough.md`](docs/8_audit_and_walkthrough.md) | Codebase audit, bug fixes, and final architecture walkthrough |

---

## 🤖 Backend Artifacts

| File | Description |
|---|---|
| [`backend/main.py`](backend/main.py) | FastAPI app — 9 endpoints across Phase 1 & 2 |
| [`backend/models.py`](backend/models.py) | All Pydantic models: Intent, Provider, Bid, Pricing, Recovery |
| [`backend/memory_db.py`](backend/memory_db.py) | 18-provider in-memory database + fallback stores |
| [`backend/database.py`](backend/database.py) | Supabase client with graceful fallback |
| [`backend/agents/intent_agent.py`](backend/agents/intent_agent.py) | Agent 1+2: Gemini intent extraction + complexity + location normalization |
| [`backend/agents/discovery_agent.py`](backend/agents/discovery_agent.py) | Agent 3: Provider filtering and ranking |
| [`backend/agents/pricing_agent.py`](backend/agents/pricing_agent.py) | Agent 5: Dynamic pricing with acceptance probability |
| [`backend/agents/radius_agent.py`](backend/agents/radius_agent.py) | Agent 6: Progressive radius expansion (500m→10km) |
| [`backend/agents/recovery_agent.py`](backend/agents/recovery_agent.py) | Agent 7: Cancellation detection and replacement booking |
| [`backend/requirements.txt`](backend/requirements.txt) | Python dependencies |
| [`backend/Dockerfile`](backend/Dockerfile) | Container config for Google Cloud Run deployment |
| [`backend/test_e2e.py`](backend/test_e2e.py) | End-to-end API tests |

---

## 📱 Mobile Artifacts

| File | Description |
|---|---|
| [`mobile/constants/kaamlink.ts`](mobile/constants/kaamlink.ts) | Design tokens, API_BASE, shared constants |
| [`mobile/components/KaamilinkUI.tsx`](mobile/components/KaamilinkUI.tsx) | Shared UI: PulsingDot, AgentStepRow, NavHeader, Avatar |
| [`mobile/screens/HomeScreen.tsx`](mobile/screens/HomeScreen.tsx) | Screen 1: Roman Urdu input + live 4-agent trace |
| [`mobile/screens/PricingScreen.tsx`](mobile/screens/PricingScreen.tsx) | Screen 2: Market range + live acceptance probability bar |
| [`mobile/screens/BidsScreen.tsx`](mobile/screens/BidsScreen.tsx) | Screen 3: Animated bid reveal + countdown + Best Value badge |
| [`mobile/screens/ConfirmedScreen.tsx`](mobile/screens/ConfirmedScreen.tsx) | Screen 4: Receipt + Roman Urdu 5-step timeline |
| [`mobile/screens/RecoveryScreen.tsx`](mobile/screens/RecoveryScreen.tsx) | Screen 5: Recovery Agent live trace + replacement card |
| [`mobile/app/(tabs)/index.tsx`](mobile/app/(tabs)/index.tsx) | 35-line orchestrator routing all 5 screens |
| [`mobile/app.json`](mobile/app.json) | Expo config (usesCleartextTraffic, port, icons) |

---

## 🔢 Agent Inventory (7 Total)

| Agent # | Name | Trigger | Key Output |
|---|---|---|---|
| 1 | Intent Agent | User types in Roman Urdu | service, location, urgency, preferred_time |
| 2 | Complexity Agent | Part of intent extraction | basic / intermediate / complex |
| 3 | Discovery Agent | After intent extracted | Ranked list of up to 3 providers |
| 4 | Booking Agent | User selects a provider/bid | booking_id, confirmed status |
| 5 | Pricing Agent | Before bid screen | market_min, market_max, acceptance_probability |
| 6 | Radius Expansion Agent | Provider search | Expanded provider list + final_radius_km |
| 7 | Recovery Agent | Simulate Cancellation | Step trace + replacement_provider + new booking_id |

---

## 🌐 API Endpoints

| Method | Endpoint | Agent | Description |
|---|---|---|---|
| GET | `/` | — | Health check |
| POST | `/api/request` | Intent (1+2) | Extract intent from text |
| POST | `/api/providers` | Discovery (3) | Find + rank providers |
| POST | `/api/book` | Booking (4) | Confirm booking |
| POST | `/api/pricing` | Pricing (5) | Market pricing + acceptance probability |
| POST | `/api/discover-radius` | Radius (6) | Expanding radius search |
| POST | `/api/bids` | Bid Simulation | Generate provider bids |
| POST | `/api/recover` | Recovery (7) | Cancel + find replacement |
| GET | `/api/booking/{id}` | — | Fetch booking status |
| GET | `/api/logs` | — | Agent action logs |

---

## 🚀 How to Run

### Backend
```bash
cd backend
venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Mobile (Phone via Expo Go)
```powershell
cd mobile
$env:NODE_OPTIONS="--max-old-space-size=4096"
npx expo start --lan --port 8082 --clear
# Open exp://192.168.18.143:8082 in Expo Go
```

---

## 📊 Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native + Expo SDK 54 |
| Backend | FastAPI (Python 3.11) |
| AI | Gemini 2.5 Flash |
| Database | Supabase PostgreSQL |
| Deployment | Google Cloud Run |
| Orchestration | Google Antigravity |
