"""
Ingest weather readings from weather_2019_2020.csv
Filters to Gujarat stations only (or all India if no Gujarat stations found).
"""

import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pandas as pd
from datetime import datetime
from app.db.database import SessionLocal
from app.models.models import WeatherReading

WEATHER_CSV = os.path.join(
    os.path.dirname(__file__), "..", "..", "weather_2019_2020.csv"
)

BATCH_SIZE = 5000


def run():
    if not os.path.exists(WEATHER_CSV):
        print(f"    Weather CSV not found at {WEATHER_CSV}. Skipping.")
        return

    db = SessionLocal()
    try:
        existing = db.query(WeatherReading).count()
        if existing > 0:
            print(f"  Weather data already loaded ({existing} records). Skipping.")
            return

        print("  Reading CSV...")
        df = pd.read_csv(WEATHER_CSV, low_memory=False)
        print(f"  Total rows: {len(df)}")

        # Try Gujarat first, fall back to all states
        gujarat_df = df[df["state"].str.strip().str.lower() == "gujarat"] if "state" in df.columns else pd.DataFrame()
        if len(gujarat_df) < 100:
            print("  Not enough Gujarat-specific rows, using full dataset (capped at 50k).")
            target_df = df.head(50000)
        else:
            target_df = gujarat_df
            print(f"  Found {len(target_df)} Gujarat rows.")

        # Parse date
        target_df = target_df.copy()
        target_df["date_of_record"] = pd.to_datetime(target_df["date_of_record"], errors="coerce")
        target_df = target_df.dropna(subset=["date_of_record"])

        def to_float(val):
            try:
                return float(val)
            except Exception:
                return None

        inserted = 0
        batch = []

        for _, row in target_df.iterrows():
            batch.append(WeatherReading(
                station_name=str(row.get("station_name", ""))[:150],
                district=str(row.get("district", ""))[:100],
                state=str(row.get("state", "Gujarat"))[:50],
                latitude=to_float(row.get("latitude")),
                longitude=to_float(row.get("longitude")),
                recorded_at=row["date_of_record"],
                avg_temp=to_float(row.get("avg_temp")),
                min_temp=to_float(row.get("min_temp")),
                max_temp=to_float(row.get("max_temp")),
                wind_speed=to_float(row.get("wind_speed")),
                air_pressure=to_float(row.get("air_pressure")),
                rainfall=to_float(row.get("rainfall")),
                elevation=to_float(row.get("elevation")),
                season=str(row.get("season", ""))[:20] if pd.notna(row.get("season")) else None,
            ))

            if len(batch) >= BATCH_SIZE:
                db.bulk_save_objects(batch)
                db.commit()
                inserted += len(batch)
                print(f"    Inserted {inserted} weather rows so far...")
                batch = []

        if batch:
            db.bulk_save_objects(batch)
            db.commit()
            inserted += len(batch)

        print(f"   Inserted {inserted} weather readings.")
    finally:
        db.close()


if __name__ == "__main__":
    run()

