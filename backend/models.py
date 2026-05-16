from pydantic import BaseModel
from typing import Optional, List

class UserRequest(BaseModel):
    text: str

class Intent(BaseModel):
    service: str
    issue: str
    location: str
    preferred_time: str
    budget_sensitive: bool
    urgency: str
    complexity: Optional[str] = "intermediate"
    confidence: float

class Provider(BaseModel):
    id: str
    name: str
    services: List[str]
    rating: float
    cancellation_rate: float
    base_price: int
    location: str
    distance_km: Optional[float] = 1.0

class Bid(BaseModel):
    id: str
    provider_id: str
    provider_name: str
    amount: int
    eta_mins: int
    expires_in: int = 120

class BookingRequest(BaseModel):
    provider_id: str
    user_id: str
    service: str
    amount: Optional[int] = None

class AgentLog(BaseModel):
    id: str
    agent_name: str
    decision: str
    reasoning: Optional[str] = None
    created_at: str

# ── Phase 2 models ────────────────────────────────────────────────────────────

class PricingRequest(BaseModel):
    service: str
    complexity: Optional[str] = "intermediate"
    urgency: str = "medium"
    location: str = "unknown"
    user_budget: Optional[int] = None

class PricingResponse(BaseModel):
    market_min: int
    market_max: int
    suggested_offer: int
    factors: List[str]
    user_budget: Optional[int] = None
    acceptance_probability: Optional[int] = None
    recommendation: str

class BidRequest(BaseModel):
    providers: List[Provider]
    user_budget: Optional[int] = None
    urgency: str = "medium"

class BidResponse(BaseModel):
    bids: List[Bid]

class RecoveryRequest(BaseModel):
    booking_id: str

class RecoveryStep(BaseModel):
    message: str
    detail: str
    ts: str

class RecoveryResponse(BaseModel):
    success: bool
    steps: List[RecoveryStep]
    message: str
    replacement_booking_id: Optional[str] = None
    replacement_provider: Optional[dict] = None
