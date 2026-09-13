"""
Ingest DGA health index predictions from 'faulty dataset with prediction.zip'
Maps columns to predictions table.
Assigns each row round-robin to existing transformer assets.
"""

import os, sys, zipfile, random
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pandas as pd
from datetime import datetime, timedelta
from app.db.database import SessionLocal
from app.models.models import Asset, Prediction

DGA_ZIP = r"C:\Users\Manthan\Downloads\faulty dataset with prediction.zip"


def run():
    db = SessionLocal()
    try:
        existing = db.query(Prediction).count()
        if existing > 0:
            print(f"  Predictions already loaded ({existing} records). Skipping.")
            return

        assets = db.query(Asset).filter(Asset.asset_type == "transformer").all()
        if not assets:
            print("    No transformer assets found. Run ingest_assets first.")
            return
        asset_ids = [a.id for a in assets]

        if not os.path.exists(DGA_ZIP):
            print(f"    DGA ZIP not found at {DGA_ZIP}. Skipping.")
            return

        with zipfile.ZipFile(DGA_ZIP, "r") as z:
            with z.open("Health index1.csv") as f:
                df = pd.read_csv(f)

        print(f"  Loaded Health index1.csv: {len(df)} rows")
        print(f"  Columns: {list(df.columns)}")

        def to_f(v):
            try:
                return float(v)
            except Exception:
                return None

        def health_to_failure_prob(health_index: float) -> float:
            """Convert health index (0-100 good) to failure probability (0-1)."""
            if health_index is None:
                return 0.5
            # Invert and normalize: health 0  prob 1.0, health 100  prob 0.0
            return max(0.0, min(1.0, (100 - health_index) / 100))

        def health_to_risk_window(prob: float) -> str:
            if prob >= 0.85: return "6h"
            if prob >= 0.70: return "24h"
            if prob >= 0.50: return "48h"
            return "7d"

        batch = []
        inserted = 0

        for idx, row in df.iterrows():
            asset_id = asset_ids[idx % len(asset_ids)]
            health_score = to_f(row.get("Health index"))
            life_exp = to_f(row.get("Life expectation"))
            failure_prob = health_to_failure_prob(health_score)
            risk_window = health_to_risk_window(failure_prob)

            # Spread prediction times across 2019-2020
            days_back = random.randint(0, 730)
            pred_time = datetime(2020, 12, 31) - timedelta(days=days_back)

            batch.append(Prediction(
                asset_id=asset_id,
                model_version="v1.0-dga",
                prediction_time=pred_time,
                failure_probability=failure_prob,
                risk_window=risk_window,
                health_score=health_score,
                dga_hydrogen=to_f(row.get("Hydrogen")),
                dga_methane=to_f(row.get("Methane")),
                dga_ethylene=to_f(row.get("Ethylene")),
                dga_co=to_f(row.get("CO")),
                life_expectation=life_exp,
                predicted_failure_type="insulation_degradation",
            ))

        db.bulk_save_objects(batch)
        db.commit()
        inserted = len(batch)
        print(f"   Inserted {inserted} DGA predictions.")
    finally:
        db.close()


if __name__ == "__main__":
    run()

