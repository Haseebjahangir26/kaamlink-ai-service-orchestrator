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
    confidence: float

class Provider(BaseModel):
    id: str
    name: str
    services: List[str]
    rating: float
    cancellation_rate: float
    base_price: int
    location: str

class Bid(BaseModel):
    id: str
    provider_id: str
    amount: int
    eta_mins: int
    
class BookingRequest(BaseModel):
    bid_id: str
    user_id: str
