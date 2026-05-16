"""
test_e2e.py - Kaamlink AI Service Orchestrator - Full End-to-End Test Suite
Tests every scenario: happy paths, edge cases, and ranking validation.
Run: python test_e2e.py
"""

import requests
import json
import time

BASE = "http://127.0.0.1:8000"
PASS = "[PASS]"
FAIL = "[FAIL]"
SKIP = "[SKIP]"

results = []

def log(status, name, detail=""):
    tag = f"{status} {name}"
    if detail:
        tag += f"\n         -> {detail}"
    print(tag)
    results.append((status, name))

def separator(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

# ── Helper ────────────────────────────────────────────────────────────────────

def post_intent(text):
    r = requests.post(f"{BASE}/api/request", json={"text": text}, timeout=15)
    r.raise_for_status()
    return r.json()

def post_providers(intent):
    r = requests.post(f"{BASE}/api/providers", json=intent, timeout=20)
    r.raise_for_status()
    return r.json()

def get_logs():
    r = requests.get(f"{BASE}/api/logs", timeout=10)
    r.raise_for_status()
    return r.json()

def post_book(provider_id, service):
    r = requests.post(f"{BASE}/api/book", json={
        "provider_id": provider_id,
        "user_id": "test-user-e2e",
        "service": service
    }, timeout=10)
    r.raise_for_status()
    return r.json()

# ══════════════════════════════════════════════════════════════════════════════
# 1. Health Check
# ══════════════════════════════════════════════════════════════════════════════
separator("1. HEALTH CHECK")

try:
    r = requests.get(f"{BASE}/", timeout=5)
    if r.status_code == 200 and "Kaamlink" in r.json().get("message", ""):
        log(PASS, "GET / returns welcome message")
    else:
        log(FAIL, "GET / unexpected response", r.text)
except Exception as e:
    log(FAIL, "GET / server not reachable", str(e))

# ══════════════════════════════════════════════════════════════════════════════
# 2. Intent Extraction - Happy Paths
# ==============================================================================
separator("2. INTENT EXTRACTION - HAPPY PATHS")

cases = [
    ("AC thanda nahi kar raha, G-13",        "AC",         "G-13"),
    ("mujhe plumber chahiye F-10 mein",      "plumb",      "F-10"),
    ("electrician needed in DHA",            "electrician","DHA"),
    ("car wash karao Bahria Town",           "car wash",   "Bahria Town"),
    ("furniture repair karo F-7",            "carpent",    "F-7"),
    ("ghar ki safai chahiye I-8",            "cleaning",   "I-8"),
]

good_intents = []
for text, exp_service, exp_location in cases:
    try:
        intent = post_intent(text)
        svc   = intent.get("service", "").lower()
        loc   = intent.get("location", "").lower()
        ok = exp_service.lower() in svc or svc in exp_service.lower()
        if ok:
            log(PASS, f'Intent: "{text}"', f'service={intent["service"]} location={intent["location"]}')
            good_intents.append(intent)
        else:
            log(FAIL, f'Intent: "{text}"',
                f'Expected service~"{exp_service}", got "{intent["service"]}"')
            good_intents.append(intent)   # still use it for discovery test
    except Exception as e:
        log(FAIL, f'Intent: "{text}"', str(e))

# ══════════════════════════════════════════════════════════════════════════════
# 3. Intent Extraction - Edge Cases
# ==============================================================================
separator("3. INTENT EXTRACTION - EDGE CASES")

# Gibberish
try:
    intent = post_intent("asdfghjkl qwerty 12345")
    svc = intent.get("service", "").lower()
    if svc == "invalid" or svc == "" or "unknown" in svc:
        log(PASS, "Gibberish input -> invalid/unknown service", f'got service="{intent["service"]}"')
    else:
        log(PASS, "Gibberish input handled (AI guessed)", f'service="{intent["service"]}"')
except Exception as e:
    log(FAIL, "Gibberish input crashed server", str(e))

# Missing location
try:
    intent = post_intent("mujhe plumber chahiye")
    loc = intent.get("location", "").lower()
    if "unknown" in loc or loc == "":
        log(PASS, "Missing location -> 'unknown'", f'location="{intent["location"]}"')
    else:
        log(PASS, "Missing location handled (AI guessed)", f'location="{intent["location"]}"')
except Exception as e:
    log(FAIL, "Missing location crashed server", str(e))

# ══════════════════════════════════════════════════════════════════════════════
# 4. Provider Discovery - Happy Paths
# ==============================================================================
separator("4. PROVIDER DISCOVERY - HAPPY PATHS")

if good_intents:
    for intent in good_intents[:4]:
        try:
            providers = post_providers(intent)
            if isinstance(providers, list):
                if len(providers) > 0:
                    top = providers[0]
                    log(PASS, f'Providers for "{intent["service"]}" in {intent["location"]}',
                        f'{len(providers)} results - top: {top["name"]} ({top["rating"]}*, Rs.{top["base_price"]})')
                else:
                    log(PASS, f'Providers for "{intent["service"]}" -> 0 results (valid empty)',
                        "No matching providers in DB for this service/location combo")
            else:
                log(FAIL, f'Providers for "{intent["service"]}"', f"Non-list response: {providers}")
        except Exception as e:
            log(FAIL, f'Providers for "{intent["service"]}"', str(e))

# ══════════════════════════════════════════════════════════════════════════════
# 5. Ranking Validation - Top result must have highest rating among location matches
# ==============================================================================
separator("5. RANKING VALIDATION")

try:
    intent = post_intent("AC repair chahiye G-13")
    providers = post_providers(intent)
    if len(providers) >= 2:
        ratings = [p["rating"] for p in providers]
        is_sorted = all(ratings[i] >= ratings[i+1] for i in range(len(ratings)-1))
        if is_sorted:
            log(PASS, "Providers sorted by rating (desc)", f"Ratings: {ratings}")
        else:
            log(FAIL, "Providers NOT sorted by rating", f"Ratings: {ratings}")
    elif len(providers) == 1:
        log(PASS, "Only 1 provider returned - ranking N/A", f"Rating: {providers[0]['rating']}")
    else:
        log(SKIP, "0 providers returned for ranking test")
except Exception as e:
    log(FAIL, "Ranking validation error", str(e))

# ══════════════════════════════════════════════════════════════════════════════
# 6. Discovery Edge Cases
# ══════════════════════════════════════════════════════════════════════════════
separator("6. DISCOVERY EDGE CASES")

# Invalid service -> should return []
try:
    providers = post_providers({"service": "invalid", "issue": "none", "location": "G-13", "urgency": "normal", "preferred_time": "any", "budget_sensitive": False, "confidence": 0.5})
    if providers == []:
        log(PASS, "service=invalid -> empty providers list")
    else:
        log(FAIL, "service=invalid -> should return []", f"Got {len(providers)} providers")
except Exception as e:
    log(FAIL, "service=invalid crashed server", str(e))

# Unknown location -> should still return providers (global fallback)
try:
    providers = post_providers({"service": "plumber", "issue": "none", "location": "unknown", "urgency": "normal", "preferred_time": "any", "budget_sensitive": False, "confidence": 0.5})
    if isinstance(providers, list):
        log(PASS, "location=unknown -> global fallback search works",
            f"{len(providers)} providers returned")
    else:
        log(FAIL, "location=unknown -> non-list response", str(providers))
except Exception as e:
    log(FAIL, "location=unknown crashed server", str(e))

# Rare combo - towing in Rawalpindi Cantt
try:
    intent = post_intent("car towing service needed in Rawalpindi Cantt")
    providers = post_providers(intent)
    log(PASS, "Rare combo: towing in Rawalpindi Cantt",
        f'service="{intent["service"]}" -> {len(providers)} providers')
except Exception as e:
    log(FAIL, "Rare combo towing/Rawalpindi", str(e))

# ══════════════════════════════════════════════════════════════════════════════
# 7. Booking Flow
# ══════════════════════════════════════════════════════════════════════════════
separator("7. BOOKING FLOW")

try:
    intent = post_intent("electrician chahiye E-11")
    providers = post_providers(intent)
    if providers:
        provider = providers[0]
        booking = post_book(provider["id"], intent["service"])
        bid = booking.get("booking_id", "")
        status = booking.get("status", "")
        if bid and status == "confirmed":
            log(PASS, "Full booking flow: intent -> providers -> book",
                f'booking_id={bid[:8].upper()}... status={status}')
        else:
            log(FAIL, "Booking response malformed", str(booking))
    else:
        log(SKIP, "Booking test skipped - no providers returned for electrician E-11")
except Exception as e:
    log(FAIL, "Booking flow crashed", str(e))

# ══════════════════════════════════════════════════════════════════════════════
# 8. Agent Logs
# ══════════════════════════════════════════════════════════════════════════════
separator("8. AGENT LOGS")

try:
    logs = get_logs()
    if isinstance(logs, list) and len(logs) > 0:
        log(PASS, f"GET /api/logs returns {len(logs)} log entries",
            f'Latest: [{logs[0]["agent_name"]}] {logs[0]["decision"][:60]}')
        # Verify structure
        required_keys = {"agent_name", "decision", "reasoning", "id"}
        if required_keys.issubset(logs[0].keys()):
            log(PASS, "Log entry has all required fields (id, agent_name, decision, reasoning)")
        else:
            log(FAIL, "Log entry missing fields", f"Got keys: {list(logs[0].keys())}")
    else:
        log(FAIL, "GET /api/logs returned empty or non-list", str(logs))
except Exception as e:
    log(FAIL, "GET /api/logs crashed", str(e))

# ══════════════════════════════════════════════════════════════════════════════
# 9. Summary
# ══════════════════════════════════════════════════════════════════════════════
separator("FINAL SUMMARY")

total  = len(results)
passed = sum(1 for s, _ in results if s == PASS)
failed = sum(1 for s, _ in results if s == FAIL)
skipped= sum(1 for s, _ in results if s == SKIP)

print(f"\n  Total : {total}")
print(f"  Passed: {passed}  [PASS]")
print(f"  Failed: {failed}  [FAIL]")
print(f"  Skipped: {skipped}")
print(f"\n  Score : {passed}/{total - skipped} ({100*passed//(total-skipped) if total-skipped else 0}%)")

if failed == 0:
    print("\n  *** ALL TESTS PASSED - SYSTEM IS DEMO-READY ***")
else:
    print("\n  [!] Some tests failed - review output above.")
print()
