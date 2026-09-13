"""
Ingest Gujarat power assets.
Sources:
  - gujarat_power_assets.json  (real OSM data pulled earlier)
  - Synthetic transformers spread across major Gujarat cities
"""

import os, sys, json, random
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from datetime import datetime, timedelta
from app.db.database import SessionLocal
from app.models.models import Asset, AssetStatus

# Major Gujarat cities with approx coordinates
GUJARAT_CITIES = [
    {"city": "Ahmedabad",  "district": "Ahmedabad",  "lat": 23.0225, "lon": 72.5714},
    {"city": "Surat",      "district": "Surat",       "lat": 21.1702, "lon": 72.8311},
    {"city": "Vadodara",   "district": "Vadodara",    "lat": 22.3072, "lon": 73.1812},
    {"city": "Rajkot",     "district": "Rajkot",      "lat": 22.3039, "lon": 70.8022},
    {"city": "Gandhinagar","district": "Gandhinagar", "lat": 23.2156, "lon": 72.6369},
    {"city": "Bhavnagar",  "district": "Bhavnagar",   "lat": 21.7645, "lon": 72.1519},
    {"city": "Jamnagar",   "district": "Jamnagar",    "lat": 22.4707, "lon": 70.0577},
    {"city": "Junagadh",   "district": "Junagadh",    "lat": 21.5222, "lon": 70.4579},
    {"city": "Anand",      "district": "Anand",       "lat": 22.5645, "lon": 72.9289},
    {"city": "Mehsana",    "district": "Mehsana",     "lat": 23.5880, "lon": 72.3693},
]

MANUFACTURERS = ["ABB", "Siemens", "Crompton Greaves", "BHEL", "Schneider Electric", "Transformers & Rectifiers"]
VOLTAGE_LEVELS = [11.0, 33.0, 66.0, 110.0, 132.0, 220.0]


def make_transformer(idx: int, city_info: dict, customers: int, critical: int) -> dict:
    jitter_lat = random.uniform(-0.04, 0.04)
    jitter_lon = random.uniform(-0.04, 0.04)
    age_years = random.randint(2, 25)
    install_date = datetime.utcnow() - timedelta(days=age_years * 365)
    return {
        "asset_id": f"TR-{1000 + idx:04d}",
        "asset_type": "transformer",
        "name": f"{city_info['city']} Transformer {idx}",
        "latitude": city_info["lat"] + jitter_lat,
        "longitude": city_info["lon"] + jitter_lon,
        "capacity_mva": random.choice([10, 20, 40, 63, 100, 160]),
        "voltage_kv": random.choice(VOLTAGE_LEVELS),
        "manufacturer": random.choice(MANUFACTURERS),
        "installation_date": install_date,
        "status": random.choices(
            [AssetStatus.ACTIVE, AssetStatus.MAINTENANCE, AssetStatus.OFFLINE],
            weights=[85, 10, 5]
        )[0],
        "customers_served": customers,
        "critical_facilities": critical,
        "district": city_info["district"],
        "state": "Gujarat",
    }


def make_substation(idx: int, city_info: dict) -> dict:
    jitter_lat = random.uniform(-0.08, 0.08)
    jitter_lon = random.uniform(-0.08, 0.08)
    age_years = random.randint(5, 35)
    install_date = datetime.utcnow() - timedelta(days=age_years * 365)
    return {
        "asset_id": f"SS-{2000 + idx:04d}",
        "asset_type": "substation",
        "name": f"{city_info['city']} Substation {idx}",
        "latitude": city_info["lat"] + jitter_lat,
        "longitude": city_info["lon"] + jitter_lon,
        "capacity_mva": random.choice([100, 200, 400, 630]),
        "voltage_kv": random.choice([132.0, 220.0, 400.0]),
        "manufacturer": random.choice(MANUFACTURERS),
        "installation_date": install_date,
        "status": random.choices(
            [AssetStatus.ACTIVE, AssetStatus.MAINTENANCE],
            weights=[90, 10]
        )[0],
        "customers_served": random.randint(50000, 200000),
        "critical_facilities": random.randint(5, 30),
        "district": city_info["district"],
        "state": "Gujarat",
    }


def run():
    db = SessionLocal()
    try:
        existing = db.query(Asset).count()
        if existing > 0:
            print(f"  Assets already loaded ({existing} records). Skipping.")
            return

        assets_to_insert = []
        idx = 0

        # Load OSM assets if available
        osm_path = os.path.join(os.path.dirname(__file__), "..", "..", "gujarat_power_assets.json")
        if os.path.exists(osm_path):
            with open(osm_path, "r") as f:
                osm = json.load(f)
            for item in osm[:50]:  # cap to first 50 OSM nodes
                city_info = random.choice(GUJARAT_CITIES)
                asset_type = "substation" if item.get("power") == "substation" else "transformer"
                prefix = "SS" if asset_type == "substation" else "TR"
                idx += 1
                assets_to_insert.append({
                    "asset_id": f"{prefix}-OSM{idx:04d}",
                    "asset_type": asset_type,
                    "name": item.get("name", f"OSM Asset {idx}"),
                    "latitude": item["lat"],
                    "longitude": item["lon"],
                    "capacity_mva": random.choice([40, 63, 100]),
                    "voltage_kv": random.choice([33.0, 132.0, 220.0]),
                    "manufacturer": random.choice(MANUFACTURERS),
                    "installation_date": datetime.utcnow() - timedelta(days=random.randint(1000, 8000)),
                    "status": AssetStatus.ACTIVE,
                    "customers_served": random.randint(5000, 80000),
                    "critical_facilities": random.randint(0, 10),
                    "district": city_info["district"],
                    "state": "Gujarat",
                })
            print(f"  Loaded {len(osm[:50])} OSM assets.")

        # Synthetic transformers: 20 per city across 10 cities = 200 transformers
        for city_info in GUJARAT_CITIES:
            for j in range(20):
                idx += 1
                customers = random.randint(5000, 85000)
                critical = random.randint(0, 10)
                assets_to_insert.append(make_transformer(idx, city_info, customers, critical))

        # Synthetic substations: 3 per city = 30 substations
        for city_info in GUJARAT_CITIES:
            for j in range(3):
                idx += 1
                assets_to_insert.append(make_substation(idx, city_info))

        # Insert in bulk
        objs = [Asset(**a) for a in assets_to_insert]
        db.bulk_save_objects(objs)
        db.commit()
        print(f"   Inserted {len(objs)} assets into Neon.")
    finally:
        db.close()


if __name__ == "__main__":
    run()

