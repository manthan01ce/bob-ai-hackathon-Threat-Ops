"""
PowerGrid AI - ML Inference Service
Loads trained XGBoost models to provide real-time failure predictions,
health scores, fault classification, and feature contribution drivers.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional

ML_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml")
ARTIFACTS_DIR = os.path.join(ML_DIR, "artifacts")

REG_PATH = os.path.join(ARTIFACTS_DIR, "failure_regressor.joblib")
CLF_PATH = os.path.join(ARTIFACTS_DIR, "fault_classifier.joblib")
META_PATH = os.path.join(ARTIFACTS_DIR, "model_metadata.json")

_regressor = None
_classifier = None
_metadata = None


def load_models():
    global _regressor, _classifier, _metadata
    if _regressor is None and os.path.exists(REG_PATH):
        _regressor = joblib.load(REG_PATH)
    if _classifier is None and os.path.exists(CLF_PATH):
        _classifier = joblib.load(CLF_PATH)
    if _metadata is None and os.path.exists(META_PATH):
        with open(META_PATH, "r") as f:
            _metadata = json.load(f)


def get_model_info() -> Dict[str, Any]:
    load_models()
    if _metadata:
        return _metadata
    return {"status": "models_not_trained"}


def predict_failure(telemetry: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run XGBoost inference on incoming telemetry.
    Accepts raw or partial sensor readings + DGA data.
    """
    load_models()
    if _regressor is None or _classifier is None:
        raise RuntimeError("ML models not trained or loaded.")

    features_list = _metadata.get("features", [])
    fault_classes = _metadata.get("fault_classes", [])

    # Default fallback values for missing fields
    h2 = float(telemetry.get("hydrogen", 25.0) or 25.0)
    ch4 = float(telemetry.get("methane", 35.0) or 35.0)
    co = float(telemetry.get("co", 280.0) or 280.0)
    co2 = float(telemetry.get("co2", 2200.0) or 2200.0)
    c2h4 = float(telemetry.get("ethylene", 20.0) or 20.0)
    c2h6 = float(telemetry.get("ethane", 15.0) or 15.0)
    c2h2 = float(telemetry.get("acetylene", 1.5) or 1.5)
    pf = float(telemetry.get("power_factor", 0.5) or 0.5)
    d_rigidity = float(telemetry.get("dielectric_rigidity", 55.0) or 55.0)
    water = float(telemetry.get("water_content", 20.0) or 20.0)

    temp = float(telemetry.get("temperature", 55.0) or 55.0)
    oil_temp = float(telemetry.get("oil_temperature", temp - 5.0) or temp - 5.0)
    vibration = float(telemetry.get("vibration", 2.0) or 2.0)
    load_pct = float(telemetry.get("load_percent", 65.0) or 65.0)
    voltage = float(telemetry.get("voltage", 33.0) or 33.0)
    current = float(telemetry.get("current", 350.0) or 350.0)

    # Derived domain features
    ch4_h2 = ch4 / max(h2, 0.1)
    c2h4_c2h6 = c2h4 / max(c2h6, 0.1)
    c2h2_c2h4 = c2h2 / max(c2h4, 0.1)
    thermal_stress = max(0.0, (oil_temp - 45.0) / 45.0)

    input_data = {
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
    }

    df_in = pd.DataFrame([input_data])[features_list]

    # Model 1: Failure probability
    prob = float(_regressor.predict(df_in)[0])
    prob = max(0.01, min(0.99, round(prob, 4)))

    # Compute health score from predicted failure probability
    health_score = round(max(5.0, min(100.0, (1.0 - prob) * 100.0)), 1)

    # Model 2: Fault classification
    fault_idx = int(_classifier.predict(df_in)[0])
    fault_probs = _classifier.predict_proba(df_in)[0]
    predicted_fault_mode = fault_classes[fault_idx] if fault_idx < len(fault_classes) else "Unknown"

    # Risk Window based on probability
    if prob >= 0.80:
        risk_window = "6h"
        risk_level = "CRITICAL"
    elif prob >= 0.60:
        risk_window = "24h"
        risk_level = "HIGH"
    elif prob >= 0.35:
        risk_window = "48h"
        risk_level = "MEDIUM"
    else:
        risk_window = "7d"
        risk_level = "LOW"

    # Top drivers calculation
    feat_imps = _metadata.get("feature_importances", {})
    drivers = []
    for feat, imp in list(feat_imps.items())[:4]:
        drivers.append({
            "feature": feat,
            "value": round(float(input_data.get(feat, 0.0)), 2),
            "weight": round(float(imp), 3)
        })

    # Action recommendation
    if risk_level == "CRITICAL":
        recommended_action = f"Emergency: Immediate crew dispatch for {predicted_fault_mode}. Switch load to redundant feeder."
    elif risk_level == "HIGH":
        recommended_action = f"Warning: Schedule diagnostic inspection within {risk_window}. Monitor oil temperature."
    elif risk_level == "MEDIUM":
        recommended_action = f"Advisory: Inspect transformer at next maintenance cycle ({risk_window})."
    else:
        recommended_action = "Normal: Equipment operating within safe parameters."

    return {
        "model_version": _metadata.get("model_version", "v1.0.0-xgb"),
        "failure_probability": prob,
        "health_score": health_score,
        "predicted_fault_mode": predicted_fault_mode,
        "fault_probabilities": {fault_classes[i]: round(float(p), 4) for i, p in enumerate(fault_probs)},
        "risk_level": risk_level,
        "risk_window": risk_window,
        "top_drivers": drivers,
        "recommended_action": recommended_action,
    }
