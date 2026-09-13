"""
PowerGrid AI - Model Training Pipeline
Trains XGBoost models for:
  1. Failure Probability & Health Score (Regression)
  2. Failure Mode / Fault Classification (Multi-class Classification)
Uses transformer DGA oil analysis and operational sensor telemetry.
"""

import os
import sys
import zipfile
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score, accuracy_score, classification_report
import xgboost as xgb

ML_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(ML_DIR, "artifacts")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

DGA_ZIP = r"C:\Users\Manthan\Downloads\faulty dataset with prediction.zip"
FAULT_ZIP = r"C:\Users\Manthan\Downloads\faulty data-set.zip"

FEATURE_NAMES = [
    "hydrogen", "methane", "co", "co2", "ethylene", "ethane", "acetylene",
    "power_factor", "dielectric_rigidity", "water_content",
    "temperature", "oil_temperature", "vibration", "load_percent",
    "voltage", "current",
    "methane_hydrogen_ratio", "ethylene_ethane_ratio", "acetylene_ethylene_ratio",
    "thermal_stress_index"
]

FAULT_CLASSES = [
    "Normal / Low Risk",
    "Insulation Degradation",
    "Thermal Overheating",
    "Dielectric Breakdown",
    "Mechanical / Vibration Stress",
    "Arcing / Partial Discharge"
]


def load_and_prepare_dataset():
    print("Loading datasets for feature engineering...")
    
    # 1. Load DGA data
    dga_df = None
    if os.path.exists(DGA_ZIP):
        with zipfile.ZipFile(DGA_ZIP, "r") as z:
            with z.open("Health index1.csv") as f:
                dga_df = pd.read_csv(f)
        print(f"Loaded Health index1.csv with {len(dga_df)} rows")
    else:
        print("Warning: DGA ZIP not found, generating representative synthetic telemetry...")
        dga_df = pd.DataFrame()

    records = []
    n_samples = max(len(dga_df) if dga_df is not None and not dga_df.empty else 0, 800)

    for i in range(n_samples):
        if dga_df is not None and i < len(dga_df):
            row = dga_df.iloc[i]
            h2 = float(row.get("Hydrogen", np.random.uniform(5, 120)))
            ch4 = float(row.get("Methane", np.random.uniform(5, 100)))
            co = float(row.get("CO", np.random.uniform(100, 600)))
            co2 = float(row.get("CO2", np.random.uniform(1000, 5000)))
            c2h4 = float(row.get("Ethylene", np.random.uniform(2, 150)))
            c2h6 = float(row.get("Ethane", np.random.uniform(2, 90)))
            c2h2 = float(row.get("Acethylene", np.random.uniform(0.1, 40)))
            pf = float(row.get("Power factor", np.random.uniform(0.1, 2.5)))
            d_rigidity = float(row.get("Dielectric rigidity", np.random.uniform(30, 75)))
            water = float(row.get("Water content", np.random.uniform(5, 45)))
            health_idx = float(row.get("Health index", np.random.uniform(20, 95)))
        else:
            h2 = np.random.uniform(5, 250)
            ch4 = np.random.uniform(5, 200)
            co = np.random.uniform(80, 800)
            co2 = np.random.uniform(800, 6000)
            c2h4 = np.random.uniform(1, 180)
            c2h6 = np.random.uniform(1, 120)
            c2h2 = np.random.uniform(0.1, 50)
            pf = np.random.uniform(0.05, 3.0)
            d_rigidity = np.random.uniform(25, 80)
            water = np.random.uniform(5, 50)
            health_idx = np.random.uniform(15, 95)

        # Operational telemetry features
        temp = np.random.uniform(35.0, 98.0)
        oil_temp = temp - np.random.uniform(3.0, 10.0)
        vibration = np.random.uniform(0.5, 7.5)
        load_pct = np.random.uniform(40.0, 115.0)
        voltage = np.random.choice([11.0, 33.0, 66.0, 132.0, 220.0])
        current = (load_pct / 100.0) * np.random.uniform(200.0, 600.0)

        # Domain Feature Engineering (IEC 60599 / Rogers Ratios)
        ch4_h2 = ch4 / max(h2, 0.1)
        c2h4_c2h6 = c2h4 / max(c2h6, 0.1)
        c2h2_c2h4 = c2h2 / max(c2h4, 0.1)
        thermal_stress = max(0.0, (oil_temp - 45.0) / 45.0)

        # Compute Ground Truth Failure Probability based on physics & Health Index
        gas_risk = min(1.0, (h2 / 180.0) * 0.25 + (c2h4 / 120.0) * 0.35 + (c2h2 / 30.0) * 0.4)
        thermal_risk = min(1.0, thermal_stress * 0.6 + (load_pct / 100.0 > 1.0) * 0.4)
        aging_risk = max(0.0, min(1.0, (100.0 - health_idx) / 100.0))

        failure_prob = round(float(0.40 * aging_risk + 0.35 * gas_risk + 0.25 * thermal_risk), 4)
        failure_prob = max(0.01, min(0.99, failure_prob))

        # Determine Failure Mode Label
        if failure_prob < 0.25:
            fault_mode = 0  # Normal / Low Risk
        elif c2h2 > 15.0 or (c2h2_c2h4 > 1.0 and failure_prob > 0.6):
            fault_mode = 5  # Arcing / Partial Discharge
        elif c2h4_c2h6 > 3.0 or thermal_stress > 0.75:
            fault_mode = 2  # Thermal Overheating
        elif d_rigidity < 35.0 or water > 35.0:
            fault_mode = 3  # Dielectric Breakdown
        elif vibration > 5.0:
            fault_mode = 4  # Mechanical / Vibration Stress
        else:
            fault_mode = 1  # Insulation Degradation

        records.append({
            "hydrogen": h2,
            "methane": ch4,
            "co": co,
            "co2": co2,
            "ethylene": c2h4,
            "ethane": c2h6,
            "acetylene": c2h2,
            "power_factor": pf,
            "dielectric_rigidity": d_rigidity,
            "water_content": water,
            "temperature": temp,
            "oil_temperature": oil_temp,
            "vibration": vibration,
            "load_percent": load_pct,
            "voltage": voltage,
            "current": current,
            "methane_hydrogen_ratio": ch4_h2,
            "ethylene_ethane_ratio": c2h4_c2h6,
            "acetylene_ethylene_ratio": c2h2_c2h4,
            "thermal_stress_index": thermal_stress,
            "health_index": health_idx,
            "failure_probability": failure_prob,
            "fault_mode": fault_mode,
        })

    df = pd.DataFrame(records)
    print(f"Created feature dataset with {len(df)} samples across {len(FEATURE_NAMES)} features.")
    return df


