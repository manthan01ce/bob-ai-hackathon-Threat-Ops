"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Zap,
  Users,
  Thermometer,
  Activity,
  Cpu,
  Wrench,
  Send,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  fetchLivePrediction,
  fetchAssetHistory,
  fetchCrews,
  dispatchCrew,
} from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────
interface AssetDetail {
  asset_id: string;
  name?: string;
  asset_type: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  capacity_mva?: number;
  voltage_kv?: number;
  customers_served?: number;
  critical_facilities?: number;
  status?: string;
  installation_date?: string;
}

interface PredictionResult {
  failure_probability?: number;
  health_score?: number;
  predicted_fault_mode?: string;
  risk_level?: string;
  risk_window?: string;
  recommended_action?: string;
  top_drivers?: Array<{ feature: string; value: number; weight: number }>;
  fault_probabilities?: Record<string, number>;
}

interface TelemetryPoint {
  timestamp: string;
  temperature?: number;
  oil_temperature?: number;
  load_percent?: number;
  vibration?: number;
  voltage?: number;
  power_factor?: number;
}

// ── Risk colour helper ─────────────────────────────────────────────────────────
const riskColor: Record<string, string> = {
  CRITICAL: "#e22718",
  HIGH:     "#f48c06",
  MEDIUM:   "#f4b400",
  LOW:      "#0fa336",
};

function priorityLabel(impactScore: number): string {
  if (impactScore >= 75) return "P1 CRITICAL";
  if (impactScore >= 55) return "P2 HIGH";
  if (impactScore >= 35) return "P3 MEDIUM";
  return "P4 LOW";
}
function priorityBg(impactScore: number): string {
  if (impactScore >= 75) return "#e22718";
  if (impactScore >= 55) return "#f48c06";
  if (impactScore >= 35) return "#f4b400";
  return "#0fa336";
}

