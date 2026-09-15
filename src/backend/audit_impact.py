"""Audit script: Reproduce the exact Impact-Adjusted Risk calculation from dashboard.py"""
import sys
sys.path.insert(0, ".")
from app.db.database import SessionLocal
from app.models.models import Asset, RiskScore, Prediction
from sqlalchemy import func

db = SessionLocal()
limit = 10

# Step 1: Same query as dashboard.py
subq_risk = (
    db.query(RiskScore.asset_id, func.max(RiskScore.id).label("latest_risk_id"))
    .group_by(RiskScore.asset_id)
    .subquery()
)
subq_pred = (
    db.query(Prediction.asset_id, func.max(Prediction.id).label("latest_pred_id"))
    .group_by(Prediction.asset_id)
    .subquery()
)
results = (
    db.query(Asset, RiskScore, Prediction)
    .join(RiskScore, Asset.id == RiskScore.asset_id)
    .join(subq_risk, RiskScore.id == subq_risk.c.latest_risk_id)
    .outerjoin(subq_pred, Asset.id == subq_pred.c.asset_id)
    .outerjoin(Prediction, Prediction.id == subq_pred.c.latest_pred_id)
    .order_by(RiskScore.overall_risk_score.desc())
    .limit(limit * 5)
    .all()
)

# Step 2: Deduplicate
seen = set()
deduped = []
for a, r, p in results:
    if a.asset_id not in seen:
        seen.add(a.asset_id)
        deduped.append((a, r, p))

print(f"Pool size after dedup: {len(deduped)} assets")

# Step 3: Find max_customers (the normalization denominator)
max_customers = max((a.customers_served or 0 for a, r, p in deduped), default=1) or 1
print(f"max_customers (normalization denominator): {max_customers:,}")
print()

# Step 4: Compute and display for each asset
print("=" * 120)
print(f"{'#':<4} {'Asset ID':<12} {'Risk Score':>12} {'Customers':>12} {'Pop Norm':>12} {'0.6*Risk':>12} {'0.4*PopN':>12} {'Impact':>12}")
print("=" * 120)

scored = []
for a, r, p in deduped:
    risk_score = r.overall_risk_score or 0
    customers = a.customers_served or 0
    population_normalized = (customers / max_customers) * 100
    component_risk = 0.6 * risk_score
    component_pop = 0.4 * population_normalized
    impact_adjusted_risk = round(component_risk + component_pop, 1)
    scored.append((a, r, p, impact_adjusted_risk, risk_score, customers, population_normalized, component_risk, component_pop))

scored.sort(key=lambda x: x[3], reverse=True)

for idx, (a, r, p, impact, risk, cust, pop_norm, c_risk, c_pop) in enumerate(scored[:15]):
    print(f"{idx+1:<4} {a.asset_id:<12} {risk:>12.2f} {cust:>12,} {pop_norm:>12.2f} {c_risk:>12.2f} {c_pop:>12.2f} {impact:>12.1f}")

print()
print("--- Detailed breakdown for the 4 assets in question ---")
targets = ["SS-2227", "SS-2213", "SS-2216", "SS-2209"]
for t in targets:
    match = [x for x in scored if x[0].asset_id == t]
    if match:
        a, r, p, impact, risk, cust, pop_norm, c_risk, c_pop = match[0]
        rank = [i+1 for i, x in enumerate(scored) if x[0].asset_id == t][0]
        print(f"\n  {a.asset_id} (Rank #{rank}):")
        print(f"    Risk Score         = {risk:.2f}")
        print(f"    Customers Served   = {cust:,}")
        print(f"    Population Norm    = ({cust} / {max_customers}) * 100 = {pop_norm:.4f}")
        print(f"    0.6 * Risk         = 0.6 * {risk:.2f} = {c_risk:.4f}")
        print(f"    0.4 * Pop Norm     = 0.4 * {pop_norm:.4f} = {c_pop:.4f}")
        print(f"    Impact-Adj Risk    = {c_risk:.4f} + {c_pop:.4f} = {c_risk + c_pop:.4f} → rounded = {impact}")

db.close()
