# Kaamlink Phase 2 — Complete Build Plan

Phase 2 upgrades Kaamlink from a basic intent+discovery flow into a **full 7-agent agentic system** with dynamic pricing, animated radius search, live bid simulation, cancellation recovery, and a completely revamped mobile UI.

---

## Proposed Changes

### Backend — 3 New Agents

---

#### [NEW] `backend/agents/pricing_agent.py`
- Accepts: `service`, `complexity`, `urgency`, `location`, `user_budget` (optional)
- Uses Gemini API to compute `market_min`, `market_max`, `suggested_offer`, `factors`, `acceptance_probability`, `recommendation`
- Urgency multipliers: Low=1.0x, Medium=1.15x, High=1.35x
- Falls back to rule-based pricing if Gemini is unavailable
- Logs decision to `agent_logs`

#### [NEW] `backend/agents/radius_agent.py`
- Starts at 500m radius → expands to 1.5km → 3km → 5km until 3+ providers found
- Waits 2 seconds between expansions (simulated delay for demo effect)
- Logs each expansion step to `agent_logs` with `{ radius_km, providers_found }`
- Returns final provider list + radius used

#### [NEW] `backend/agents/recovery_agent.py`
- Triggered by `POST /api/recover` with a `booking_id`
- Fetches original booking context, marks it `cancelled`
- Re-runs radius expansion (wider start) excluding cancelled provider
- Creates replacement booking record linked to original via `replacement_for`
- Logs every recovery step with timestamps

---

### Backend — Models & API

#### [MODIFY] `backend/models.py`
- Add `PricingRequest`, `PricingResponse` models
- Add `BidRequest`, `BidResponse` models
- Add `RecoveryRequest`, `RecoveryResponse` models
- Add `distance_km` field to `Provider`
- Add `complexity` field to `Intent`

#### [MODIFY] `backend/main.py`
- Add `POST /api/pricing` — calls Pricing Agent
- Add `POST /api/bids` — runs bid simulation on providers list
- Add `POST /api/recover` — triggers Recovery Agent
- Add `GET /api/booking/{booking_id}` — fetch booking status
- Add `POST /api/discover-radius` — Radius Expansion Agent endpoint

#### [MODIFY] `backend/memory_db.py`
- Add `bids_memory`, `radius_logs_memory` lists
- Expand `providers_memory` to 18 providers across all 8 service categories

---

### Mobile — Modular 5-Screen Architecture

Phase 2 replaces the single-screen App.js with a **modular 5-screen state-driven flow**:

| Screen | File | Trigger |
|---|---|---|
| 0 | `HomeScreen.tsx` | App launch |
| 1 | `PricingScreen.tsx` | After intent extracted |
| 2 | `BidsScreen.tsx` | After price accepted |
| 3 | `ConfirmedScreen.tsx` | After bid accepted |
| 4 | `RecoveryScreen.tsx` | After "Simulate Cancellation" |

#### Screen 0 — Home (`HomeScreen.tsx`)
- Dark theme, Kaamlink logo with "7 Agents Active" badge
- Roman Urdu/English text input with demo seed text
- 4-agent live trace panel (Intent → Discovery → Ranking → Booking)
- Chips show: service, location, urgency, complexity, confidence score
- Mock bottom tab bar (HOME / SERVICES / REQUESTS / ACCOUNT)

#### Screen 1 — Pricing (`PricingScreen.tsx`)
- Calls `POST /api/pricing` on mount
- Pricing Agent trace row at top
- Market range card: `PKR X – Y`
- AI Suggested price with sparkle badge (calls Gemini)
- Live acceptance probability bar (updates as user types custom budget)
- Color coded: green (75%+), amber (50–74%), red (<50%)

#### Screen 2 — Live Bids (`BidsScreen.tsx`)
- Countdown timer (2:00 minutes)
- Radius Expansion + Bid Simulation agent trace rows
- 3 bid cards animate in one-by-one (1.5s delay each)
- "BEST VALUE" trophy badge on cheapest bid
- "Accept Bid" / "⚡ Accept Best Bid" CTAs

#### Screen 3 — Booking Confirmed (`ConfirmedScreen.tsx`)
- Calls `POST /api/book` on mount
- Green success hero with animated checkmark
- Provider card with avatar, name, ETA, Live Tracking pill
- Service receipt (Base + Emergency fee if high urgency + Platform fee)
- 5-step Roman Urdu notification timeline (auto-animates every 2.2s)
- "Simulate Provider Cancellation" amber button → triggers Screen 4

#### Screen 4 — Recovery (`RecoveryScreen.tsx`)
- Calls `POST /api/recover` on mount
- Amber warning banner: "Provider Cancelled"
- Recovery Agent step trace — steps animate in one-by-one (1.4s each)
- Green success card when replacement found with new provider card
- "Start New Request" CTA

---

### Shared Infrastructure
- `constants/kaamlink.ts` — `API_BASE`, design tokens, shared mock reasonings
- `components/KaamilinkUI.tsx` — `PulsingDot`, `AgentStepRow`, `NavHeader`, `Avatar`, `SectionHeader`
- `app/(tabs)/index.tsx` — 35-line clean orchestrator routing between all screens

---

## Verification Plan

### Backend
```bash
cd backend
venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
- Test `POST /api/request` with Roman Urdu input
- Test `POST /api/pricing` with AC repair + high urgency
- Test `POST /api/bids` — verify 3 bids returned with amounts
- Test `POST /api/recover` with a booking_id

### Mobile (Phone)
```bash
cd mobile
$env:NODE_OPTIONS="--max-old-space-size=4096"
npx expo start --lan --port 8082 --clear
```
- Open `exp://192.168.18.143:8082` in Expo Go
- Walk through full 5-screen flow on Android phone
- Verify: acceptance bar animates, bid cards slide in, timeline steps, recovery trace
