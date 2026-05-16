# Kaamlink — AI Service Orchestrator

> Pakistan's first AI-powered home service booking platform. Describe your problem in Roman Urdu — 7 AI agents find, price, bid, book, and recover your service automatically.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square)](https://fastapi.tiangolo.com)
[![Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-4285F4?style=flat-square)](https://ai.google.dev)
[![Expo](https://img.shields.io/badge/Mobile-Expo%20Go-000020?style=flat-square)](https://expo.dev)
[![Supabase](https://img.shields.io/badge/DB-Supabase-3ECF8E?style=flat-square)](https://supabase.com)

---

## What Is Kaamlink?

Kaamlink is an agentic AI orchestration system for Pakistan's informal service economy. A user types their problem in Roman Urdu (e.g. *"AC thanda nahi kar raha, G-13 mein urgent"*) and a chain of 7 AI agents handles the rest — automatically.

---

## 7-Agent Pipeline

```
User Input (Roman Urdu)
        │
        ▼
┌─────────────────────┐
│  Agent 1+2          │  Intent + Complexity Agent
│  Gemini 2.5 Flash   │  → service, location, urgency, complexity
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Agent 5            │  Pricing Agent
│  Market Intelligence│  → price range, suggested offer, acceptance %
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Agent 6            │  Radius Expansion Agent
│  Progressive Search │  → 500m → 1.5km → 3km → 10km
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Agent 3            │  Discovery + Ranking Agent
│  Score & Rank       │  → top 3 providers by proximity + rating
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Agent 4            │  Booking Agent
│  Confirm & Log      │  → booking_id confirmed in Supabase
└────────┬────────────┘
         │
    [If Cancellation]
         ▼
┌─────────────────────┐
│  Agent 7            │  Recovery Agent
│  Auto-Recovery      │  → replacement found + step trace
└─────────────────────┘
```

---

## Mobile App — 5 Screens

| Screen | What It Shows |
|---|---|
| **Home** | Roman Urdu input + live 4-agent trace panel + intent chips |
| **Pricing** | Market range, AI suggested price, live acceptance probability bar |
| **Live Bids** | 3 bid cards animate in one-by-one, Best Value badge, countdown |
| **Confirmed** | Receipt + 5-step Roman Urdu notification timeline |
| **Recovery** | Recovery Agent trace + replacement provider found |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Expo Go app on Android/iOS
- `.env` file in `backend/` with `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Mobile
```bash
cd mobile
npm install
# Set your WiFi IP in mobile/constants/kaamlink.ts → API_BASE
npx expo start --lan --port 8082
# Scan QR code with Expo Go
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/request` | Extract intent from Roman Urdu text |
| POST | `/api/providers` | Discover and rank providers |
| POST | `/api/pricing` | Get market price range and acceptance probability |
| POST | `/api/bids` | Simulate provider bids |
| POST | `/api/book` | Confirm booking |
| POST | `/api/recover` | Trigger cancellation recovery |
| POST | `/api/discover-radius` | Expanding radius provider search |
| GET | `/api/booking/{id}` | Get booking status |
| GET | `/api/logs` | Agent action logs |

---

## Project Structure

```
kaamlink-ai-service-orchestrator/
├── backend/
│   ├── main.py                    # FastAPI app — all endpoints
│   ├── models.py                  # Pydantic models
│   ├── memory_db.py               # 18 mock providers + in-memory fallback
│   ├── database.py                # Supabase client
│   ├── requirements.txt
│   ├── Dockerfile                 # Google Cloud Run
│   └── agents/
│       ├── intent_agent.py        # Agent 1+2: Gemini + location normalization
│       ├── discovery_agent.py     # Agent 3: Discovery + ranking
│       ├── pricing_agent.py       # Agent 5: Dynamic pricing
│       ├── radius_agent.py        # Agent 6: Radius expansion
│       └── recovery_agent.py      # Agent 7: Cancellation recovery
├── mobile/
│   ├── constants/kaamlink.ts      # API_BASE + design tokens
│   ├── components/KaamilinkUI.tsx # Shared UI components
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── PricingScreen.tsx
│   │   ├── BidsScreen.tsx
│   │   ├── ConfirmedScreen.tsx
│   │   └── RecoveryScreen.tsx
│   └── app/(tabs)/index.tsx       # 5-screen orchestrator
├── docs/                          # All planning and audit artifacts
└── ARTIFACTS.md                   # Master artifact index
```

---

## Tech Stack

| Component | Technology |
|---|---|
| Mobile | React Native + Expo SDK 54 |
| Backend | FastAPI (Python 3.11) |
| AI Model | Gemini 2.5 Flash |
| Database | Supabase PostgreSQL |
| Deployment | Google Cloud Run |
| Orchestration | Google Antigravity |

---

## Artifacts

See [`ARTIFACTS.md`](ARTIFACTS.md) for a full index of every planning document, implementation plan, and audit artifact produced during development.
