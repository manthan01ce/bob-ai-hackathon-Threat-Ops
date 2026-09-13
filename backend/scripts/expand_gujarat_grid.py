"""
Fast Bulk Expansion of Gujarat Power Grid Infrastructure across all 33 Districts.
Optimized for batch operations over remote database connections.
"""

import os, sys, random
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from datetime import datetime, timedelta
from app.db.database import SessionLocal
from app.models.models import Asset, AssetStatus, RiskScore, RiskLevel, Prediction, Recommendation

POWER_PLANTS = [
    {"id": "PP-MUNDRA-1", "name": "Mundra Thermal Power Station", "district": "Kutch", "lat": 22.825, "lon": 69.525, "cap": 4620, "v": 400.0},
    {"id": "PP-MUNDRA-2", "name": "Mundra Ultra Mega Power Plant", "district": "Kutch", "lat": 22.810, "lon": 69.550, "cap": 4000, "v": 400.0},
    {"id": "PP-KHAVDA", "name": "Khavda Renewable Energy Park", "district": "Kutch", "lat": 23.850, "lon": 69.720, "cap": 30000, "v": 765.0},
    {"id": "PP-CHARANKA", "name": "Charanka Solar Park", "district": "Patan", "lat": 23.905, "lon": 71.205, "cap": 600, "v": 220.0},
    {"id": "PP-KAKRAPAR", "name": "Kakrapar Nuclear Power Station", "district": "Tapi", "lat": 21.238, "lon": 73.350, "cap": 1400, "v": 400.0},
    {"id": "PP-UKAI", "name": "Ukai Hydro & Thermal Plant", "district": "Tapi", "lat": 21.250, "lon": 73.580, "cap": 1350, "v": 220.0},
    {"id": "PP-GANDHINAGAR", "name": "Gandhinagar Thermal Power Station", "district": "Gandhinagar", "lat": 23.250, "lon": 72.670, "cap": 630, "v": 220.0},
    {"id": "PP-WANAKBORI", "name": "Wanakbori Thermal Power Station", "district": "Kheda", "lat": 22.875, "lon": 73.150, "cap": 2100, "v": 400.0},
    {"id": "PP-SIKKA", "name": "Sikka Thermal Power Station", "district": "Jamnagar", "lat": 22.430, "lon": 69.830, "cap": 500, "v": 220.0},
    {"id": "PP-DHUVARAN", "name": "Dhuvaran Gas Power Station", "district": "Anand", "lat": 22.235, "lon": 72.750, "cap": 595, "v": 220.0},
    {"id": "PP-JHANOR", "name": "Jhanor-Gandhar Gas Power Station", "district": "Bharuch", "lat": 21.780, "lon": 72.980, "cap": 657, "v": 220.0},
    {"id": "PP-SARDAR-SAROVAR", "name": "Sardar Sarovar Hydro Plant", "district": "Narmada", "lat": 21.830, "lon": 73.750, "cap": 1450, "v": 400.0},
]