// ── Metric card ────────────────────────────────────────────────────────────────
function MetricTile({
  label, value, sub, color,
}: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-[#ffffff] border border-[#edebe9] p-3 rounded-[12px] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)] flex flex-col gap-0.5">
      <div className="text-[9px] text-[#666] font-bold uppercase tracking-widest">{label}</div>
      <div className="text-lg font-black" style={{ color: color || "#1a1a1a" }}>{value}</div>
      {sub && <div className="text-[9px] text-black/58">{sub}</div>}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function TransformerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [asset,      setAsset]      = useState<AssetDetail | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [telemetry,  setTelemetry]  = useState<TelemetryPoint[]>([]);
  const [crews,      setCrews]      = useState<any[]>([]);

  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [dispatching,  setDispatching]  = useState(false);
  const [dispatchMsg,  setDispatchMsg]  = useState<string | null>(null);
  const [dispatchErr,  setDispatchErr]  = useState<string | null>(null);

  const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [assetRes, predRes, histRes, crewRes] = await Promise.allSettled([
        fetch(`${API}/assets/${id}`).then((r) => {
          if (!r.ok) throw new Error(`Asset not found (${r.status})`);
          return r.json();
        }),
        fetchLivePrediction(id),
        fetchAssetHistory(id),
        fetchCrews(),
      ]);

      if (assetRes.status === "fulfilled") setAsset(assetRes.value);
      else setError((assetRes.reason as Error).message || "Asset not found");

      if (predRes.status === "fulfilled") setPrediction(predRes.value);
      if (histRes.status === "fulfilled" && Array.isArray(histRes.value)) {
        setTelemetry(histRes.value);
      }
      if (crewRes.status === "fulfilled") setCrews(crewRes.value);
    } catch (e: any) {
      setError(e.message || "Failed to load asset data");
    } finally {
      setLoading(false);
    }
  }, [id, API]);

  useEffect(() => { load(); }, [load]);

  // ── Crew dispatch ──────────────────────────────────────────────────────────
  const handleDispatch = async (crewId: string) => {
    setDispatching(true);
    setDispatchErr(null);
    setDispatchMsg(null);
    try {
      const res = await dispatchCrew(crewId, id);
      if (res.success) {
        setDispatchMsg(res.message);
        // Refresh crew list so dispatched crew shows unavailable
        const fresh = await fetchCrews();
        setCrews(fresh);
      } else {
        setDispatchErr(res.message || "Dispatch failed");
      }
    } catch (e: any) {
      setDispatchErr(e.message || "Dispatch request failed. Check backend connection.");
    } finally {
      setDispatching(false);
    }
  };

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = telemetry.map((t) => ({
    time:    new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    temp:    t.temperature   != null ? Math.round(t.temperature)   : undefined,
    oilTemp: t.oil_temperature != null ? Math.round(t.oil_temperature) : undefined,
    load:    t.load_percent  != null ? Math.round(t.load_percent)  : undefined,
    vib:     t.vibration     != null ? Number(t.vibration.toFixed(1)) : undefined,
  }));

  // ── Customer-impact priority score ────────────────────────────────────────
  // Mirrors the backend formula: 60% intrinsic risk + 40% customer impact (normalised to 836-asset max)
  const failProb      = prediction?.failure_probability ?? 0;
  const intrinsicRisk = Math.round(failProb * 100);
  // Normalise customers to max realistic value in dataset (≈ 45 000)
  const customers     = asset?.customers_served ?? 0;
  const custNorm      = Math.min(100, Math.round((customers / 45000) * 100));
  const impactScore   = Math.round(0.6 * intrinsicRisk + 0.4 * custNorm);
  const healthScore   = prediction?.health_score ?? (100 - intrinsicRisk);

  // ── Assigned crew ──────────────────────────────────────────────────────────
  const assignedCrew    = crews.find((c) => !c.available && (c.dispatched_asset_id === id || c.assigned_asset_id === id));
  const availableCrews  = crews.filter((c) => c.available);

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f2f0eb] text-[#bbb] flex-col gap-3">
        <div className="w-8 h-8 border-2 border-[#00754A] border-t-transparent rounded-full animate-spin" />
        <div className="text-xs font-bold uppercase tracking-widest">Loading Asset {id}…</div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f2f0eb] text-black/87 flex-col gap-4">
        <XCircle size={40} className="text-[#e22718]" />
        <div className="text-sm font-bold uppercase">Asset Not Found</div>
        <div className="text-[11px] text-black/58">{error || `No asset with ID "${id}"`}</div>
        <button
          onClick={() => router.push("/")}
          className="mt-2 bg-[#00754A] text-white px-4 py-1.5 rounded-full transform active:scale-[0.95] transition-all duration-200 ease-out text-[10px] font-bold uppercase hover:bg-[#006241]"
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const riskLvl = (prediction?.risk_level || "MEDIUM").toUpperCase();
  const rColor  = riskColor[riskLvl] || riskColor.MEDIUM;

  return (
    <div className="min-h-screen bg-[#f2f0eb] text-black/87 text-[11px]">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-[#edebe9] bg-[#1E3932] px-6 py-3 rounded-full transform active:scale-[0.95] transition-all duration-200 ease-out flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-black/58 hover:text-black/87 transition-colors text-[10px] font-bold uppercase"
          >
            <ArrowLeft size={14} />
            Dashboard
          </button>
          <span className="text-[#333]">/</span>
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-[#00754A]" fill="currentColor" />
            <span className="font-black text-base uppercase tracking-tight">{asset.asset_id}</span>
            <span
              className="px-2 py-0.5 rounded-full transform active:scale-[0.95] transition-all duration-200 ease-out text-[9px] font-extrabold uppercase"
              style={{ background: rColor, color: "#fff" }}
            >
              {riskLvl}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="flex items-center gap-1 text-black/58 hover:text-black/87 text-[10px] font-bold uppercase"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
          <span className="text-[9px] text-[#444]">
            {asset.district} · Gujarat
          </span>
        </div>
      </header>

      {/* ── Dispatch feedback banner ─────────────────────────────────────────── */}
      {dispatchMsg && (
        <div className="bg-[#00754A] text-white px-6 py-2 rounded-full transform active:scale-[0.95] transition-all duration-200 ease-out flex justify-between items-center text-[10px] font-bold uppercase">
          <span className="flex items-center gap-2"><Send size={12} />{dispatchMsg}</span>
          <button onClick={() => setDispatchMsg(null)}><XCircle size={14} /></button>
        </div>
      )}
      {dispatchErr && (
        <div className="bg-[#e22718] text-black/87 px-6 py-2 rounded-full transform active:scale-[0.95] transition-all duration-200 ease-out flex justify-between items-center text-[10px] font-bold uppercase">
          <span className="flex items-center gap-2"><AlertTriangle size={12} />{dispatchErr}</span>
          <button onClick={() => setDispatchErr(null)}><XCircle size={14} /></button>
        </div>
      )}

      <div className="p-5 space-y-5 max-w-[1400px] mx-auto">

        {/* ── Row 1: Overview + Priority Breakdown ──────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">

          {/* Overview */}
          <div className="col-span-2 bg-[#ffffff] border border-[#edebe9] p-4 rounded-[12px] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight">{asset.asset_id}</h1>
                <p className="text-[10px] text-black/58 mt-0.5">
                  {asset.name || "Gujarat Power Asset"} &bull; {asset.asset_type?.toUpperCase()} &bull; {asset.district}
                </p>
              </div>
              <div className="text-right">
                <div
                  className="text-2xl font-black"
                  style={{ color: priorityBg(impactScore) }}
                >
                  {priorityLabel(impactScore)}
                </div>
                <div className="text-[9px] text-black/58 uppercase mt-0.5">Customer-Impact Priority</div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              <MetricTile
                label="Health Score"
                value={`${Math.round(healthScore)}/100`}
                sub="Equipment condition"
                color={healthScore >= 70 ? "#0fa336" : healthScore >= 40 ? "#f4b400" : "#e22718"}
              />
              <MetricTile
                label="Failure Prob."
                value={`${intrinsicRisk}%`}
                sub={`${prediction?.risk_window || "24h"} horizon`}
                color={rColor}
              />
              <MetricTile
                label="Fault Mode"
                value={prediction?.predicted_fault_mode?.split(" ")[0] || "—"}
                sub={prediction?.predicted_fault_mode}
              />
              <MetricTile
                label="Capacity"
                value={`${asset.capacity_mva || "—"} MVA`}
                sub={`${asset.voltage_kv || "—"} kV`}
              />
              <MetricTile
                label="Customers"
                value={(customers).toLocaleString()}
                sub={`${asset.critical_facilities || 0} critical`}
                color={customers > 10000 ? "#f48c06" : "#fff"}
              />
            </div>

            {prediction?.recommended_action && (
              <div className="mt-3 p-2.5 bg-[#ffffff] border-l-2 text-[10px]"
                   style={{ borderColor: rColor }}>
                <span className="font-bold text-black/87 uppercase">Recommended Action: </span>
                <span className="text-black/58">{prediction.recommended_action}</span>
              </div>
            )}
          </div>

          {/* Explainable Priority Breakdown */}
          <div className="bg-[#ffffff] border border-[#edebe9] p-4 rounded-[12px] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
            <h2 className="text-[10px] font-bold uppercase text-black/58 mb-3 tracking-widest">
              Why This Priority?
            </h2>
            <div className="space-y-2.5">
              {[
                {
                  label: "Failure Risk",
                  score: intrinsicRisk,
                  weight: "60%",
                  desc: `XGBoost model: ${intrinsicRisk}% failure probability`,
                  color: rColor,
                },
                {
                  label: "Customer Impact",
                  score: custNorm,
                  weight: "40%",
                  desc: `${customers.toLocaleString()} customers at risk`,
                  color: "#1c69d4",
                },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-[9px] font-bold uppercase mb-0.5">
                    <span className="text-[#bbb]">{item.label}</span>
                    <span className="text-[#666]">weight {item.weight}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-[#ffffff] overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{ width: `${Math.min(100, item.score)}%`, background: item.color }}
                      />
                    </div>
                    <span className="text-[9px] font-black w-8 text-right" style={{ color: item.color }}>
                      {item.score}
                    </span>
                  </div>
                  <div className="text-[8px] text-black/58 mt-0.5">{item.desc}</div>
                </div>
              ))}

              <div className="border-t border-[#222] pt-2.5 mt-1">
                <div className="flex justify-between text-[10px] font-black uppercase">
                  <span className="text-[#bbb]">Impact-Adjusted Score</span>
                  <span style={{ color: priorityBg(impactScore) }}>{impactScore}</span>
                </div>
                <div className="text-[8px] text-black/58 mt-0.5">0.6 × Failure Risk + 0.4 × Customer Impact</div>
              </div>

              {/* Top SHAP-like drivers */}
              {prediction?.top_drivers && prediction.top_drivers.length > 0 && (
                <div className="border-t border-[#222] pt-2.5 mt-1">
                  <div className="text-[9px] font-bold uppercase text-[#666] mb-1.5 tracking-widest">Top ML Drivers</div>
                  {prediction.top_drivers.map((d) => (
                    <div key={d.feature} className="flex justify-between text-[9px] py-0.5">
                      <span className="text-black/58 capitalize">{d.feature.replace(/_/g, " ")}</span>
                      <span className="text-[#bbb] font-mono">{d.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Row 2: Telemetry Chart ───────────────────────────────────────── */}
        <div className="bg-[#ffffff] border border-[#edebe9] p-4 rounded-[12px] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="text-sm font-bold uppercase">Telemetry Trend (24h)</h2>
              <p className="text-[9px] text-[#666]">Temperature, Oil Temp, Load % · Last {chartData.length} readings</p>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-[#0fa336] font-bold uppercase">
              <Activity size={11} /> SCADA Feed
            </div>
          </div>

          {chartData.length > 0 ? (
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="#555"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis stroke="#555" fontSize={9} tickLine={false} axisLine={false} domain={[0, 130]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #edebe9",
                      fontSize: 10,
                      borderRadius: 0,
                    }}
                    labelStyle={{ color: "rgba(0,0,0,0.58)", fontSize: 9 }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 9, paddingTop: 8 }}
                    formatter={(v) => <span style={{ color: "#aaa", textTransform: "uppercase", fontSize: 9 }}>{v}</span>}
                  />
                  <Line type="monotone" dataKey="temp"    name="Winding Temp (°C)"  stroke="#e22718" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="oilTemp" name="Oil Temp (°C)"       stroke="#f48c06" strokeWidth={1.5} dot={false} connectNulls strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="load"    name="Load (%)"            stroke="#1c69d4" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[120px] border border-[#edebe9] bg-[#edebe9]">
              <div className="text-center text-black/58">
                <Activity size={24} className="mx-auto mb-1 opacity-40" />
                <div className="text-[10px]">No telemetry data available for this asset</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Row 3: Risk Analysis + Crew Dispatch ───────────────────────── */}
        <div className="grid grid-cols-2 gap-4">

          {/* Risk Analysis */}
          <div className="bg-[#ffffff] border border-[#edebe9] p-4 rounded-[12px] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
            <h2 className="text-sm font-bold uppercase mb-3">Risk Analysis</h2>
            {prediction?.fault_probabilities ? (
              <div className="space-y-2">
                {Object.entries(prediction.fault_probabilities)
                  .sort(([, a], [, b]) => b - a)
                  .map(([mode, prob]) => {
                    const pct = Math.round(prob * 100);
                    const isTop = pct === Math.max(...Object.values(prediction.fault_probabilities!).map((v) => Math.round(v * 100)));
                    return (
                      <div key={mode}>
                        <div className="flex justify-between text-[9px] font-bold uppercase mb-0.5">
                          <span className={isTop ? "text-black/87" : "text-[#666]"}>{mode}</span>
                          <span className={isTop ? "text-[#e22718]" : "text-black/58"}>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-[#ffffff] overflow-hidden">
                          <div
                            className="h-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              background: isTop ? rColor : "#333",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-black/58 text-[10px]">No fault probability breakdown available.</div>
            )}

            {/* Location details */}
            <div className="mt-4 pt-3 border-t border-[#edebe9] grid grid-cols-2 gap-2 text-[9px]">
              <div className="text-[#666]">Installation</div>
              <div className="text-[#bbb] text-right">
                {asset.installation_date
                  ? new Date(asset.installation_date).getFullYear()
                  : "—"}
              </div>
              <div className="text-[#666]">Status</div>
              <div className="text-right">
                <span className={`px-1.5 py-0.5 rounded-full transform active:scale-[0.95] transition-all duration-200 ease-out text-[8px] font-bold uppercase ${
                  asset.status === "active" ? "bg-[#0fa336]" : "bg-[#e22718]"
                } text-black/87`}>
                  {asset.status || "active"}
                </span>
              </div>
              <div className="text-[#666]">Coordinates</div>
              <div className="text-[#bbb] text-right font-mono">
                {asset.latitude?.toFixed(3)}, {asset.longitude?.toFixed(3)}
              </div>
            </div>
          </div>

          {/* Crew Dispatch */}
          <div className="bg-[#ffffff] border border-[#edebe9] p-4 rounded-[12px] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
            <h2 className="text-sm font-bold uppercase mb-3 flex items-center gap-2">
              <Users size={14} className="text-[#00754A]" />
              Field Crew Assignment
            </h2>

            {/* Show a dispatched crew badge if one is not available (simplified) */}
            {assignedCrew ? (
              <div className="p-3 bg-[#edebe9] border border-[#00754A]/40 mb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-black/87 text-[11px]">{assignedCrew.name}</div>
                    <div className="text-[9px] text-black/58">{assignedCrew.crew_id} · {assignedCrew.zone}</div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full transform active:scale-[0.95] transition-all duration-200 ease-out text-[8px] font-bold uppercase bg-[#e22718] text-black/87">
                    Dispatched
                  </span>
                </div>
                <div className="mt-1.5 text-[9px] text-[#666]">
                  Skill: {assignedCrew.skill_level?.replace(/_/g, " ")}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-[#edebe9] border border-[#edebe9] mb-3 text-[10px] text-black/58">
                No crew currently assigned to this asset.
              </div>
            )}

            <div className="text-[9px] font-bold uppercase text-[#666] mb-2 tracking-widest">
              Available Crews ({availableCrews.length})
            </div>

            {availableCrews.length === 0 ? (
              <div className="text-[10px] text-black/58 py-3 text-center">
                All crews currently deployed.
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {availableCrews.map((crew) => (
                  <div
                    key={crew.crew_id}
                    className="flex items-center justify-between bg-[#ffffff] border border-[#edebe9] p-2"
                  >
                    <div>
                      <div className="font-bold text-black/87 text-[10px]">{crew.name}</div>
                      <div className="text-[8px] text-[#777]">
                        {crew.crew_id} · {crew.zone} · {crew.skill_level?.replace(/_/g, " ")}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDispatch(crew.crew_id)}
                      disabled={dispatching}
                      className="bg-[#00754A] hover:bg-[#006241] disabled:opacity-50 text-black/87 text-[8px] font-bold uppercase px-2.5 py-1.5 rounded-full transform active:scale-[0.95] transition-all duration-200 ease-out transition-colors"
                    >
                      {dispatching ? "…" : "Dispatch"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
