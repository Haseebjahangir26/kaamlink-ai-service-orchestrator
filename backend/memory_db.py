agent_logs_memory = []
bookings_memory = []
radius_logs_memory = []
bids_memory = []

providers_memory = [
    # ── AC Repair ──────────────────────────────────────────────────────────────
    {
        "id": "prov_ac_1",
        "name": "Quick Fix AC",
        "services": ["AC repair", "AC installation", "AC service", "AC gas filling"],
        "rating": 4.9,
        "cancellation_rate": 0.02,
        "base_price": 1000,
        "location": "G-13",
        "distance_km": 0.8
    },
    {
        "id": "prov_ac_2",
        "name": "Ali Cool Services",
        "services": ["AC repair", "Fridge repair", "AC service"],
        "rating": 4.5,
        "cancellation_rate": 0.10,
        "base_price": 800,
        "location": "F-8",
        "distance_km": 2.1
    },
    {
        "id": "prov_ac_3",
        "name": "CoolBreeze Technicians",
        "services": ["AC repair", "AC installation", "split AC service"],
        "rating": 4.7,
        "cancellation_rate": 0.05,
        "base_price": 1200,
        "location": "G-11",
        "distance_km": 1.5
    },
    {
        "id": "prov_ac_4",
        "name": "Frost AC Solutions",
        "services": ["AC repair", "AC service", "window AC repair"],
        "rating": 4.3,
        "cancellation_rate": 0.08,
        "base_price": 900,
        "location": "I-8",
        "distance_km": 3.2
    },
    # ── Plumbing ───────────────────────────────────────────────────────────────
    {
        "id": "prov_plumb_1",
        "name": "Bilal Plumbing",
        "services": ["plumbing", "pipe repair", "water leakage", "geyser repair"],
        "rating": 4.8,
        "cancellation_rate": 0.05,
        "base_price": 500,
        "location": "G-13",
        "distance_km": 0.5
    },
    {
        "id": "prov_plumb_2",
        "name": "Islamabad Plumbers",
        "services": ["plumbing", "water motor", "nali blockage", "tap repair"],
        "rating": 4.6,
        "cancellation_rate": 0.07,
        "base_price": 600,
        "location": "F-10",
        "distance_km": 2.8
    },
    {
        "id": "prov_plumb_3",
        "name": "FlowRight Services",
        "services": ["plumbing", "pipe repair", "bathroom fitting"],
        "rating": 4.4,
        "cancellation_rate": 0.12,
        "base_price": 550,
        "location": "G-9",
        "distance_km": 3.5
    },
    # ── Electrician ────────────────────────────────────────────────────────────
    {
        "id": "prov_elec_1",
        "name": "Voltage Pro",
        "services": ["electrician", "wiring", "short circuit fix", "fan installation"],
        "rating": 4.7,
        "cancellation_rate": 0.04,
        "base_price": 700,
        "location": "G-13",
        "distance_km": 1.0
    },
    {
        "id": "prov_elec_2",
        "name": "Power Solutions ISB",
        "services": ["electrician", "bijli", "switchboard repair", "UPS installation"],
        "rating": 4.5,
        "cancellation_rate": 0.06,
        "base_price": 800,
        "location": "F-7",
        "distance_km": 2.4
    },
    {
        "id": "prov_elec_3",
        "name": "Spark Electricals",
        "services": ["electrician", "wiring", "generator service"],
        "rating": 4.3,
        "cancellation_rate": 0.10,
        "base_price": 650,
        "location": "H-13",
        "distance_km": 4.0
    },
    # ── Home Cleaning ──────────────────────────────────────────────────────────
    {
        "id": "prov_clean_1",
        "name": "Sparkle Clean",
        "services": ["home cleaning", "deep clean", "sofa cleaning", "carpet cleaning"],
        "rating": 4.8,
        "cancellation_rate": 0.03,
        "base_price": 1500,
        "location": "G-13",
        "distance_km": 0.7
    },
    {
        "id": "prov_clean_2",
        "name": "Fresh Home Services",
        "services": ["home cleaning", "maid service", "kitchen cleaning"],
        "rating": 4.5,
        "cancellation_rate": 0.08,
        "base_price": 1200,
        "location": "F-11",
        "distance_km": 2.0
    },
    # ── Carpentry ──────────────────────────────────────────────────────────────
    {
        "id": "prov_carp_1",
        "name": "Master Woodworks",
        "services": ["carpentry", "furniture repair", "door fitting", "cabinet making"],
        "rating": 4.7,
        "cancellation_rate": 0.05,
        "base_price": 1000,
        "location": "G-13",
        "distance_km": 1.2
    },
    {
        "id": "prov_carp_2",
        "name": "Almirah Experts",
        "services": ["carpentry", "wood polish", "furniture", "almirah repair"],
        "rating": 4.4,
        "cancellation_rate": 0.09,
        "base_price": 900,
        "location": "G-10",
        "distance_km": 2.6
    },
    # ── Painting ──────────────────────────────────────────────────────────────
    {
        "id": "prov_paint_1",
        "name": "ColorMaster Painters",
        "services": ["painting", "wall paint", "distemper", "polish"],
        "rating": 4.6,
        "cancellation_rate": 0.06,
        "base_price": 3000,
        "location": "G-13",
        "distance_km": 1.0
    },
    # ── Pest Control ──────────────────────────────────────────────────────────
    {
        "id": "prov_pest_1",
        "name": "BugFree ISB",
        "services": ["pest control", "termite treatment", "fumigation", "cockroach spray"],
        "rating": 4.8,
        "cancellation_rate": 0.03,
        "base_price": 3500,
        "location": "G-13",
        "distance_km": 1.5
    },
    # ── Car Wash ──────────────────────────────────────────────────────────────
    {
        "id": "prov_car_1",
        "name": "AutoShine Car Wash",
        "services": ["car wash", "car clean", "auto detailing", "gaari wash"],
        "rating": 4.5,
        "cancellation_rate": 0.07,
        "base_price": 400,
        "location": "G-13",
        "distance_km": 0.9
    },
    # ── Towing ────────────────────────────────────────────────────────────────
    {
        "id": "prov_tow_1",
        "name": "Rescue Towing ISB",
        "services": ["towing", "vehicle recovery", "roadside assistance", "breakdown service"],
        "rating": 4.7,
        "cancellation_rate": 0.04,
        "base_price": 1500,
        "location": "G-13",
        "distance_km": 2.0
    },
]