def train():
    df = load_and_prepare_dataset()
    X = df[FEATURE_NAMES]
    y_prob = df["failure_probability"]
    y_fault = df["fault_mode"]

    X_train, X_test, y_prob_train, y_prob_test, y_fault_train, y_fault_test = train_test_split(
        X, y_prob, y_fault, test_size=0.20, random_state=42
    )

    # 1. Train Failure Probability Regressor
    print("\n--- Training XGBoost Failure Probability Regressor ---")
    regressor = xgb.XGBRegressor(
        n_estimators=150,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        objective="reg:squarederror"
    )
    regressor.fit(X_train, y_prob_train)
    prob_preds = regressor.predict(X_test)
    mse = mean_squared_error(y_prob_test, prob_preds)
    r2 = r2_score(y_prob_test, prob_preds)
    print(f"Regressor Evaluation: RMSE = {np.sqrt(mse):.4f}, R² Score = {r2:.4f}")

    # 2. Train Fault Mode Classifier
    print("\n--- Training XGBoost Fault Mode Classifier ---")
    classifier = xgb.XGBClassifier(
        n_estimators=120,
        max_depth=4,
        learning_rate=0.08,
        random_state=42,
        objective="multi:softprob",
        num_class=len(FAULT_CLASSES)
    )
    classifier.fit(X_train, y_fault_train)
    fault_preds = classifier.predict(X_test)
    acc = accuracy_score(y_fault_test, fault_preds)
    print(f"Classifier Accuracy = {acc * 100:.2f}%")

    # Feature Importances
    importances = dict(zip(FEATURE_NAMES, regressor.feature_importances_.astype(float)))
    sorted_importances = sorted(importances.items(), key=lambda x: x[1], reverse=True)
    print("\nTop 5 Failure Risk Drivers (Feature Importance):")
    for feat, imp in sorted_importances[:5]:
        print(f"  - {feat}: {imp * 100:.2f}%")

    # Save artifacts
    reg_path = os.path.join(ARTIFACTS_DIR, "failure_regressor.joblib")
    clf_path = os.path.join(ARTIFACTS_DIR, "fault_classifier.joblib")
    meta_path = os.path.join(ARTIFACTS_DIR, "model_metadata.json")

    joblib.dump(regressor, reg_path)
    joblib.dump(classifier, clf_path)

    metadata = {
        "model_version": "v1.0.0-xgb",
        "algorithm": "XGBoost (Regressor + Multi-class Classifier)",
        "features": FEATURE_NAMES,
        "fault_classes": FAULT_CLASSES,
        "metrics": {
            "rmse": float(np.sqrt(mse)),
            "r2_score": float(r2),
            "accuracy": float(acc),
        },
        "feature_importances": dict(sorted_importances),
        "trained_samples": len(df)
    }

    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nSaved models and metadata to: {ARTIFACTS_DIR}")
    print("Phase 5 Model Training COMPLETE!")


if __name__ == "__main__":
    train()
