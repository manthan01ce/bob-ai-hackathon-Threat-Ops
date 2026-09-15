"""
Ingest fault incidents from faulty data-set.zip  fault_data.csv
Maps columns to our incidents schema.
"""

import os, sys, zipfile, random
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pandas as pd
from datetime import datetime, timedelta
from app.db.database import SessionLocal
from app.models.models import Asset, Incident, RiskLevel

FAULT_ZIP = r"C:\Users\Manthan\Downloads\faulty data-set.zip"

SEVERITY_MAP = {
    "low": RiskLevel.LOW,
    "medium": RiskLevel.MEDIUM,
    "high": RiskLevel.HIGH,
    "critical": RiskLevel.CRITICAL,
}


def run():
    db = SessionLocal()
    try:
        existing = db.query(Incident).count()
        if existing > 0:
            print(f"  Incidents already loaded ({existing} records). Skipping.")
            return

        assets = db.query(Asset).all()
        if not assets:
            print("    No assets found. Run ingest_assets first.")
            return
        asset_ids = [a.id for a in assets]

        if not os.path.exists(FAULT_ZIP):
            print(f"    Fault ZIP not found at {FAULT_ZIP}. Skipping.")
            return

        with zipfile.ZipFile(FAULT_ZIP, "r") as z:
            with z.open("fault_data.csv") as f:
                df = pd.read_csv(f)

        print(f"  Loaded fault_data.csv: {len(df)} rows, columns: {list(df.columns)}")

        def to_f(v):
            try:
                return float(v)
            except Exception:
                return None

        def get_severity(comp_health):
            try:
                h = float(comp_health)
                if h < 25: return RiskLevel.CRITICAL
                if h < 50: return RiskLevel.HIGH
                if h < 75: return RiskLevel.MEDIUM
                return RiskLevel.LOW
            except Exception:
                return RiskLevel.MEDIUM

        # Parse location "lat, lon"
        def parse_loc(loc_str):
            try:
                parts = str(loc_str).split(",")
                return float(parts[0].strip()), float(parts[1].strip())
            except Exception:
                return None, None

        inserted = 0
        batch = []

        for idx, row in df.iterrows():
            asset_id = asset_ids[idx % len(asset_ids)]

            # Use a synthetic start time spread over 2019-2020
            days_back = random.randint(0, 730)
            started_at = datetime(2020, 12, 31) - timedelta(days=days_back, hours=random.randint(0, 23))
            duration = to_f(row.get("Duration of Fault (hrs)")) or random.uniform(0.5, 24)
            ended_at = started_at + timedelta(hours=duration)

            component_health = to_f(row.get("Component Health"))
            severity = get_severity(component_health)

            fault_type = str(row.get("Fault Type", "Unknown"))
            weather_cond = str(row.get("Weather Condition", "")) if pd.notna(row.get("Weather Condition")) else None
            maint_status = str(row.get("Maintenance Status", "")) if pd.notna(row.get("Maintenance Status")) else None

            batch.append(Incident(
                asset_id=asset_id,
                incident_type="outage",
                fault_type=fault_type,
                severity=severity,
                started_at=started_at,
                ended_at=ended_at,
                customers_affected=random.randint(100, 50000),
                root_cause=fault_type,
                weather_condition=weather_cond,
                voltage_at_fault=to_f(row.get("Voltage (V)")),
                current_at_fault=to_f(row.get("Current (A)")),
                power_load_mw=to_f(row.get("Power Load (MW)")),
                temperature_at_fault=to_f(row.get("Temperature (C)") or row.get("Temperature (\ufffdC)")),
                wind_speed_at_fault=to_f(row.get("Wind Speed (km/h)")),
                duration_hrs=duration,
                downtime_hrs=to_f(row.get("Down time (hrs)")),
                maintenance_status=maint_status,
                component_health=component_health,
            ))

        db.bulk_save_objects(batch)
        db.commit()
        inserted = len(batch)
        print(f"   Inserted {inserted} fault incidents.")
    finally:
        db.close()


if __name__ == "__main__":
    run()

