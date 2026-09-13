"""
Calculate and insert risk scores for every asset.
Formula:
  impact_score = f(customers_served, critical_facilities)
  overall_risk = failure_probability * 0.6 + impact_normalized * 0.3 + weather_risk * 0.1
  risk_level   = based on overall_risk thresholds
Also generates open recommendations for CRITICAL and HIGH assets.
"""

import os, sys, random
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from datetime import datetime
from app.db.database import SessionLocal
from app.models.models import Asset, Prediction, RiskScore, Recommendation, RiskLevel


def calc_impact_score(customers: int, critical_fac: int) -> float:
    customer_score = min(100, customers / 1000)          # 100k customers  100
    critical_score = min(100, critical_fac * 10)          # 10+ critical fac  100
    return round(customer_score * 0.7 + critical_score * 0.3, 2)


def calc_risk_level(score: float) -> RiskLevel:
    if score >= 76: return RiskLevel.CRITICAL
    if score >= 51: return RiskLevel.HIGH
    if score >= 26: return RiskLevel.MEDIUM
    return RiskLevel.LOW


ACTION_MAP = {
    RiskLevel.CRITICAL: [
        ("inspect_immediately", "Inspect transformer immediately  failure probability >85%", "immediate"),
        ("pre_position_crew",   "Pre-position nearest available crew to asset location",       "immediate"),
        ("prepare_spare",       "Prepare replacement transformer from nearest warehouse",      "immediate"),
    ],
    RiskLevel.HIGH: [
        ("schedule_inspection", "Schedule inspection within 6 hours",                         "6h"),
        ("increase_monitoring", "Increase sensor polling frequency to every 15 minutes",       "6h"),
    ],
    RiskLevel.MEDIUM: [
        ("schedule_inspection", "Schedule routine inspection within 48 hours",                "48h"),
    ],
    RiskLevel.LOW: [
        ("monitor",             "Continue standard monitoring schedule",                       "7d"),
    ],
}


def run():
    db = SessionLocal()
    try:
        existing_risks = db.query(RiskScore).count()
        existing_recs = db.query(Recommendation).count()
        if existing_risks > 0:
            print(f"  Risk scores already loaded ({existing_risks} records). Skipping.")
            return

        assets = db.query(Asset).all()
        if not assets:
            print("    No assets found.")
            return

        risk_batch = []
        rec_batch = []
        now = datetime.utcnow()

        for asset in assets:
            # Get latest prediction for this asset
            pred = (
                db.query(Prediction)
                .filter(Prediction.asset_id == asset.id)
                .order_by(Prediction.prediction_time.desc())
                .first()
            )

            failure_prob = (pred.failure_probability if pred else random.uniform(0.05, 0.95))
            impact_score = calc_impact_score(
                asset.customers_served or random.randint(1000, 50000),
                asset.critical_facilities or random.randint(0, 8)
            )

            # Simple weather risk: random seeded per asset for demo
            random.seed(asset.id)
            weather_risk = round(random.uniform(10, 80), 2)

            overall = round(
                failure_prob * 100 * 0.60 +
                impact_score * 0.30 +
                weather_risk * 0.10,
                2
            )
            overall = min(100, overall)
            risk_level = calc_risk_level(overall)

            risk_batch.append(RiskScore(
                asset_id=asset.id,
                failure_probability=round(failure_prob, 4),
                impact_score=impact_score,
                weather_risk=weather_risk,
                overall_risk_score=overall,
                risk_level=risk_level,
                calculated_at=now,
            ))

            # Generate recommendations for HIGH and CRITICAL
            if risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL):
                actions = ACTION_MAP.get(risk_level, [])
                for priority, (action_type, description, urgency) in enumerate(actions, start=1):
                    rec_batch.append(Recommendation(
                        asset_id=asset.id,
                        priority=priority,
                        action_type=action_type,
                        description=description,
                        urgency=urgency,
                        status="open",
                        created_at=now,
                    ))

        db.bulk_save_objects(risk_batch)
        db.commit()
        print(f"   Inserted {len(risk_batch)} risk scores.")

        db.bulk_save_objects(rec_batch)
        db.commit()
        print(f"   Inserted {len(rec_batch)} recommendations.")
    finally:
        db.close()


if __name__ == "__main__":
    run()

