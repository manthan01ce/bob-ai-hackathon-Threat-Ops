const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

export async function fetchSummary() {
  const res = await fetch(`${API_BASE}/dashboard/summary`);
  if (!res.ok) throw new Error("Failed to fetch summary");
  return res.json();
}

export async function fetchRiskMap() {
  const res = await fetch(`${API_BASE}/dashboard/risk-map`);
  if (!res.ok) throw new Error("Failed to fetch risk map");
  return res.json();
}

export async function fetchRecentAlerts() {
  const res = await fetch(`${API_BASE}/dashboard/recent-alerts`);
  if (!res.ok) throw new Error("Failed to fetch recent alerts");
  return res.json();
}

export async function fetchTopRiskAssets() {
  const res = await fetch(`${API_BASE}/dashboard/top-risk`);
  if (!res.ok) throw new Error("Failed to fetch top risk assets");
  return res.json();
}

export async function fetchRecommendations() {
  const res = await fetch(`${API_BASE}/dashboard/recommendations`);
  if (!res.ok) throw new Error("Failed to fetch recommendations");
  return res.json();
}

export async function fetchWeatherRisk() {
  const res = await fetch(`${API_BASE}/weather/risk`);
  if (!res.ok) throw new Error("Failed to fetch weather risk");
  return res.json();
}

export async function fetchAssetHistory(assetId: string) {
  const res = await fetch(`${API_BASE}/sensors/${assetId}/history?hours=24`);
  if (!res.ok) throw new Error("Failed to fetch asset history");
  return res.json();
}

export async function fetchLivePrediction(assetId: string) {
  const res = await fetch(`${API_BASE}/predictions/live/${assetId}`);
  if (!res.ok) throw new Error("Failed to fetch live prediction");
  return res.json();
}

export async function fetchModelInfo() {
  const res = await fetch(`${API_BASE}/predictions/model-info`);
  if (!res.ok) throw new Error("Failed to fetch model info");
  return res.json();
}

export async function fetchAssets(limit: number = 100) {
  const res = await fetch(`${API_BASE}/assets/?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch assets");
  return res.json();
}

export async function fetchIncidents(limit: number = 50) {
  const res = await fetch(`${API_BASE}/incidents/?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch incidents");
  return res.json();
}

export async function fetchCrews() {
  const res = await fetch(`${API_BASE}/crews/`);
  if (!res.ok) throw new Error("Failed to fetch crews");
  return res.json();
}

export async function runCustomPrediction(payload: Record<string, any>) {
  const res = await fetch(`${API_BASE}/predictions/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to run prediction");
  return res.json();
}

export async function fetchMaintenance() {
  const res = await fetch(`${API_BASE}/maintenance/`);
  if (!res.ok) throw new Error("Failed to fetch maintenance");
  return res.json();
}

export async function createWorkOrder(payload: { asset_id: string; maintenance_type: string; technician: string; notes?: string }) {
  const res = await fetch(`${API_BASE}/maintenance/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create work order");
  return res.json();
}

export async function dispatchCrew(crewId: string, assetId?: string) {
  const url = assetId ? `${API_BASE}/crews/${crewId}/dispatch?asset_id=${assetId}` : `${API_BASE}/crews/${crewId}/dispatch`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error("Failed to dispatch crew");
  return res.json();
}

export async function resetCrew(crewId: string) {
  const res = await fetch(`${API_BASE}/crews/${crewId}/reset`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to reset crew");
  return res.json();
}

export async function fetchSensorStream(limit: number = 50) {
  const res = await fetch(`${API_BASE}/sensors/stream?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch sensor stream");
  return res.json();
}




export async function fetchLiveWeather() {
  const res = await fetch(`${(process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api")}/weather/live`);
  if (!res.ok) throw new Error("Failed to fetch live weather");
  return res.json();
}

export async function fetchCrewPositioning() {
  const res = await fetch(`${(process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api")}/weather/crew-positioning`);
  if (!res.ok) throw new Error("Failed to fetch crew positioning");
  return res.json();
}

export async function fetchDistrictWeatherHistory(district: string) {
  const res = await fetch(`${(process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api")}/weather/district/${district}/history`);
  if (!res.ok) throw new Error("Failed to fetch district weather history");
  return res.json();
}

export async function fetchDistrictWeatherForecast(district: string) {
  const res = await fetch(`${(process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api")}/weather/district/${district}/forecast`);
  if (!res.ok) throw new Error("Failed to fetch district weather forecast");
  return res.json();
}
