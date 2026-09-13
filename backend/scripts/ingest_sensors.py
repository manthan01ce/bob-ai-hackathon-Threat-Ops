"""
Ingest normal sensor readings from normal-dataset.zip.
Merges all 5 CSVs on DeviceTimeStamp and maps to our sensor_readings schema.
Assigns readings round-robin across existing assets.
"""

import os, sys, zipfile, io, random
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pandas as pd
from datetime import datetime
from app.db.database import SessionLocal
from app.models.models import Asset, SensorReading

SENSOR_ZIP = r"C:\Users\Manthan\Downloads\normal-dataset.zip"
BATCH_SIZE = 5000


def run():
    db = SessionLocal()
    try:
        existing = db.query(SensorReading).count()
        if existing > 0:
            print(f"  Sensor readings already loaded ({existing} records). Skipping.")
            return

        assets = db.query(Asset).filter(Asset.asset_type == "transformer").all()
        if not assets:
            print("    No assets found. Run ingest_assets first.")
            return

        asset_ids = [a.id for a in assets]

        if not os.path.exists(SENSOR_ZIP):
            print(f"    Sensor ZIP not found at {SENSOR_ZIP}. Skipping.")
            return

        print(f"  Opening {SENSOR_ZIP}...")
        with zipfile.ZipFile(SENSOR_ZIP, "r") as z:
            # Load each CSV
            dfs = {}
            for fname in z.namelist():
                if fname.endswith(".csv"):
                    with z.open(fname) as f:
                        key = os.path.splitext(os.path.basename(fname))[0]
                        dfs[key] = pd.read_csv(f)
                        print(f"    Loaded {key}: {len(dfs[key])} rows")

        # Merge all on DeviceTimeStamp
        base = None
        for key, df in dfs.items():
            df["DeviceTimeStamp"] = pd.to_datetime(df["DeviceTimeStamp"], errors="coerce")
            df = df.dropna(subset=["DeviceTimeStamp"])
            df = df.rename(columns={"DeviceTimeStamp": "ts"})
            if base is None:
                base = df
            else:
                base = pd.merge(base, df, on="ts", how="outer", suffixes=("", f"_{key}"))

        base = base.sort_values("ts").reset_index(drop=True)
        print(f"  Merged sensor dataset: {len(base)} rows")

        def safe(df, col):
            if col in df.columns:
                val = df[col]
                return pd.to_numeric(val, errors="coerce")
            return None

        inserted = 0
        batch = []
        asset_cycle = 0

        for _, row in base.iterrows():
            ts = row["ts"]
            if pd.isnull(ts):
                continue

            asset_id = asset_ids[asset_cycle % len(asset_ids)]
            asset_cycle += 1

            # Overview: OTI=oil temp index, WTI=winding temp index
            oti = row.get("OTI")
            wti = row.get("WTI")

            # CurrentVoltage
            vl1 = row.get("VL1")
            il1 = row.get("IL1")

            # Power
            kw = row.get("KW") or row.get("WL1")
            kva = row.get("KVA") or row.get("VAL1")

            # PowerFactor
            pf = row.get("Avg_PF") or row.get("PFL1")
            freq = row.get("FRQ")

            def to_f(v):
                try:
                    return float(v)
                except Exception:
                    return None

            batch.append(SensorReading(
                asset_id=asset_id,
                timestamp=ts,
                temperature=to_f(wti),
                oil_temperature=to_f(oti),
                voltage=to_f(vl1),
                current=to_f(il1),
                power_kw=to_f(kw),
                power_kva=to_f(kva),
                power_factor=to_f(pf),
                frequency=to_f(freq),
                load_percent=to_f(row.get("OLI")),
                vibration=round(random.uniform(0.5, 8.0), 3),   # synthetic: not in dataset
                oil_quality=round(random.uniform(40, 95), 2),   # synthetic
                partial_discharge=round(random.uniform(0, 500), 2),  # synthetic
            ))

            if len(batch) >= BATCH_SIZE:
                db.bulk_save_objects(batch)
                db.commit()
                inserted += len(batch)
                print(f"    Inserted {inserted} sensor rows so far...")
                batch = []

        if batch:
            db.bulk_save_objects(batch)
            db.commit()
            inserted += len(batch)

        print(f"   Inserted {inserted} sensor readings.")
    finally:
        db.close()


if __name__ == "__main__":
    run()

