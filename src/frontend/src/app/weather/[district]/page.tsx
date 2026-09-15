"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CloudRain,
  Wind,
  Thermometer,
  ArrowLeft,
  Calendar,
  AlertTriangle,
  Zap,
  Activity,
  CheckCircle,
  RefreshCw,
  Clock,
  ChevronRight,
  Droplets,
  Sun,
  CloudLightning,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  fetchDistrictWeatherHistory,
  fetchDistrictWeatherForecast,
  fetchAssets,
} from "@/lib/api";

export default function DistrictWeatherDetailPage() {
  const { district: rawDistrict } = useParams<{ district: string }>();
  const router = useRouter();

  const district = rawDistrict ? decodeURIComponent(rawDistrict) : "Ahmedabad";

  const [history, setHistory] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any[]>([]);
  const [districtAssets, setDistrictAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [histRes, foreRes, assetsRes] = await Promise.allSettled([
        fetchDistrictWeatherHistory(district),
        fetchDistrictWeatherForecast(district),
        fetchAssets(200),
      ]);

      if (histRes.status === "fulfilled") setHistory(histRes.value);
      if (foreRes.status === "fulfilled") setForecast(foreRes.value);

      if (assetsRes.status === "fulfilled" && Array.isArray(assetsRes.value)) {
        const filtered = assetsRes.value.filter(
          (a: any) =>
            a.district?.toLowerCase() === district.toLowerCase() ||
            a.location_name?.toLowerCase().includes(district.toLowerCase()) ||
            a.name?.toLowerCase().includes(district.toLowerCase())
        );
        setDistrictAssets(filtered);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load weather data");
    } finally {
      setLoading(false);
    }
  }, [district]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#f2f0eb] text-black/58 gap-3">
        <div className="w-8 h-8 border-2 border-[#00754A] border-t-transparent rounded-full animate-spin" />
        <div className="font-bold text-xs tracking-widest uppercase">
          Fetching 30-Day Weather & Forecast for {district} District...
        </div>
      </div>
    );
  }

  const latestDay = history[history.length - 1] || {
    avg_temp: 31,
    wind_speed: 28,
    rainfall: 18,
    humidity: 72,
    weather_risk: "MEDIUM",
  };

  const totalRainfall = history.reduce((acc, h) => acc + (h.rainfall || 0), 0);
  const maxWind = Math.max(...history.map((h) => h.wind_speed || 0), 0);
  const heatwaveDays = history.filter((h) => (h.temp_max || h.avg_temp || 0) >= 36).length;
  const avgHumidity = Math.round(
    history.reduce((acc, h) => acc + (h.humidity || 65), 0) / (history.length || 1)
  );

  return (
    <div className="min-h-screen bg-[#f2f0eb] text-black/87 text-[11px] pb-10">
      {/* HEADER */}
      <header className="border-b border-[#edebe9] bg-[#1E3932] text-white px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </button>
          <span className="text-white/40">/</span>
          <div className="flex items-center gap-2">
            <CloudRain size={18} className="text-[#0fa336]" />
            <h1 className="font-black text-lg uppercase tracking-tight text-white">
              {district} District Weather Threat Radar
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                latestDay.weather_risk === "HIGH"
                  ? "bg-[#e22718] text-white"
                  : latestDay.weather_risk === "MEDIUM"
                  ? "bg-[#f48c06] text-white"
                  : "bg-[#0fa336] text-white"
              }`}
            >
              {latestDay.weather_risk} RISK
            </span>
          </div>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all"
        >
          <RefreshCw size={12} />
          Refresh Radar Data
        </button>
      </header>

      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        {/* CURRENT CONDITIONS BANNER */}
        <div className="bg-white border border-[#edebe9] p-5 rounded-[16px] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
          <div className="flex justify-between items-center mb-3 border-b border-[#edebe9] pb-3">
            <div>
              <span className="text-[10px] text-black/58 uppercase font-bold tracking-widest">
                Current Operational Telemetry &bull; Gujarat Energy Transmission Corp
              </span>
              <h2 className="text-xl font-black text-black/87 uppercase mt-0.5">{district} Region Overview</h2>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-[#00754A] uppercase">Active Grid Assets:</span>
              <div className="text-xl font-black text-black/87">{districtAssets.length} Stations</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#f8f9fa] border border-[#edebe9] p-3.5 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1c69d4]/10 text-[#1c69d4] flex items-center justify-center">
                <CloudRain size={20} />
              </div>
              <div>
                <div className="text-[9px] text-black/58 uppercase font-bold">Recorded Rainfall</div>
                <div className="text-lg font-black text-black/87">{latestDay.rainfall} mm</div>
                <div className="text-[8px] text-black/50">24h Cumulative Surface Runoff</div>
              </div>
            </div>

            <div className="bg-[#f8f9fa] border border-[#edebe9] p-3.5 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#f48c06]/10 text-[#f48c06] flex items-center justify-center">
                <Wind size={20} />
              </div>
              <div>
                <div className="text-[9px] text-black/58 uppercase font-bold">Max Wind Velocity</div>
                <div className="text-lg font-black text-black/87">{latestDay.wind_speed} km/h</div>
                <div className="text-[8px] text-black/50">Transmission Line Sway Risk</div>
              </div>
            </div>

            <div className="bg-[#f8f9fa] border border-[#edebe9] p-3.5 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#e22718]/10 text-[#e22718] flex items-center justify-center">
                <Thermometer size={20} />
              </div>
              <div>
                <div className="text-[9px] text-black/58 uppercase font-bold">Ambient Temperature</div>
                <div className="text-lg font-black text-black/87">{latestDay.avg_temp}°C</div>
                <div className="text-[8px] text-black/50">Transformer Thermal Stress</div>
              </div>
            </div>

            <div className="bg-[#f8f9fa] border border-[#edebe9] p-3.5 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0fa336]/10 text-[#0fa336] flex items-center justify-center">
                <Droplets size={20} />
              </div>
              <div>
                <div className="text-[9px] text-black/58 uppercase font-bold">Relative Humidity</div>
                <div className="text-lg font-black text-black/87">{latestDay.humidity}%</div>
                <div className="text-[8px] text-black/50">Dielectric Moisture Level</div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 1: PAST MONTH WEATHER DETAILS (30-DAY HISTORY) */}
        <div className="bg-white border border-[#edebe9] p-5 rounded-[16px] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)] space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-black uppercase text-black/87 flex items-center gap-2">
                <Calendar size={18} className="text-[#00754A]" />
                Past Month Weather History (30-Day Details)
              </h2>
              <p className="text-[10px] text-black/58">Historical temperature, wind gusts, and precipitation log</p>
            </div>
          </div>

          {/* 30-DAY SUMMARY METRICS */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-[#ffffff] border border-[#edebe9] p-3 rounded-xl">
              <div className="text-[9px] text-black/58 uppercase font-bold">Total Monthly Rainfall</div>
              <div className="text-base font-black text-[#1c69d4]">{Math.round(totalRainfall)} mm</div>
            </div>
            <div className="bg-[#ffffff] border border-[#edebe9] p-3 rounded-xl">
              <div className="text-[9px] text-black/58 uppercase font-bold">Peak Wind Gust Recorded</div>
              <div className="text-base font-black text-[#f48c06]">{maxWind} km/h</div>
            </div>
            <div className="bg-[#ffffff] border border-[#edebe9] p-3 rounded-xl">
              <div className="text-[9px] text-black/58 uppercase font-bold">Heatwave Days (&gt;35°C)</div>
              <div className="text-base font-black text-[#e22718]">{heatwaveDays} Days</div>
            </div>
            <div className="bg-[#ffffff] border border-[#edebe9] p-3 rounded-xl">
              <div className="text-[9px] text-black/58 uppercase font-bold">Average Monthly Humidity</div>
              <div className="text-base font-black text-[#00754A]">{avgHumidity}%</div>
            </div>
          </div>

          {/* 30-DAY TREND CHART */}
          <div style={{ width: "100%", height: 240 }} className="pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#edebe9" vertical={false} />
                <XAxis dataKey="day_label" stroke="#777" fontSize={9} interval={2} />
                <YAxis stroke="#777" fontSize={9} domain={[0, 60]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #edebe9", fontSize: 10 }}
                />
                <Legend wrapperStyle={{ fontSize: 9, paddingTop: 6 }} />
                <Line type="monotone" dataKey="temp_max" name="Max Temp (°C)" stroke="#e22718" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="wind_speed" name="Wind Speed (km/h)" stroke="#f48c06" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="rainfall" name="Rainfall (mm)" stroke="#1c69d4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 30-DAY HISTORY TABLE */}
          <div className="overflow-x-auto border border-[#edebe9] rounded-lg max-h-60 overflow-y-auto">
            <table className="w-full text-[10px]">
              <thead className="bg-[#f8f9fa] border-b border-[#edebe9] text-left uppercase text-black/58 sticky top-0">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5 text-right">Max Temp (°C)</th>
                  <th className="p-2.5 text-right">Min Temp (°C)</th>
                  <th className="p-2.5 text-right">Wind Speed (km/h)</th>
                  <th className="p-2.5 text-right">Rainfall (mm)</th>
                  <th className="p-2.5 text-right">Humidity (%)</th>
                  <th className="p-2.5 text-center">Threat Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edebe9]">
                {history.map((h, idx) => (
                  <tr key={idx} className="hover:bg-[#f8f9fa]">
                    <td className="p-2.5 font-bold text-black/87">{h.date}</td>
                    <td className="p-2.5 text-right font-mono text-[#e22718] font-bold">{h.temp_max}°C</td>
                    <td className="p-2.5 text-right font-mono text-black/87">{h.temp_min}°C</td>
                    <td className="p-2.5 text-right font-mono text-[#f48c06]">{h.wind_speed} km/h</td>
                    <td className="p-2.5 text-right font-mono text-[#1c69d4]">{h.rainfall} mm</td>
                    <td className="p-2.5 text-right font-mono text-black/87">{h.humidity}%</td>
                    <td className="p-2.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                          h.weather_risk === "HIGH"
                            ? "bg-[#e22718] text-white"
                            : h.weather_risk === "MEDIUM"
                            ? "bg-[#f48c06] text-white"
                            : "bg-[#0fa336] text-white"
                        }`}
                      >
                        {h.weather_risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 2: NEXT WEEK WEATHER FORECAST (7-DAY FORECAST) */}
        <div className="bg-white border border-[#edebe9] p-5 rounded-[16px] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)] space-y-4">
          <div>
            <h2 className="text-base font-black uppercase text-black/87 flex items-center gap-2">
              <CloudLightning size={18} className="text-[#f48c06]" />
              Next Week Weather Forecast (7-Day Predictive Radar)
            </h2>
            <p className="text-[10px] text-black/58">
              Predictive meteorological forecast & potential grid disruption threat rating
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {forecast.map((f, idx) => (
              <div
                key={idx}
                className="bg-[#f8f9fa] border border-[#edebe9] p-3 rounded-xl flex flex-col justify-between hover:border-[#00754A] transition-all"
              >
                <div>
                  <div className="text-[10px] font-black uppercase text-black/87">{f.day_name}</div>
                  <div className="text-[8px] text-black/58">{f.date}</div>
                  <div className="my-2 py-1.5 px-2 bg-white rounded border border-[#edebe9] text-center">
                    <div className="text-[9px] font-bold text-[#00754A] line-clamp-1">{f.condition}</div>
                  </div>
                  <div className="text-[10px] font-mono space-y-1 my-2">
                    <div className="flex justify-between">
                      <span className="text-black/58">Temp:</span>
                      <span className="font-bold text-black/87">{f.temp_min}° - {f.temp_max}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/58">Wind:</span>
                      <span className="font-bold text-[#f48c06]">{f.wind_speed} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/58">Rain:</span>
                      <span className="font-bold text-[#1c69d4]">{f.rainfall} mm</span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-[#edebe9]">
                  <div className="text-[8px] text-black/58 uppercase mb-1">Grid Impact:</div>
                  <span
                    className={`block text-center py-1 rounded text-[8px] font-black uppercase ${
                      f.grid_impact === "CRITICAL"
                        ? "bg-[#e22718] text-white"
                        : f.grid_impact === "HIGH"
                        ? "bg-[#f48c06] text-white"
                        : f.grid_impact === "MEDIUM"
                        ? "bg-[#f4b400] text-black"
                        : "bg-[#0fa336] text-white"
                    }`}
                  >
                    {f.grid_impact}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: DISTRICT GRID ASSETS */}
        <div className="bg-white border border-[#edebe9] p-5 rounded-[16px] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="text-base font-black uppercase text-black/87 flex items-center gap-2">
                <Zap size={18} className="text-[#00754A]" />
                Power Grid Assets in {district} ({districtAssets.length})
              </h2>
              <p className="text-[10px] text-black/58">Substations and transformers exposed to local district weather risk</p>
            </div>
          </div>

          {districtAssets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {districtAssets.map((asset) => (
                <div
                  key={asset.asset_id}
                  className="bg-[#f8f9fa] border border-[#edebe9] p-3 rounded-xl flex justify-between items-center hover:bg-white transition-all"
                >
                  <div>
                    <div className="font-bold text-xs text-[#00754A]">{asset.asset_id}</div>
                    <div className="font-bold text-black/87 text-[10px]">{asset.name || asset.location_name}</div>
                    <div className="text-[9px] text-black/58">
                      {asset.asset_type?.toUpperCase()} &bull; {asset.voltage_kv || 66} kV
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/transformers/${asset.asset_id}`)}
                    className="bg-[#00754A] hover:bg-[#006241] text-white px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all"
                  >
                    Inspect
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-black/58 text-xs">
              All monitored grid assets in {district} operating within normal risk parameters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