GUJARAT_33_DISTRICTS = [
    {"name": "Ahmedabad", "lat": 23.0225, "lon": 72.5714},
    {"name": "Surat", "lat": 21.1702, "lon": 72.8311},
    {"name": "Vadodara", "lat": 22.3072, "lon": 73.1812},
    {"name": "Rajkot", "lat": 22.3039, "lon": 70.8022},
    {"name": "Bhavnagar", "lat": 21.7645, "lon": 72.1519},
    {"name": "Jamnagar", "lat": 22.4707, "lon": 70.0577},
    {"name": "Junagadh", "lat": 21.5222, "lon": 70.4579},
    {"name": "Gandhinagar", "lat": 23.2156, "lon": 72.6369},
    {"name": "Anand", "lat": 22.5645, "lon": 72.9289},
    {"name": "Mehsana", "lat": 23.5880, "lon": 72.3693},
    {"name": "Kutch", "lat": 23.2420, "lon": 69.6669},
    {"name": "Banaskantha", "lat": 24.1725, "lon": 72.4330},
    {"name": "Patan", "lat": 23.8500, "lon": 72.1200},
    {"name": "Sabarkantha", "lat": 23.6000, "lon": 72.9500},
    {"name": "Aravalli", "lat": 23.4600, "lon": 73.1800},
    {"name": "Mahisagar", "lat": 23.1300, "lon": 73.6100},
    {"name": "Panchmahal", "lat": 22.7750, "lon": 73.6150},
    {"name": "Dahod", "lat": 22.8300, "lon": 74.2600},
    {"name": "Kheda", "lat": 22.7500, "lon": 72.6800},
    {"name": "Chhota Udaipur", "lat": 22.3100, "lon": 74.0100},
    {"name": "Narmada", "lat": 21.8700, "lon": 73.5000},
    {"name": "Bharuch", "lat": 21.7051, "lon": 72.9959},
    {"name": "Tapi", "lat": 21.2500, "lon": 73.4000},
    {"name": "Navsari", "lat": 20.9500, "lon": 72.9200},
    {"name": "Valsad", "lat": 20.6100, "lon": 72.9300},
    {"name": "Dang", "lat": 20.7500, "lon": 73.7000},
    {"name": "Morbi", "lat": 22.8200, "lon": 70.8300},
    {"name": "Surendranagar", "lat": 22.7200, "lon": 71.6300},
    {"name": "Devbhumi Dwarka", "lat": 22.2400, "lon": 68.9600},
    {"name": "Porbandar", "lat": 21.6417, "lon": 69.6293},
    {"name": "Gir Somnath", "lat": 20.9000, "lon": 70.3700},
    {"name": "Amreli", "lat": 21.6000, "lon": 71.2200},
    {"name": "Botad", "lat": 22.1700, "lon": 71.6600},
]

MANUFACTURERS = ["ABB", "Siemens", "BHEL", "Crompton Greaves", "Schneider Electric", "Transformers & Rectifiers Gujarat", "Bharat Bijlee"]


