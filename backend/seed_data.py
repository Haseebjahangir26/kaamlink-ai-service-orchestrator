from database import get_db

mock_providers = [
    {
        "id": "p1",
        "name": "Bilal Plumbing",
        "services": ["plumbing", "pipe repair", "water motor"],
        "rating": 4.8,
        "cancellation_rate": 0.05,
        "base_price": 1500,
        "location": "G-13"
    },
    {
        "id": "p2",
        "name": "Hassan Pipe Works",
        "services": ["plumbing", "sink repair"],
        "rating": 4.9,
        "cancellation_rate": 0.02,
        "base_price": 1700,
        "location": "G-13"
    },
    {
        "id": "p3",
        "name": "Quick Fix AC",
        "services": ["AC repair", "AC cleaning", "cooling issue"],
        "rating": 4.1,
        "cancellation_rate": 0.15,
        "base_price": 2500,
        "location": "F-8"
    },
    {
        "id": "p4",
        "name": "Ali Cool Services",
        "services": ["AC repair", "compressor repair"],
        "rating": 4.7,
        "cancellation_rate": 0.08,
        "base_price": 3000,
        "location": "G-13"
    }
]

def seed_providers():
    db = get_db()
    for p in mock_providers:
        # In a real Supabase DB, you would have a 'providers' table
        try:
            db.table('providers').upsert(p).execute()
            print(f"Inserted/Updated provider: {p['name']}")
        except Exception as e:
            print(f"Error inserting {p['name']}: {e}")

if __name__ == "__main__":
    seed_providers()
