"""
PowerGrid AI  Master Data Ingestion Script
Loads all datasets into Neon PostgreSQL in the correct order:
  1. Gujarat assets (from OSM JSON + synthetic)
  2. Weather readings (filtered 2019-2020 CSV)
  3. Sensor readings (normal-dataset CSVs)
  4. Fault incidents (fault_data.csv)
  5. Health index predictions (Health index1.csv  DGA)
  6. Risk scores (calculated from predictions + impact)
  7. Recommendations (generated from risk scores)
  8. Crews (synthetic Gujarat crew data)

Run from the backend/ directory:
  python -m scripts.ingest_all
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from scripts.ingest_assets import run as ingest_assets
from scripts.ingest_weather import run as ingest_weather
from scripts.ingest_sensors import run as ingest_sensors
from scripts.ingest_incidents import run as ingest_incidents
from scripts.ingest_predictions import run as ingest_predictions
from scripts.ingest_risks import run as ingest_risks
from scripts.ingest_crews import run as ingest_crews

if __name__ == "__main__":
    print("=" * 60)
    print("PowerGrid AI  Data Ingestion Pipeline")
    print("=" * 60)

    print("\n[1/7] Ingesting Gujarat power assets...")
    ingest_assets()

    print("\n[2/7] Ingesting weather readings (2019-2020)...")
    ingest_weather()

    print("\n[3/7] Ingesting sensor readings...")
    ingest_sensors()

    print("\n[4/7] Ingesting fault incidents...")
    ingest_incidents()

    print("\n[5/7] Ingesting health index predictions (DGA)...")
    ingest_predictions()

    print("\n[6/7] Calculating and inserting risk scores...")
    ingest_risks()

    print("\n[7/7] Seeding crew data...")
    ingest_crews()

    print("\n All data ingested successfully!")