def run():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        print("Fetching existing asset IDs...")
        existing_asset_ids = set(r[0] for r in db.query(Asset.asset_id).all())
        print(f"Current asset count: {len(existing_asset_ids)}")

        new_assets = []

        # 1. Insert Major Power Plants
        for pp in POWER_PLANTS:
            if pp["id"] not in existing_asset_ids:
                new_assets.append(Asset(
                    asset_id=pp["id"],
                    asset_type="power_plant",
                    name=pp["name"],
                    latitude=pp["lat"],
                    longitude=pp["lon"],
                    capacity_mva=pp["cap"],
                    voltage_kv=pp["v"],
                    manufacturer="BHEL / L&T Gujarat",
                    installation_date=now - timedelta(days=random.randint(2000, 9000)),
                    status=AssetStatus.ACTIVE,
                    customers_served=random.randint(250000, 800000),
                    critical_facilities=random.randint(15, 60),
                    district=pp["district"],
                    state="Gujarat",
                ))

        # 2. Add Substations across all 33 Districts (3 per district = 99 substations)
        ss_num = 3000
        for dist in GUJARAT_33_DISTRICTS:
            for i in range(3):
                ss_num += 1
                ss_id = f"SS-{ss_num:04d}"
                if ss_id not in existing_asset_ids:
                    new_assets.append(Asset(
                        asset_id=ss_id,
                        asset_type="substation",
                        name=f"GETCO {dist['name']} Substation {i+1}",
                        latitude=dist["lat"] + random.uniform(-0.12, 0.12),
                        longitude=dist["lon"] + random.uniform(-0.12, 0.12),
                        capacity_mva=random.choice([66, 100, 150, 220, 400]),
                        voltage_kv=random.choice([66.0, 132.0, 220.0, 400.0]),
                        manufacturer=random.choice(MANUFACTURERS),
                        installation_date=now - timedelta(days=random.randint(1000, 7000)),
                        status=random.choices([AssetStatus.ACTIVE, AssetStatus.MAINTENANCE], weights=[92, 8])[0],
                        customers_served=random.randint(30000, 180000),
                        critical_facilities=random.randint(3, 20),
                        district=dist["name"],
                        state="Gujarat",
                    ))

        # 3. Add Transformers across all 33 Districts (15 per district = 495 transformers)
        tr_num = 5000
        for dist in GUJARAT_33_DISTRICTS:
            for j in range(15):
                tr_num += 1
                tr_id = f"TR-{tr_num:04d}"
                if tr_id not in existing_asset_ids:
                    new_assets.append(Asset(
                        asset_id=tr_id,
                        asset_type="transformer",
                        name=f"{dist['name']} Distribution TR-{tr_num}",
                        latitude=dist["lat"] + random.uniform(-0.18, 0.18),
                        longitude=dist["lon"] + random.uniform(-0.18, 0.18),
                        capacity_mva=random.choice([10, 16, 25, 40, 63]),
                        voltage_kv=random.choice([11.0, 33.0, 66.0]),
                        manufacturer=random.choice(MANUFACTURERS),
                        installation_date=now - timedelta(days=random.randint(500, 6000)),
                        status=random.choices([AssetStatus.ACTIVE, AssetStatus.MAINTENANCE, AssetStatus.OFFLINE], weights=[88, 9, 3])[0],
                        customers_served=random.randint(4000, 45000),
                        critical_facilities=random.randint(0, 8),
                        district=dist["name"],
                        state="Gujarat",
                    ))

        print(f"Bulk saving {len(new_assets)} new assets into Neon...")
        db.bulk_save_objects(new_assets)
        db.commit()

        # Re-query all assets with IDs
        all_assets = db.query(Asset.id, Asset.asset_id, Asset.customers_served, Asset.district).all()
        existing_risk_ids = set(r[0] for r in db.query(RiskScore.asset_id).all())

        risk_objs = []
        rec_objs = []
        pred_objs = []

        print("Generating risk scores in memory...")
        for a_id, a_code, a_cust, a_dist in all_assets:
            if a_id not in existing_risk_ids:
                rand_score = random.betavariate(2, 3) * 100
                overall_score = round(rand_score, 1)

                if overall_score >= 75:
                    r_level = RiskLevel.CRITICAL
                    fail_prob = round(random.uniform(0.75, 0.95), 4)
                elif overall_score >= 50:
                    r_level = RiskLevel.HIGH
                    fail_prob = round(random.uniform(0.50, 0.74), 4)
                elif overall_score >= 25:
                    r_level = RiskLevel.MEDIUM
                    fail_prob = round(random.uniform(0.25, 0.49), 4)
                else:
                    r_level = RiskLevel.LOW
                    fail_prob = round(random.uniform(0.05, 0.24), 4)

                impact = round(min(100, (a_cust or 10000) / 1500), 1)

                risk_objs.append(RiskScore(
                    asset_id=a_id,
                    failure_probability=fail_prob,
                    impact_score=impact,
                    weather_risk=round(random.uniform(15, 75), 1),
                    overall_risk_score=overall_score,
                    risk_level=r_level,
                    calculated_at=now,
                ))

                pred_objs.append(Prediction(
                    asset_id=a_id,
                    model_version="v1.0.0-xgb",
                    prediction_time=now,
                    failure_probability=fail_prob,
                    risk_window="6h" if fail_prob > 0.75 else "24h" if fail_prob > 0.50 else "48h",
                    health_score=round(max(10, (1 - fail_prob) * 100), 1),
                    dga_hydrogen=round(random.uniform(10, 160), 1),
                    dga_methane=round(random.uniform(15, 120), 1),
                    dga_ethylene=round(random.uniform(10, 140), 1),
                    dga_co=round(random.uniform(150, 600), 1),
                    predicted_failure_type="Thermal Overheating" if fail_prob > 0.6 else "Insulation Degradation",
                ))

                if r_level == RiskLevel.CRITICAL:
                    rec_objs.append(Recommendation(
                        asset_id=a_id,
                        priority=1,
                        action_type="immediate_crew_dispatch",
                        description=f"Critical: Emergency diagnostic on {a_code} in {a_dist}",
                        urgency="immediate",
                        status="open",
                        created_at=now,
                    ))

        print(f"Saving {len(risk_objs)} risk scores...")
        if risk_objs:
            db.bulk_save_objects(risk_objs)
            db.commit()

        print(f"Saving {len(pred_objs)} predictions...")
        if pred_objs:
            db.bulk_save_objects(pred_objs)
            db.commit()

        print(f"Saving {len(rec_objs)} recommendations...")
        if rec_objs:
            db.bulk_save_objects(rec_objs)
            db.commit()

        total_final = db.query(Asset).count()
        print(f"SUCCESS: Gujarat Grid now has {total_final} total assets across all 33 districts!")

    finally:
        db.close()


if __name__ == "__main__":
    run()
