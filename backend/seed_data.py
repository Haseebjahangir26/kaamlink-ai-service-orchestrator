"""
seed_data.py — Kaamlink AI Service Orchestrator
Generates and inserts 120 realistic service providers into the Supabase database.

Usage:
  python seed_data.py          # Clears existing providers then seeds 120 new ones
  python seed_data.py --append # Appends 120 new providers without deleting existing ones
"""

import random
import uuid
import sys
from database import get_db

# ── Data pools ────────────────────────────────────────────────────────────────

FIRST_NAMES = [
    "Ali", "Bilal", "Hassan", "Usman", "Tariq", "Imran", "Kamran", "Fahad",
    "Zain", "Omar", "Ahmad", "Hamza", "Saad", "Waqas", "Noman", "Asad",
    "Faisal", "Rizwan", "Shahid", "Junaid", "Khalid", "Babar", "Danish",
    "Ehsan", "Farhan", "Ghulam", "Irfan", "Javed"
]

COMPANY_SUFFIXES = [
    "Services", "Works", "Experts", "Pros", "Solutions",
    "Masters", "Care", "Team", "Hub", "Point"
]

# All Islamabad/Rawalpindi sectors & towns
LOCATIONS = [
    "G-13", "G-11", "G-9",
    "F-8",  "F-10", "F-11", "F-7",
    "I-8",  "I-10",
    "E-11",
    "DHA",  "Bahria Town", "Saddar", "Rawalpindi Cantt"
]

# Each category: canonical name → list of keyword tags used by the intent agent
SERVICE_CATEGORIES = {
    "AC Technician": [
        "AC repair", "AC cleaning", "cooling issue",
        "compressor repair", "gas filling", "split AC installation"
    ],
    "Plumber": [
        "plumbing", "pipe repair", "water motor",
        "sink repair", "leakage", "geyser installation"
    ],
    "Electrician": [
        "electrician", "wiring", "ups installation",
        "short circuit", "fan installation", "switchboard repair"
    ],
    "Home Cleaning": [
        "home cleaning", "maid service", "deep cleaning",
        "sofa cleaning", "carpet cleaning"
    ],
    "Carpenter": [
        "carpentry", "furniture repair", "wood polish",
        "door lock installation", "cabinet making"
    ],
    "Painter": [
        "painting", "wall paint", "polish",
        "distemper", "weather sheet"
    ],
    "Pest Control": [
        "pest control", "termite treatment",
        "fumigation", "bug spray"
    ],
    "Car Wash": [
        "car wash", "car cleaning", "auto detailing",
        "interior cleaning", "exterior wash"
    ],
    "Towing": [
        "towing", "car towing", "breakdown service",
        "roadside assistance", "vehicle recovery"
    ],
}

# Price bands per category (min, max) in PKR, rounded to nearest 50
PRICE_BANDS = {
    "AC Technician":  (1000, 3500),
    "Plumber":        (800,  3000),
    "Electrician":    (800,  3000),
    "Home Cleaning":  (2500, 6000),
    "Carpenter":      (1500, 4000),
    "Painter":        (1500, 4000),
    "Pest Control":   (2500, 6000),
    "Car Wash":       (500,  2500),
    "Towing":         (2000, 8000),
}


# ── Generator ─────────────────────────────────────────────────────────────────

def generate_mock_providers(count: int = 120) -> list[dict]:
    providers = []

    for _ in range(count):
        category_name = random.choice(list(SERVICE_CATEGORIES.keys()))
        all_tags      = SERVICE_CATEGORIES[category_name]

        # Pick 2-4 service tags from the category
        num_tags = random.randint(2, min(4, len(all_tags)))
        services = random.sample(all_tags, num_tags)

        # Build a realistic business name
        first_name = random.choice(FIRST_NAMES)
        suffix     = random.choice(COMPANY_SUFFIXES)
        name = (
            f"{first_name} {category_name.split()[0]} {suffix}"
            if random.random() > 0.5
            else f"{first_name} {suffix}"
        )

        location          = random.choice(LOCATIONS)
        rating            = round(random.uniform(3.5, 5.0), 1)
        cancellation_rate = round(random.uniform(0.01, 0.25), 2)

        lo, hi    = PRICE_BANDS[category_name]
        base_price = round(random.randint(lo, hi) / 50) * 50

        providers.append({
            "id":                str(uuid.uuid4()),
            "name":              name,
            "services":          services,
            "rating":            rating,
            "cancellation_rate": cancellation_rate,
            "base_price":        base_price,
            "location":          location,
        })

    return providers


# ── Seeder ────────────────────────────────────────────────────────────────────

def seed_providers(append_mode: bool = False):
    db = get_db()

    if not append_mode:
        print("[*] Clearing existing providers table...")
        try:
            # Delete all rows by filtering on a always-true condition
            db.table("providers").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
            print("[OK] Existing providers cleared.\n")
        except Exception as e:
            print(f"[WARN] Could not clear table (continuing anyway): {e}\n")
    else:
        print("[*] Append mode -- existing providers will be kept.\n")

    providers = generate_mock_providers(120)
    print(f"[*] Generated {len(providers)} providers. Inserting in batches...\n")

    # Insert in batches of 20 for efficiency
    BATCH = 20
    success_count = 0
    for i in range(0, len(providers), BATCH):
        batch = providers[i : i + BATCH]
        try:
            db.table("providers").insert(batch).execute()
            success_count += len(batch)
            print(f"   [OK] Inserted batch {i // BATCH + 1} ({success_count}/{len(providers)})")
        except Exception as e:
            print(f"   [FAIL] Batch {i // BATCH + 1} failed, falling back to row-by-row: {e}")
            for p in batch:
                try:
                    db.table("providers").insert(p).execute()
                    success_count += 1
                except Exception as row_err:
                    print(f"      [SKIP] '{p['name']}': {row_err}")

    print(f"\n[DONE] Successfully inserted {success_count} / {len(providers)} providers.")

    # Print a quick breakdown by category
    from collections import Counter
    cat_counts: Counter = Counter()
    for p in providers:
        for tag in p["services"]:
            for cat, tags in SERVICE_CATEGORIES.items():
                if tag in tags:
                    cat_counts[cat] += 1
                    break

    print("\n[INFO] Category distribution:")
    for cat, cnt in sorted(cat_counts.items(), key=lambda x: -x[1]):
        print(f"   {cat:<18} - {cnt} service tags across inserted providers")


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    append = "--append" in sys.argv
    seed_providers(append_mode=append)
