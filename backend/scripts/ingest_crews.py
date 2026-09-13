"""Seed synthetic crew data across Gujarat zones."""

import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import random
from app.db.database import SessionLocal
from app.models.models import Crew

GUJARAT_ZONES = [
    {"zone": "Ahmedabad North",  "lat": 23.1200, "lon": 72.5400},
    {"zone": "Ahmedabad South",  "lat": 22.9500, "lon": 72.6000},
    {"zone": "Surat Zone",       "lat": 21.1702, "lon": 72.8311},
    {"zone": "Vadodara Zone",    "lat": 22.3072, "lon": 73.1812},
    {"zone": "Rajkot Zone",      "lat": 22.3039, "lon": 70.8022},
    {"zone": "Gandhinagar Zone", "lat": 23.2156, "lon": 72.6369},
]

CREW_NAMES = [
    "Alpha Team", "Bravo Team", "Charlie Team", "Delta Team",
    "Echo Team",  "Foxtrot Team", "Golf Team",  "Hotel Team",
    "India Team", "Juliet Team", "Kilo Team",   "Lima Team",
]

SKILLS = ["senior_technician", "lineman", "substation_engineer", "maintenance_specialist"]


def run():
    db = SessionLocal()
    try:
        existing = db.query(Crew).count()
        if existing > 0:
            print(f"  Crews already seeded ({existing} records). Skipping.")
            return

        batch = []
        crew_num = 1
        for zone_info in GUJARAT_ZONES:
            for j in range(2):  # 2 crews per zone = 12 crews
                batch.append(Crew(
                    crew_id=f"CREW-{crew_num:02d}",
                    name=CREW_NAMES[(crew_num - 1) % len(CREW_NAMES)],
                    latitude=zone_info["lat"] + random.uniform(-0.02, 0.02),
                    longitude=zone_info["lon"] + random.uniform(-0.02, 0.02),
                    zone=zone_info["zone"],
                    available=random.choice([True, True, True, False]),
                    skill_level=random.choice(SKILLS),
                ))
                crew_num += 1

        db.bulk_save_objects(batch)
        db.commit()
        print(f"   Inserted {len(batch)} crew records.")
    finally:
        db.close()


if __name__ == "__main__":
    run()

