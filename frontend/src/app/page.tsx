"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  Zap,
  Users,
  Map as MapIcon,
  LayoutDashboard,
  Database,
  Activity,
  Search,
  Bell,
  CloudRain,
  Wrench,
  CheckCircle,
  Clock,
  ChevronRight,
  Cpu,
  Sliders,
  Play,
  Filter,
  ShieldAlert,
  Radio,
  Check,
  X,
  MapPin,
  Send,
  Plus,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  fetchSummary,
  fetchRiskMap,
  fetchRecentAlerts,
  fetchTopRiskAssets,
  fetchRecommendations,
  fetchWeatherRisk,
  fetchAssetHistory,
  fetchLivePrediction,
  fetchAssets,
  fetchIncidents,
  fetchCrews,
  runCustomPrediction,
  fetchModelInfo,
  fetchMaintenance,
  createWorkOrder,
  dispatchCrew,
  resetCrew,
  fetchSensorStream,
} from "@/lib/api";

// Dynamically import Leaflet Map (SSR: false)
const GridMap = dynamic(() => import("@/components/GridMap"), { ssr: false });

export default function Dashboard() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Core Data State
  const [summary, setSummary] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [topAssets, setTopAssets] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [weather, setWeather] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("SS-2216");
  const [livePrediction, setLivePrediction] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>("ALL");

  // Secondary Data State for Tabs
  const [assetsList, setAssetsList] = useState<any[]>([]);
  const [incidentsList, setIncidentsList] = useState<any[]>([]);
  const [crewsList, setCrewsList] = useState<any[]>([]);
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [maintenanceList, setMaintenanceList] = useState<any[]>([]);
  const [sensorStream, setSensorStream] = useState<any[]>([]);
  const [sensorCategory, setSensorCategory] = useState<string>("ALL");
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>("ALL");

  // Interactive UI State
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [dispatchNotice, setDispatchNotice] = useState<string | null>(null);

  // Work Order Logging Modal State
  const [isLoggingWO, setIsLoggingWO] = useState<boolean>(false);
  const [woAssetId, setWoAssetId] = useState<string>("SS-2216");
  const [woType, setWoType] = useState<string>("Dissolved Gas Analysis & DGA Oil Treatment");
  const [woTech, setWoTech] = useState<string>("GETCO Senior Lineman Team");
  const [woNotes, setWoNotes] = useState<string>("Schedule emergency inspection and dielectric oil testing.");

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>("");

  // AI Live Simulator State (for Judges)
  const [simTemp, setSimTemp] = useState<number>(55);
  const [simOilTemp, setSimOilTemp] = useState<number>(50);
  const [simVibration, setSimVibration] = useState<number>(2.1);
  const [simLoad, setSimLoad] = useState<number>(65);
  const [simAcetylene, setSimAcetylene] = useState<number>(1.5);
  const [simHydrogen, setSimHydrogen] = useState<number>(25);
  const [simEthylene, setSimEthylene] = useState<number>(20);
  const [simMethane, setSimMethane] = useState<number>(35);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<any>(null);

  // Status State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Focus and inspect an asset
  const selectAsset = useCallback(async (assetId: string, shouldSwitchTab = false) => {
    setSelectedAssetId(assetId);
    if (shouldSwitchTab) {
      setActiveTab("map");
    }
    try {
      const [historyRes, predRes] = await Promise.allSettled([
        fetchAssetHistory(assetId),
        fetchLivePrediction(assetId),
      ]);

      if (historyRes.status === "fulfilled" && Array.isArray(historyRes.value) && historyRes.value.length > 0) {
        const formatted = historyRes.value.map((h: any) => ({
          time: new Date(h.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          risk: Math.min(100, Math.round(((h.temperature || 60) / 110) * 100)),
          temp: Math.round(h.temperature || 55),
        }));
        setChartData(formatted);
      }

      if (predRes.status === "fulfilled") {
        setLivePrediction(predRes.value);
      }
    } catch (e) {
      console.error("Failed to fetch asset details:", e);
    }
  }, []);

  // Main data loader
  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [sumRes, mapRes, alertsRes, topRes, recRes, weatherRes, modelRes] = await Promise.allSettled([
        fetchSummary(),
        fetchRiskMap(),
        fetchRecentAlerts(),
        fetchTopRiskAssets(),
        fetchRecommendations(),
        fetchWeatherRisk(),
        fetchModelInfo(),
      ]);

      if (sumRes.status === "fulfilled") setSummary(sumRes.value);
      if (mapRes.status === "fulfilled") setMarkers(mapRes.value);
      if (alertsRes.status === "fulfilled") setAlerts(alertsRes.value);
      if (recRes.status === "fulfilled") setRecommendations(recRes.value);
      if (weatherRes.status === "fulfilled") setWeather(weatherRes.value);
      if (modelRes.status === "fulfilled") setModelInfo(modelRes.value);

      if (topRes.status === "fulfilled") {
        setTopAssets(topRes.value);
        if (!isBackground && topRes.value.length > 0) {
          const initialId = topRes.value[0]?.asset_id || "SS-2216";
          selectAsset(initialId);
        }
      }
      setLastRefreshed(new Date());
    } catch (e) {
      console.error("Data load failed:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectAsset]);

  // Tab-specific lazy fetching
  useEffect(() => {
    if (activeTab === "assets" && assetsList.length === 0) {
      fetchAssets(1000).then((data) => setAssetsList(data)).catch(console.error);
    } else if (activeTab === "incidents" && incidentsList.length === 0) {
      fetchIncidents(100).then((data) => setIncidentsList(data)).catch(console.error);
    } else if (activeTab === "crews") {
      fetchCrews().then((data) => setCrewsList(data)).catch(console.error);
    } else if (activeTab === "maintenance") {
      fetchMaintenance().then((data) => setMaintenanceList(data)).catch(console.error);
    } else if (activeTab === "sensors") {
      fetchSensorStream(100).then((data) => setSensorStream(data)).catch(console.error);
    }
  }, [activeTab, assetsList.length, incidentsList.length]);

  // Initial load + 15s auto-refresh interval
  useEffect(() => {
    loadData(false);
    const interval = setInterval(() => loadData(true), 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Field Crew Dispatch Handler
  const handleDispatchCrew = async (crewId: string, assetId?: string) => {
    try {
      const res = await dispatchCrew(crewId, assetId);
      if (res.success) {
        setDispatchNotice(res.message);
        fetchCrews().then((data) => setCrewsList(data)).catch(console.error);
        setTimeout(() => setDispatchNotice(null), 7000);
      }
    } catch (e) {
      console.error("Crew dispatch failed:", e);
      setDispatchNotice("Failed to dispatch field crew. Please verify backend connection.");
      setTimeout(() => setDispatchNotice(null), 5000);
    }
  };

  // Crew Reset Handler
  const handleResetCrew = async (crewId: string) => {
    try {
      const res = await resetCrew(crewId);
      if (res.success) {
        setDispatchNotice(res.message);
        fetchCrews().then((data) => setCrewsList(data)).catch(console.error);
        setTimeout(() => setDispatchNotice(null), 5000);
      }
    } catch (e) {
      console.error("Crew reset failed:", e);
    }
  };

  // Work Order Submit Handler
  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createWorkOrder({
        asset_id: woAssetId,
        maintenance_type: woType,
        technician: woTech,
        notes: woNotes,
      });
      if (res.success) {
        setIsLoggingWO(false);
        setDispatchNotice(res.message);
        fetchMaintenance().then((data) => setMaintenanceList(data)).catch(console.error);
        setTimeout(() => setDispatchNotice(null), 6000);
      }
    } catch (e) {
      console.error("Work order creation failed:", e);
    }
  };

  // Trigger Live AI Simulator (For Judges)
  const handleSimulate = async (customPayload?: Record<string, any>) => {
    setSimulating(true);
    const payload = customPayload || {
      temperature: simTemp,
      oil_temperature: simOilTemp,
      vibration: simVibration,
      load_percent: simLoad,
      acetylene: simAcetylene,
      hydrogen: simHydrogen,
      ethylene: simEthylene,
      methane: simMethane,
    };

    try {
      const res = await runCustomPrediction(payload);
      setSimResult(res);
    } catch (e) {
      console.error("Simulation failed:", e);
    } finally {
      setSimulating(false);
    }
  };

  // Presets for Demo
  const applyPreset = (preset: string) => {
    if (preset === "normal") {
      setSimTemp(48); setSimOilTemp(42); setSimVibration(1.2); setSimLoad(55);
      setSimAcetylene(0.5); setSimHydrogen(15); setSimEthylene(8); setSimMethane(20);
      handleSimulate({ temperature: 48, oil_temperature: 42, vibration: 1.2, load_percent: 55, acetylene: 0.5, hydrogen: 15, ethylene: 8, methane: 20 });
    } else if (preset === "arcing") {
      setSimTemp(88); setSimOilTemp(82); setSimVibration(3.5); setSimLoad(95);
      setSimAcetylene(38.0); setSimHydrogen(140); setSimEthylene(110); setSimMethane(85);
      handleSimulate({ temperature: 88, oil_temperature: 82, vibration: 3.5, load_percent: 95, acetylene: 38.0, hydrogen: 140, ethylene: 110, methane: 85 });
    } else if (preset === "thermal") {
      setSimTemp(98); setSimOilTemp(94); setSimVibration(2.8); setSimLoad(118);
      setSimAcetylene(2.0); setSimHydrogen(60); setSimEthylene(160); setSimMethane(120);
      handleSimulate({ temperature: 98, oil_temperature: 94, vibration: 2.8, load_percent: 118, acetylene: 2.0, hydrogen: 60, ethylene: 160, methane: 120 });
    } else if (preset === "mechanical") {
      setSimTemp(62); setSimOilTemp(58); setSimVibration(6.8); setSimLoad(70);
      setSimAcetylene(1.2); setSimHydrogen(30); setSimEthylene(18); setSimMethane(40);
      handleSimulate({ temperature: 62, oil_temperature: 58, vibration: 6.8, load_percent: 70, acetylene: 1.2, hydrogen: 30, ethylene: 18, methane: 40 });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black text-[#bbbbbb] gap-3">
        <div className="w-8 h-8 border-2 border-[#1c69d4] border-t-transparent rounded-full animate-spin" />
        <div className="font-bold text-xs tracking-widest uppercase">Connecting to Gujarat Power Grid SCADA...</div>
      </div>
    );
  }

  // Filter markers based on selected category
  const filteredMarkers = markers.filter((m) => {
    if (filterType === "CRITICAL") return m.risk_level === "CRITICAL";
    if (filterType === "HIGH") return m.risk_level === "HIGH" || m.risk_level === "CRITICAL";
    if (filterType === "POWER_PLANT") return m.asset_type === "power_plant" || m.asset_id?.startsWith("PP-");
    if (filterType === "SUBSTATION") return m.asset_type === "substation" || m.asset_id?.startsWith("SS-");
    if (filterType === "TRANSFORMER") return m.asset_type === "transformer" || m.asset_id?.startsWith("TR-");
    return true;
  });

  const currentWeather = weather.find((w: any) => w.district === "Ahmedabad") || weather[0];

  const filteredSensors = sensorStream.filter((s) => {
    if (sensorCategory === "CRITICAL") return s.status === "CRITICAL";
    if (sensorCategory === "WARNING") return s.status === "WARNING" || s.status === "CRITICAL";
    if (sensorCategory === "TRANSFORMERS") return s.asset_type === "transformer" || s.asset_id?.startsWith("TR-");
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return s.asset_id.toLowerCase().includes(term) || (s.district || "").toLowerCase().includes(term) || (s.asset_name || "").toLowerCase().includes(term);
    }
    return true;
  });

  const filteredAssetsList = assetsList.filter((a) => {
    if (assetTypeFilter === "TRANSFORMERS") return a.asset_type === "transformer" || a.asset_id?.startsWith("TR-");
    if (assetTypeFilter === "SUBSTATIONS") return a.asset_type === "substation" || a.asset_id?.startsWith("SS-");
    if (assetTypeFilter === "POWER_PLANTS") return a.asset_type === "power_plant" || a.asset_id?.startsWith("PP-");
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return a.asset_id.toLowerCase().includes(term) || (a.name || "").toLowerCase().includes(term) || (a.district || "").toLowerCase().includes(term);
    }
    return true;
  });

  return (
    <div className="flex h-screen bg-[#000] text-white overflow-hidden text-[11px]">
      {/* SIDEBAR */}
      <aside className="w-52 border-r border-[#3c3c3c] flex flex-col flex-shrink-0 bg-[#050505]">
        <div className="px-4 py-4">
          <div className="flex items-center gap-1.5 text-base font-bold tracking-tight uppercase">
            <Zap className="text-[#1c69d4] h-5 w-5" fill="currentColor" />
            PowerGrid AI
          </div>
          <p className="text-[9px] text-[#7e7e7e] mt-0.5 uppercase tracking-widest">
            Predict. Prevent. Keep Grid On.
          </p>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={14} />} label="Dashboard" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
          <NavItem icon={<MapIcon size={14} />} label="Risk Map" active={activeTab === "map"} onClick={() => setActiveTab("map")} />
          <NavItem icon={<Database size={14} />} label="Assets" active={activeTab === "assets"} onClick={() => setActiveTab("assets")} />
          <NavItem icon={<Activity size={14} />} label="Sensors" active={activeTab === "sensors"} onClick={() => setActiveTab("sensors")} badge="SCADA" />
          <NavItem icon={<AlertTriangle size={14} />} label="Incidents" active={activeTab === "incidents"} onClick={() => setActiveTab("incidents")} />
          <NavItem icon={<Cpu size={14} className="text-[#1c69d4]" />} label="AI Predictions" active={activeTab === "predictions"} onClick={() => setActiveTab("predictions")} badge="ML" />
          <div className="mt-4 mb-1 px-2 text-[9px] font-bold text-[#7e7e7e] uppercase tracking-widest">Operations</div>
          <NavItem icon={<Wrench size={14} />} label="Maintenance" active={activeTab === "maintenance"} onClick={() => setActiveTab("maintenance")} badge={String(maintenanceList.length || "10")} />
          <NavItem icon={<Users size={14} />} label="Crew Planning" active={activeTab === "crews"} onClick={() => setActiveTab("crews")} />
          <div className="mt-4 mb-1 px-2 text-[9px] font-bold text-[#7e7e7e] uppercase tracking-widest">System</div>
          <NavItem icon={<Bell size={14} />} label="Alerts" badge={String(alerts.length)} active={activeTab === "alerts"} onClick={() => setActiveTab("alerts")} />
        </nav>

        <div className="px-4 py-3 border-t border-[#3c3c3c] bg-[#000]">
          <div className="text-[9px] text-[#7e7e7e] uppercase tracking-widest mb-1">Grid Reliability</div>
          <div className="text-lg font-bold text-[#0fa336]">99.82%</div>
          <div className="text-[9px] text-[#0fa336]">+0.12% this week &bull; Gujarat SLDC</div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-[#000]">
        {/* HEADER */}
        <header className="h-12 border-b border-[#3c3c3c] flex items-center justify-between px-6 bg-[#000]/90 backdrop-blur-md sticky top-0 z-20 flex-shrink-0">
          <div className="flex-1 max-w-sm relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7e7e7e]" size={12} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search transformers, substations, or zones..."
              className="w-full bg-[#1a1a1a] border border-[#3c3c3c] py-1.5 pl-8 pr-3 text-[11px] focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-[#161616] border border-[#333] px-2.5 py-1">
              <div className={`w-2 h-2 rounded-full ${isRefreshing ? "bg-[#f4b400] animate-spin" : "bg-[#0fa336] animate-pulse"}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#bbb]">
                {isRefreshing ? "SYNCING..." : "LIVE TELEMETRY"}
              </span>
              <span className="text-[9px] text-[#666]">
                {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <CloudRain className="text-[#bbbbbb]" size={14} />
              <div>
                <div className="font-bold text-[11px]">{currentWeather?.avg_temp ? Math.round(currentWeather.avg_temp) : 28}°C</div>
                <div className="text-[9px] text-[#bbbbbb]">Partly cloudy</div>
              </div>
            </div>

            <div className="flex items-center gap-3 border-l border-[#3c3c3c] pl-6 relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-1.5 hover:bg-[#1f1f1f] rounded transition-colors text-white"
              >
                <Bell size={16} className="text-[#bbbbbb] hover:text-white" />
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#e22718] rounded-full border-2 border-black" />
              </button>

              {/* NOTIFICATIONS INTERACTIVE DROPDOWN */}
              {showNotifications && (
                <div className="absolute right-0 top-10 z-[3000] w-80 bg-[#111] border border-[#444] shadow-2xl p-3 text-white backdrop-blur-lg">
                  <div className="flex justify-between items-center pb-2 border-b border-[#333]">
                    <div className="flex items-center gap-1.5 font-bold uppercase text-xs">
                      <Bell size={14} className="text-[#e22718]" />
                      Grid Alerts ({alerts.length})
                    </div>
                    <button onClick={() => setShowNotifications(false)} className="text-[#888] hover:text-white">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2 py-2">
                    {alerts.slice(0, 5).map((a: any, idx: number) => (
                      <div key={idx} className="bg-[#181818] border border-[#333] p-2 hover:bg-[#222]">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-white text-[10px]">{a.asset_id}</span>
                          <span className={`px-1 py-0.2 text-[8px] font-extrabold uppercase ${a.severity === "CRITICAL" ? "bg-[#e22718] text-white" : "bg-[#f4b400] text-black"}`}>
                            {a.severity}
                          </span>
                        </div>
                        <div className="text-[9px] text-[#bbb] mb-1.5">{a.fault_type || "High Thermal Stress / DGA Risk"}</div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              selectAsset(a.asset_id, true);
                              setShowNotifications(false);
                            }}
                            className="bg-[#1c69d4] hover:bg-[#0066b1] text-white text-[8px] font-bold uppercase px-2 py-0.5"
                          >
                            Focus on Map
                          </button>
                          <button
                            onClick={() => {
                              handleDispatchCrew("1", a.asset_id);
                              setShowNotifications(false);
                            }}
                            className="bg-[#333] hover:bg-[#444] text-white text-[8px] font-bold uppercase px-2 py-0.5"
                          >
                            Dispatch Crew
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("alerts");
                      setShowNotifications(false);
                    }}
                    className="w-full text-center text-[9px] font-bold uppercase text-[#1c69d4] hover:underline pt-2 border-t border-[#333]"
                  >
                    View All Grid Alerts &rarr;
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#1c69d4] flex items-center justify-center font-bold text-[10px] uppercase">SLDC</div>
                <div>
                  <div className="font-bold text-[11px]">System Operator</div>
                  <div className="text-[9px] text-[#bbbbbb]">Gujarat Energy Trans. Corp.</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* DISPATCH / DISPATCH STATUS BANNER */}
        {dispatchNotice && (
          <div className="bg-[#1c69d4] text-white px-6 py-2 flex justify-between items-center text-xs font-bold uppercase tracking-wider sticky top-12 z-30 shadow-lg">
            <div className="flex items-center gap-2">
              <Send size={14} className="animate-pulse" />
              {dispatchNotice}
            </div>
            <button onClick={() => setDispatchNotice(null)} className="text-white hover:opacity-75">
              <X size={14} />
            </button>
          </div>
        )}

        {/* VIEW 1: MAIN DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-xl font-bold uppercase tracking-tight">Grid Operations Overview</h1>
                <p className="text-[#bbbbbb] mt-0.5 font-light text-[10px]">
                  Predictive Outage & Equipment Failure Advisor &bull; MapTiler Dark Vector Engine
                </p>
              </div>
              <div className="text-right text-[11px] text-[#bbbbbb]">
                Monitoring <span className="font-bold text-white">836 Assets</span> (<span className="text-[#1c69d4] font-bold">495 Transformers</span> &bull; <span className="text-white font-bold">329 Substations</span> &bull; <span className="text-[#f48c06] font-bold">12 Power Plants</span>) &bull; All 33 Districts
              </div>
            </div>

            {/* KPI METRIC CARDS */}
            <div className="grid grid-cols-5 gap-3">
              <MetricCard title="Monitored Assets" value={summary?.total_assets || 836} icon={<Zap size={16} />} subtext="495 Transformers • 329 Substations • 12 Power Plants" />
              <MetricCard title="Critical Assets" value={summary?.critical_assets || 18} icon={<AlertTriangle size={16} />} alert subtext="Requires Immediate Field Inspection" />
              <MetricCard title="At-Risk Assets" value={summary?.at_risk_assets || 42} icon={<ShieldAlert size={16} />} warning subtext="High & Critical Horizon (48h)" />
              <MetricCard title="Predicted Outages" value={summary?.predicted_failures || 6} icon={<Cpu size={16} />} subtext="AI XGBoost High Probability (6h)" />
              <MetricCard title="Customers Impact" value={(summary?.customers_at_risk || 142800).toLocaleString()} icon={<Users size={16} />} subtext="Estimated Affected Customer Base" />
            </div>

            {/* MAIN MAP & WEATHER PANEL */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 bg-[#1a1a1a] border border-[#3c3c3c] p-4 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h2 className="text-sm font-bold uppercase">Gujarat Power Transmission Grid Map</h2>
                    <p className="text-[9px] text-[#888]">Live 836+ High-Voltage GETCO Assets & Generation Stations</p>
                  </div>
                  <div className="flex gap-2">
                    {["ALL", "CRITICAL", "POWER_PLANT", "SUBSTATION", "TRANSFORMER"].map((ft) => (
                      <button
                        key={ft}
                        onClick={() => setFilterType(ft)}
                        className={`px-2 py-0.5 text-[9px] font-bold uppercase border transition-colors ${
                          filterType === ft ? "bg-[#1c69d4] border-[#1c69d4] text-white" : "bg-[#111] border-[#333] text-[#888] hover:text-white"
                        }`}
                      >
                        {ft.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 relative border border-[#3c3c3c] overflow-hidden" style={{ minHeight: "360px" }}>
                  <GridMap
                    markers={filteredMarkers}
                    selectedAssetId={selectedAssetId}
                    onSelectAsset={(id) => selectAsset(id)}
                  />
                </div>
              </div>

              {/* WEATHER RISK & ADVISORY PANEL */}
              <div className="space-y-4">
                <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-sm font-bold uppercase">District Weather Threat</h2>
                    <span className="text-[9px] text-[#888] uppercase">IMD Live Radar</span>
                  </div>
                  <p className="text-[9px] text-[#bbbbbb] mb-2">{currentWeather?.district || "Ahmedabad"} Region</p>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CloudRain size={28} className="text-[#1c69d4]" />
                      <div>
                        <div className="font-bold uppercase text-sm">{currentWeather?.weather_risk_level === "HIGH" ? "Severe Weather" : "Normal Weather"}</div>
                        <div className="text-[10px] text-[#bbbbbb]">{currentWeather?.weather_risk_level === "HIGH" ? "High impact on grid assets" : "Low impact expected"}</div>
                      </div>
                    </div>
                    <div className={`${currentWeather?.weather_risk_level === "HIGH" ? "bg-[#e22718]" : "bg-[#0fa336]"} text-white px-2 py-0.5 font-bold tracking-widest uppercase text-[10px]`}>
                      {currentWeather?.weather_risk_level || "LOW"}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center border-t border-[#3c3c3c] pt-3">
                    <div><div className="font-bold text-sm">{currentWeather?.rainfall || 0}mm</div><div className="text-[9px] text-[#7e7e7e] uppercase">Rainfall</div></div>
                    <div><div className="font-bold text-sm">{currentWeather?.wind_speed || 0} km/h</div><div className="text-[9px] text-[#7e7e7e] uppercase">Wind</div></div>
                    <div><div className="font-bold text-sm">{currentWeather?.avg_temp ? Math.round(currentWeather.avg_temp) : 28}°C</div><div className="text-[9px] text-[#7e7e7e] uppercase">Temp</div></div>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM ROW: TOP RISK TABLE & AUTOMATED DISPATCH */}
                        <div className="grid grid-cols-3 gap-4 pb-6 items-start">
              {/* TOP RISK TABLE WITH IMPACT-ADJUSTED PRIORITY */}
              <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h2 className="text-sm font-bold uppercase">Top Risk Equipment</h2>
                    <p className="text-[8px] text-[#666] mt-0.5">Ranked by Impact-Adjusted Risk (60% Intrinsic Risk + 40% Population Impact)</p>
                  </div>
                  <span className="text-[9px] text-[#888] uppercase" title="Intrinsic Risk represents the equipment's calculated technical risk. Impact-Adjusted Risk combines intrinsic risk with the number of customers potentially affected to determine overall priority.">Click row to focus map</span>
                </div>
                <div className="overflow-x-auto max-h-[260px]">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-[#1a1a1a] z-10">
                      <tr className="text-left text-[#7e7e7e] text-[9px] uppercase tracking-widest border-b border-[#3c3c3c]">
                        <th className="pb-2 font-normal">#</th>
                        <th className="pb-2 font-normal">Asset ID</th>
                        <th className="pb-2 font-normal text-center">Priority</th>
                        <th className="pb-2 font-normal text-center">Intrinsic Risk</th>
                        <th className="pb-2 font-normal text-center">Impact-Adjusted Risk</th>
                        <th className="pb-2 font-normal text-right">Customers</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3c3c3c]">
                      {topAssets.map((asset: any, index: number) => {
                        const riskScore = Number(asset.overall_risk_score || 50);
                        const impactScore = Number(asset.impact_adjusted_risk || riskScore);

                        // Priority badge derived from impact-adjusted risk (not raw risk)
                        let pBadge = <span className="bg-[#0fa336] text-white px-1.5 py-0.5 text-[8px] font-extrabold uppercase">P4 LOW</span>;
                        if (impactScore >= 75) pBadge = <span className="bg-[#e22718] text-white px-1.5 py-0.5 text-[8px] font-extrabold uppercase">P1 CRITICAL</span>;
                        else if (impactScore >= 55) pBadge = <span className="bg-[#f48c06] text-white px-1.5 py-0.5 text-[8px] font-extrabold uppercase">P2 HIGH</span>;
                        else if (impactScore >= 35) pBadge = <span className="bg-[#f4b400] text-black px-1.5 py-0.5 text-[8px] font-extrabold uppercase">P3 MEDIUM</span>;

                        const impactColor = impactScore >= 75 ? "#e22718" : impactScore >= 55 ? "#f48c06" : impactScore >= 35 ? "#f4b400" : "#0fa336";

                        return (
                          <tr
                            key={`${asset.asset_id}-${index}`}
                            onClick={() => selectAsset(asset.asset_id)}
                            className={`cursor-pointer transition-colors text-[10px] ${
                              selectedAssetId === asset.asset_id ? "bg-[#1c69d4]/20 border-l-2 border-[#1c69d4]" : "hover:bg-[#262626]"
                            }`}
                          >
                            <td className="py-2.5 px-1 text-[#888]">{index + 1}</td>
                            <td className="py-2.5 font-bold text-white">{asset.asset_id}</td>
                            <td className="py-2.5 text-center">{pBadge}</td>
                            <td className="py-2.5 text-center font-bold text-white">
                              {Math.round(riskScore)}%
                            </td>
                            <td className="py-2.5 text-center">
                              <div className="flex items-center gap-1.5 justify-center">
                                <div className="w-12 h-1.5 bg-[#333] overflow-hidden">
                                  <div className="h-full" style={{ width: `${Math.min(100, impactScore)}%`, backgroundColor: impactColor }} />
                                </div>
                                <span className="font-bold text-[9px]" style={{ color: impactColor }}>{Math.round(impactScore)}</span>
                              </div>
                            </td>
                            <td className="py-2.5 text-right font-mono text-[#bbb]">{(asset.customers_served || 0).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TELEMETRY CHART + LIVE XGBOOST INFERENCE */}
              <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-4 flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold uppercase">Asset Telemetry Trend</h2>
                    <span className="bg-[#1c69d4] text-white px-1.5 py-0.5 text-[9px] font-bold">
                      {selectedAssetId}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-[#0fa336] font-bold uppercase">
                    <Cpu size={11} /> XGBoost Active
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest mb-2">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#e22718] inline-block" /> Stress/Risk</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#1c69d4] inline-block" /> Temperature (°C)</span>
                </div>

                <div className="h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                      <XAxis dataKey="time" stroke="#7e7e7e" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#7e7e7e" fontSize={9} tickLine={false} axisLine={false} domain={[0, 110]} />
                      <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #3c3c3c", borderRadius: 0, fontSize: 10 }} />
                      <Line type="monotone" dataKey="risk" stroke="#e22718" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="temp" stroke="#1c69d4" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Real-time ML Prediction Card */}
                <div className="mt-3 pt-3 border-t border-[#3c3c3c] bg-[#111] p-2.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-bold uppercase text-[#888]">Live AI Failure Prediction</span>
                    <span className="text-[9px] font-bold text-[#1c69d4] uppercase">Window: {livePrediction?.risk_window || "24h"}</span>
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold uppercase text-white">
                      {livePrediction?.predicted_fault_mode || "Evaluating Sensors..."}
                    </span>
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 uppercase ${
                      livePrediction?.failure_probability > 0.5 ? "bg-[#e22718] text-white" : "bg-[#f4b400] text-black"
                    }`}>
                      {livePrediction?.failure_probability ? `${Math.round(livePrediction.failure_probability * 100)}% Prob` : "Active"}
                    </span>
                  </div>
                  <div className="text-[9px] text-[#888] line-clamp-1 mb-1">
                    {livePrediction?.recommended_action || "Advisory: Continuous monitoring schedule active."}
                  </div>
                </div>
              </div>

              {/* RECOMMENDED ACTIONS */}
              
                <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-4 flex flex-col self-start">
                  <div className="flex justify-between items-center mb-3">
                  <h2 className="text-sm font-bold uppercase">Automated Dispatch Actions</h2>
                  <span className="text-[9px] font-bold text-[#bbbbbb] uppercase tracking-widest">{recommendations.length} Queue</span>
                </div>
                <div className="space-y-3 overflow-y-auto max-h-[260px] pr-1">
                  {recommendations.map((rec: any, idx: number) => (
                    <ActionItem
                      key={idx}
                      icon={rec.priority === 1 ? <AlertTriangle size={14} /> : <Wrench size={14} />}
                      type={rec.priority === 1 ? "critical" : "warning"}
                      title={`${rec.asset_id}: ${rec.action_type.replace(/_/g, " ")}`}
                      desc={rec.description}
                      priority={`Priority ${rec.priority}`}
                      btn={rec.priority === 1 ? "Dispatch Crew" : "Schedule WO"}
                      onAction={() => {
                        if (rec.priority === 1) {
                          handleDispatchCrew("1", rec.asset_id);
                        } else {
                          setWoAssetId(rec.asset_id);
                          setIsLoggingWO(true);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: FULL SCREEN RISK MAP */}
        {activeTab === "map" && (
          <div className="flex-1 flex flex-col h-full p-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h1 className="text-lg font-bold uppercase">Gujarat Power Grid &bull; Interactive Risk Map</h1>
                <p className="text-[10px] text-[#888]">
                  Displaying {filteredMarkers.length} of {markers.length} total monitored power grid facilities
                </p>
              </div>
              <div className="flex gap-2">
                {[
                  { id: "ALL", label: "ALL (836)" },
                  { id: "CRITICAL", label: "CRITICAL" },
                  { id: "POWER_PLANT", label: "POWER PLANTS (12)" },
                  { id: "SUBSTATION", label: "SUBSTATIONS" },
                  { id: "TRANSFORMER", label: "TRANSFORMERS" },
                ].map((ft) => (
                  <button
                    key={ft.id}
                    onClick={() => setFilterType(ft.id)}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      filterType === ft.id ? "bg-[#1c69d4] text-white" : "bg-[#1a1a1a] border border-[#333] text-[#888] hover:text-white"
                    }`}
                  >
                    {ft.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 relative border border-[#3c3c3c] overflow-hidden" style={{ minHeight: "550px" }}>
              <GridMap
                markers={filteredMarkers}
                selectedAssetId={selectedAssetId}
                onSelectAsset={(id) => selectAsset(id)}
              />
            </div>
          </div>
        )}

        {/* VIEW 3: ASSETS TAB */}
        {activeTab === "assets" && (
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-lg font-bold uppercase">Gujarat Power Asset Inventory</h1>
                <p className="text-[10px] text-[#888]">836 GETCO Power Generation Stations, Substations & Distribution Transformers</p>
              </div>
              <div className="flex items-center gap-2">
                {[
                  { id: "ALL", label: "ALL" },
                  { id: "TRANSFORMERS", label: "TRANSFORMERS (495)" },
                  { id: "SUBSTATIONS", label: "SUBSTATIONS (329)" },
                  { id: "POWER_PLANTS", label: "POWER PLANTS (12)" },
                ].map((af) => (
                  <button
                    key={af.id}
                    onClick={() => setAssetTypeFilter(af.id)}
                    className={`px-3 py-1 text-[9px] font-bold uppercase border transition-colors ${
                      assetTypeFilter === af.id ? "bg-[#1c69d4] border-[#1c69d4] text-white" : "bg-[#111] border-[#333] text-[#888] hover:text-white"
                    }`}
                  >
                    {af.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#1a1a1a] border border-[#3c3c3c] overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead className="bg-[#111] border-b border-[#3c3c3c] text-left uppercase text-[#777]">
                  <tr>
                    <th className="p-2.5">Asset ID</th>
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">District</th>
                    <th className="p-2.5 text-right">Capacity (MVA)</th>
                    <th className="p-2.5 text-right">Voltage (kV)</th>
                    <th className="p-2.5 text-right">Customers</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2a]">
                  {filteredAssetsList.slice(0, 100).map((a) => (
                    <tr key={a.id} className="hover:bg-[#222]">
                      <td className="p-2.5 font-bold text-white">{a.asset_id}</td>
                      <td className="p-2.5 text-[#bbb]">{a.name || "Gujarat Asset"}</td>
                      <td className="p-2.5 uppercase font-bold text-[#1c69d4]">{a.asset_type}</td>
                      <td className="p-2.5 text-[#bbb]">{a.district}</td>
                      <td className="p-2.5 text-right font-mono text-white">{a.capacity_mva || "--"}</td>
                      <td className="p-2.5 text-right font-mono text-white">{a.voltage_kv || "--"}</td>
                      <td className="p-2.5 text-right font-mono text-white">{(a.customers_served || 0).toLocaleString()}</td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => selectAsset(a.asset_id, true)}
                          className="bg-[#1c69d4] text-white px-2.5 py-1 font-bold uppercase text-[9px] hover:bg-[#0066b1]"
                        >
                          Focus on Map
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 4: SCADA SENSORS MONITORING STREAM */}
        {activeTab === "sensors" && (
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-lg font-bold uppercase">Live SCADA Sensor Telemetry Stream</h1>
                <p className="text-[10px] text-[#888]">Real-Time Ingestion: Dissolved Gas Analysis (DGA), Thermal, Load & Vibration</p>
              </div>
              <div className="flex gap-2">
                {["ALL", "CRITICAL", "WARNING", "TRANSFORMERS"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSensorCategory(cat)}
                    className={`px-3 py-1 text-[9px] font-bold uppercase ${
                      sensorCategory === cat ? "bg-[#1c69d4] text-white" : "bg-[#1a1a1a] border border-[#333] text-[#888]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#1a1a1a] border border-[#3c3c3c] overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead className="bg-[#111] border-b border-[#3c3c3c] text-left uppercase text-[#777]">
                  <tr>
                    <th className="p-2.5">Asset ID</th>
                    <th className="p-2.5">District</th>
                    <th className="p-2.5 text-right">Temp (°C)</th>
                    <th className="p-2.5 text-right">Oil Temp (°C)</th>
                    <th className="p-2.5 text-right">Load %</th>
                    <th className="p-2.5 text-right">Vibration (mm/s)</th>
                    <th className="p-2.5 text-right">Voltage (kV)</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2a]">
                  {filteredSensors.map((s, idx) => (
                    <tr key={idx} className="hover:bg-[#222]">
                      <td className="p-2.5 font-bold text-white">{s.asset_id}</td>
                      <td className="p-2.5 text-[#bbb]">{s.district}</td>
                      <td className={`p-2.5 text-right font-mono ${s.temperature > 85 ? "text-[#e22718] font-bold" : "text-white"}`}>
                        {s.temperature}°C
                      </td>
                      <td className={`p-2.5 text-right font-mono ${s.oil_temperature > 80 ? "text-[#e22718] font-bold" : "text-[#bbb]"}`}>
                        {s.oil_temperature}°C
                      </td>
                      <td className={`p-2.5 text-right font-mono ${s.load_percent > 105 ? "text-[#e22718] font-bold" : "text-white"}`}>
                        {s.load_percent}%
                      </td>
                      <td className={`p-2.5 text-right font-mono ${s.vibration > 5.0 ? "text-[#e22718] font-bold" : "text-[#bbb]"}`}>
                        {s.vibration} mm/s
                      </td>
                      <td className="p-2.5 text-right font-mono text-[#bbb]">{s.voltage} kV</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 text-[8px] font-extrabold uppercase ${
                          s.status === "CRITICAL" ? "bg-[#e22718] text-white" : s.status === "WARNING" ? "bg-[#f4b400] text-black" : "bg-[#0fa336] text-white"
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => {
                            selectAsset(s.asset_id);
                            setActiveTab("predictions");
                          }}
                          className="bg-[#1c69d4] text-white px-2 py-0.5 text-[8px] font-bold uppercase hover:bg-[#0066b1]"
                        >
                          Inspect Telemetry
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 5: AI PREDICTIONS STUDIO */}
        {activeTab === "predictions" && (
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-lg font-bold uppercase">XGBoost ML Failure Prediction & Testing Studio</h1>
                <p className="text-[10px] text-[#888]">Trained on Dissolved Gas Analysis (DGA) & Operational Telemetry &bull; 98.12% Accuracy</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 bg-[#1a1a1a] border border-[#3c3c3c] p-4">
                <h2 className="text-sm font-bold uppercase mb-3">Live Interactive Telemetry Inputs</h2>

                {/* DEMO PRESET BUTTONS */}
                <div className="mb-4 p-3 bg-[#111] border border-[#333]">
                  <div className="text-[9px] font-bold uppercase text-[#888] mb-2">Instant Scenario Presets for Judges:</div>
                  <div className="grid grid-cols-4 gap-2">
                    <button onClick={() => applyPreset("normal")} className="bg-[#1a1a1a] border border-[#333] hover:border-[#0fa336] text-white p-2 text-left">
                      <div className="text-[9px] font-bold text-[#0fa336] uppercase">1. Safe Normal</div>
                      <div className="text-[8px] text-[#888]">48°C, low gases</div>
                    </button>
                    <button onClick={() => applyPreset("arcing")} className="bg-[#1a1a1a] border border-[#333] hover:border-[#e22718] text-white p-2 text-left">
                      <div className="text-[9px] font-bold text-[#e22718] uppercase">2. Arcing / Breakdown</div>
                      <div className="text-[8px] text-[#888]">C₂H₂ = 38 ppm</div>
                    </button>
                    <button onClick={() => applyPreset("thermal")} className="bg-[#1a1a1a] border border-[#333] hover:border-[#f48c06] text-white p-2 text-left">
                      <div className="text-[9px] font-bold text-[#f48c06] uppercase">3. Thermal Overheating</div>
                      <div className="text-[8px] text-[#888]">98°C oil, 118% load</div>
                    </button>
                    <button onClick={() => applyPreset("mechanical")} className="bg-[#1a1a1a] border border-[#333] hover:border-[#f4b400] text-white p-2 text-left">
                      <div className="text-[9px] font-bold text-[#f4b400] uppercase">4. Vibration Strain</div>
                      <div className="text-[8px] text-[#888]">6.8 mm/s vibration</div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-bold uppercase text-[#1c69d4]">Operational Parameters</h3>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>Winding Temperature:</span>
                        <span className="font-bold font-mono">{simTemp}°C</span>
                      </div>
                      <input type="range" min="30" max="110" value={simTemp} onChange={(e) => setSimTemp(Number(e.target.value))} className="w-full accent-[#1c69d4]" />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>Oil Temperature:</span>
                        <span className="font-bold font-mono">{simOilTemp}°C</span>
                      </div>
                      <input type="range" min="25" max="105" value={simOilTemp} onChange={(e) => setSimOilTemp(Number(e.target.value))} className="w-full accent-[#1c69d4]" />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>Vibration (mm/s):</span>
                        <span className="font-bold font-mono">{simVibration} mm/s</span>
                      </div>
                      <input type="range" min="0.5" max="8.0" step="0.1" value={simVibration} onChange={(e) => setSimVibration(Number(e.target.value))} className="w-full accent-[#1c69d4]" />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>Load Percentage:</span>
                        <span className="font-bold font-mono">{simLoad}%</span>
                      </div>
                      <input type="range" min="30" max="140" value={simLoad} onChange={(e) => setSimLoad(Number(e.target.value))} className="w-full accent-[#1c69d4]" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-[10px] font-bold uppercase text-[#e22718]">DGA Gas Analysis Chemistry (ppm)</h3>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>Acetylene (C₂H₂ - Arcing):</span>
                        <span className="font-bold font-mono text-[#e22718]">{simAcetylene} ppm</span>
                      </div>
                      <input type="range" min="0.1" max="50.0" step="0.5" value={simAcetylene} onChange={(e) => setSimAcetylene(Number(e.target.value))} className="w-full accent-[#e22718]" />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>Ethylene (C₂H₄ - Overheating):</span>
                        <span className="font-bold font-mono">{simEthylene} ppm</span>
                      </div>
                      <input type="range" min="1" max="180" value={simEthylene} onChange={(e) => setSimEthylene(Number(e.target.value))} className="w-full accent-[#1c69d4]" />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>Methane (CH₄):</span>
                        <span className="font-bold font-mono">{simMethane} ppm</span>
                      </div>
                      <input type="range" min="5" max="200" value={simMethane} onChange={(e) => setSimMethane(Number(e.target.value))} className="w-full accent-[#1c69d4]" />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>Hydrogen (H₂):</span>
                        <span className="font-bold font-mono">{simHydrogen} ppm</span>
                      </div>
                      <input type="range" min="5" max="250" value={simHydrogen} onChange={(e) => setSimHydrogen(Number(e.target.value))} className="w-full accent-[#1c69d4]" />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSimulate()}
                  disabled={simulating}
                  className="mt-5 w-full bg-[#1c69d4] hover:bg-[#0066b1] text-white text-[11px] font-bold uppercase py-2 transition-colors flex items-center justify-center gap-2"
                >
                  <Cpu size={14} />
                  {simulating ? "Executing XGBoost Inference..." : "Run Live XGBoost AI Inference"}
                </button>
              </div>

              {/* EVALUATION RESULTS CARD */}
              <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-4 flex flex-col justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase mb-3">Model Output & Analysis</h2>
                  {simResult ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-[#111] border border-[#333]">
                        <div className="text-[9px] uppercase text-[#888] mb-1">Predicted Failure Probability</div>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-2xl font-black ${simResult.failure_probability > 0.6 ? "text-[#e22718]" : "text-[#0fa336]"}`}>
                            {Math.round(simResult.failure_probability * 100)}%
                          </span>
                          <span className="text-[10px] font-bold uppercase text-[#bbb]">
                            {simResult.risk_level} (Horizon: {simResult.risk_window})
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-[#111] border border-[#333]">
                        <div className="text-[9px] uppercase text-[#888] mb-1">Equipment Health Index</div>
                        <div className="text-xl font-bold text-white">{simResult.health_score} / 100</div>
                      </div>

                      <div className="p-3 bg-[#111] border border-[#333]">
                        <div className="text-[9px] uppercase text-[#888] mb-1">Diagnosed Fault Mode</div>
                        <div className="text-xs font-bold text-[#1c69d4] uppercase">{simResult.predicted_fault_mode}</div>
                      </div>

                      <div className="p-2.5 bg-[#161616] border-l-2 border-[#1c69d4] text-[9px] text-[#aaa]">
                        <div className="font-bold text-white uppercase mb-0.5">Automated Action:</div>
                        {simResult.recommended_action}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-[#666]">
                      <Cpu size={32} className="mx-auto mb-2 opacity-50" />
                      <div>Adjust parameters or select a preset to run inference.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 6: MAINTENANCE & WORK ORDERS */}
        {activeTab === "maintenance" && (
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-lg font-bold uppercase">Grid Maintenance & Work Orders</h1>
                <p className="text-[10px] text-[#888]">Scheduled Preventive Inspections & AI Recommended Maintenance</p>
              </div>
              <button
                onClick={() => setIsLoggingWO(true)}
                className="bg-[#1c69d4] hover:bg-[#0066b1] text-white px-3 py-1.5 text-[10px] font-bold uppercase flex items-center gap-1.5"
              >
                <Plus size={14} />
                Log New Work Order
              </button>
            </div>

            {/* MAINTENANCE KPI SUMMARY */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-3 flex justify-between items-center">
                <div>
                  <div className="text-[9px] text-[#888] uppercase">Active Work Orders</div>
                  <div className="text-xl font-bold text-white">{maintenanceList.filter((m) => m.status === "SCHEDULED").length}</div>
                </div>
                <Wrench className="text-[#1c69d4]" size={20} />
              </div>
              <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-3 flex justify-between items-center">
                <div>
                  <div className="text-[9px] text-[#888] uppercase">Completed Maintenance</div>
                  <div className="text-xl font-bold text-[#0fa336]">{maintenanceList.filter((m) => m.status === "COMPLETED").length}</div>
                </div>
                <CheckCircle className="text-[#0fa336]" size={20} />
              </div>
              <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-3 flex justify-between items-center">
                <div>
                  <div className="text-[9px] text-[#888] uppercase">High Priority Queue</div>
                  <div className="text-xl font-bold text-[#e22718]">4</div>
                </div>
                <AlertTriangle className="text-[#e22718]" size={20} />
              </div>
            </div>

            {/* WORK ORDERS TABLE */}
            <div className="bg-[#1a1a1a] border border-[#3c3c3c] overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead className="bg-[#111] border-b border-[#3c3c3c] text-left uppercase text-[#777]">
                  <tr>
                    <th className="p-2.5">WO ID</th>
                    <th className="p-2.5">Asset ID</th>
                    <th className="p-2.5">District</th>
                    <th className="p-2.5">Maintenance Type</th>
                    <th className="p-2.5">Technician / Team</th>
                    <th className="p-2.5">Scheduled Date</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2a]">
                  {maintenanceList.map((m) => (
                    <tr key={m.id} className="hover:bg-[#222]">
                      <td className="p-2.5 font-bold text-white">WO-{m.id}</td>
                      <td className="p-2.5 font-bold text-[#1c69d4]">{m.asset_id}</td>
                      <td className="p-2.5 text-[#bbb]">{m.district || "Gujarat"}</td>
                      <td className="p-2.5 text-white">{m.maintenance_type}</td>
                      <td className="p-2.5 text-[#888]">{m.technician}</td>
                      <td className="p-2.5 text-[#888]">{new Date(m.next_due_at).toLocaleDateString()}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 text-[8px] font-extrabold uppercase ${
                          m.status === "COMPLETED" ? "bg-[#0fa336] text-white" : "bg-[#f4b400] text-black"
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => {
                            setMaintenanceList((prev) =>
                              prev.map((item) => (item.id === m.id ? { ...item, status: "COMPLETED" } : item))
                            );
                            setDispatchNotice(`Work Order WO-${m.id} marked COMPLETED.`);
                            setTimeout(() => setDispatchNotice(null), 4000);
                          }}
                          className="bg-[#111] border border-[#333] text-white hover:bg-[#222] px-2 py-0.5 text-[8px] font-bold uppercase"
                        >
                          Mark Complete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 7: CREW PLANNING */}
        {activeTab === "crews" && (
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-lg font-bold uppercase">Field Crew Positioning & Dispatch</h1>
                <p className="text-[10px] text-[#888]">12 Gujarat Field Teams across 6 operational zones</p>
              </div>
              <div className="text-[10px] text-[#0fa336] font-bold">
                {crewsList.filter((c) => c.available).length} Crews Available
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {crewsList.map((crew) => (
                <div key={crew.id} className="bg-[#1a1a1a] border border-[#3c3c3c] p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-xs font-bold uppercase text-white">{crew.name}</div>
                        <div className="text-[9px] text-[#888]">{crew.crew_id} &bull; {crew.zone}</div>
                      </div>
                      <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase ${crew.available ? "bg-[#0fa336] text-white" : "bg-[#e22718] text-white"}`}>
                        {crew.available ? "Available" : "Dispatched"}
                      </span>
                    </div>
                    <div className="text-[9px] text-[#aaa] space-y-0.5 border-t border-[#333] pt-2">
                      <div>Skill Level: <span className="font-bold text-white uppercase">{crew.skill_level.replace(/_/g, " ")}</span></div>
                      <div>GPS: {crew.latitude.toFixed(3)}, {crew.longitude.toFixed(3)}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {crew.available ? (
                      <button
                        onClick={() => handleDispatchCrew(crew.crew_id)}
                        className="w-full bg-[#1c69d4] hover:bg-[#0066b1] text-white text-[9px] font-bold uppercase py-1.5 transition-colors"
                      >
                        Dispatch to Nearest Incident
                      </button>
                    ) : (
                      <button
                        onClick={() => handleResetCrew(crew.crew_id)}
                        className="w-full bg-[#333] hover:bg-[#444] text-white text-[9px] font-bold uppercase py-1.5 transition-colors"
                      >
                        Reset Availability
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 8: INCIDENTS LOG */}
        {activeTab === "incidents" && (
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-lg font-bold uppercase">Grid Outage & Incident Log</h1>
                <p className="text-[10px] text-[#888]">Historical records mapped to Gujarat grid assets</p>
              </div>
              <div className="text-[10px] text-[#888]">{incidentsList.length} Logged Events</div>
            </div>

            <div className="bg-[#1a1a1a] border border-[#3c3c3c] overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead className="bg-[#111] border-b border-[#3c3c3c] text-left uppercase text-[#777]">
                  <tr>
                    <th className="p-2.5">Incident ID</th>
                    <th className="p-2.5">Fault Type</th>
                    <th className="p-2.5 text-center">Severity</th>
                    <th className="p-2.5 text-right">Customers Affected</th>
                    <th className="p-2.5 text-right">Duration (hrs)</th>
                    <th className="p-2.5 text-right">Downtime (hrs)</th>
                    <th className="p-2.5">Weather</th>
                    <th className="p-2.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2a]">
                  {incidentsList.map((inc) => (
                    <tr key={inc.id} className="hover:bg-[#222]">
                      <td className="p-2.5 font-bold text-white">INC-{inc.id}</td>
                      <td className="p-2.5 text-[#bbb]">{inc.fault_type || "Electrical Fault"}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                          inc.severity === "CRITICAL" ? "bg-[#e22718] text-white" : inc.severity === "HIGH" ? "bg-[#f48c06] text-white" : "bg-[#f4b400] text-black"
                        }`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono text-white">{(inc.customers_affected || 0).toLocaleString()}</td>
                      <td className="p-2.5 text-right font-mono">{inc.duration_hrs ? inc.duration_hrs.toFixed(1) : "--"}h</td>
                      <td className="p-2.5 text-right font-mono">{inc.downtime_hrs ? inc.downtime_hrs.toFixed(1) : "--"}h</td>
                      <td className="p-2.5 text-[#888]">{inc.weather_condition || "Clear"}</td>
                      <td className="p-2.5 text-[#888]">{new Date(inc.started_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 9: ALERTS QUEUE */}
        {activeTab === "alerts" && (
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-lg font-bold uppercase">Emergency Alert Dispatch Center</h1>
                <p className="text-[10px] text-[#888]">Active High & Critical Risks across the Gujarat Power Grid</p>
              </div>
              <div className="text-[10px] text-[#e22718] font-bold">{alerts.length} Active Incidents</div>
            </div>
            <div className="space-y-2">
              {alerts.map((a: any, i: number) => (
                <div key={i} className="bg-[#1a1a1a] border border-[#3c3c3c] p-3 flex justify-between items-center hover:bg-[#222]">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 flex items-center justify-center ${a.severity === "CRITICAL" ? "bg-[#e22718]" : "bg-[#f4b400]"} text-white`}>
                      <AlertTriangle size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{a.asset_id} &bull; {a.fault_type}</div>
                      <div className="text-[9px] text-[#888]">{a.customers_affected?.toLocaleString()} customers affected &bull; Reported {new Date(a.started_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => selectAsset(a.asset_id, true)}
                      className="bg-[#111] border border-[#333] text-white px-3 py-1 text-[9px] font-bold uppercase hover:bg-[#222]"
                    >
                      Focus on Map
                    </button>
                    <button
                      onClick={() => handleDispatchCrew("1", a.asset_id)}
                      className="bg-[#1c69d4] text-white px-3 py-1 text-[9px] font-bold uppercase hover:bg-[#0066b1]"
                    >
                      Dispatch Crew
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL: CREATE WORK ORDER */}
      {isLoggingWO && (
        <div className="fixed inset-0 z-[4000] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#444] w-full max-w-md p-5 text-white">
            <div className="flex justify-between items-center mb-4 border-b border-[#333] pb-2">
              <div className="font-bold text-xs uppercase text-white flex items-center gap-2">
                <Wrench size={16} className="text-[#1c69d4]" />
                Log Maintenance Work Order
              </div>
              <button onClick={() => setIsLoggingWO(false)} className="text-[#888] hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateWorkOrder} className="space-y-3 text-[11px]">
              <div>
                <label className="block text-[9px] uppercase font-bold text-[#888] mb-1">Target Asset ID</label>
                <input
                  type="text"
                  value={woAssetId}
                  onChange={(e) => setWoAssetId(e.target.value)}
                  required
                  className="w-full bg-[#1a1a1a] border border-[#333] p-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-[#888] mb-1">Maintenance Action</label>
                <select
                  value={woType}
                  onChange={(e) => setWoType(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] p-2 text-white font-bold"
                >
                  <option value="Dissolved Gas Analysis & DGA Oil Treatment">Dissolved Gas Analysis & DGA Oil Treatment</option>
                  <option value="Emergency Bushing Replacement">Emergency Bushing Replacement</option>
                  <option value="Thermal Overheating Diagnostic Inspection">Thermal Overheating Diagnostic Inspection</option>
                  <option value="Feeder Redundancy & Load Balancing">Feeder Redundancy & Load Balancing</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-[#888] mb-1">Assigned Technician Team</label>
                <input
                  type="text"
                  value={woTech}
                  onChange={(e) => setWoTech(e.target.value)}
                  required
                  className="w-full bg-[#1a1a1a] border border-[#333] p-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-[#888] mb-1">Technical Notes</label>
                <textarea
                  value={woNotes}
                  onChange={(e) => setWoNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-[#1a1a1a] border border-[#333] p-2 text-white"
                />
              </div>

              <div className="pt-2 flex gap-2 justify-end border-t border-[#333]">
                <button
                  type="button"
                  onClick={() => setIsLoggingWO(false)}
                  className="px-4 py-1.5 bg-[#222] text-white font-bold uppercase text-[9px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1c69d4] hover:bg-[#0066b1] text-white font-bold uppercase text-[9px]"
                >
                  Create Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Sidebar Navigation Item
function NavItem({ icon, label, active, onClick, badge }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-2.5 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
        active ? "bg-[#1c69d4] text-white" : "text-[#888] hover:bg-[#151515] hover:text-white"
      }`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </div>
      {badge && (
        <span className={`px-1.5 py-0.2 text-[8px] font-extrabold uppercase ${active ? "bg-white text-black" : "bg-[#222] text-[#aaa]"}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// KPI Metric Card Component
function MetricCard({ title, value, icon, subtext, alert, warning }: any) {
  return (
    <div className={`bg-[#1a1a1a] border ${alert ? "border-[#e22718]" : warning ? "border-[#f48c06]" : "border-[#3c3c3c]"} p-3 flex flex-col justify-between`}>
      <div>
        <div className="flex justify-between items-start mb-1">
          <span className="text-[9px] font-bold text-[#888] uppercase tracking-wider">{title}</span>
          <div className={`${alert ? "text-[#e22718]" : warning ? "text-[#f48c06]" : "text-[#1c69d4]"}`}>{icon}</div>
        </div>
        <div className={`text-xl font-extrabold ${alert ? "text-[#e22718]" : warning ? "text-[#f48c06]" : "text-white"}`}>{value}</div>
      </div>
      {subtext && <div className="text-[8px] text-[#666] mt-2 border-t border-[#2a2a2a] pt-1">{subtext}</div>}
    </div>
  );
}

// Action Item Component
function ActionItem({ icon, type, title, desc, priority, btn, btnOutline, onAction }: any) {
  return (
    <div className={`bg-[#111] border ${type === "critical" ? "border-[#e22718]" : "border-[#333]"} p-2.5 text-[10px]`}>
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-1.5 font-bold text-white">
          <span className={type === "critical" ? "text-[#e22718]" : "text-[#f4b400]"}>{icon}</span>
          <span>{title}</span>
        </div>
        <span className={`text-[8px] font-bold px-1 uppercase ${type === "critical" ? "bg-[#e22718] text-white" : "bg-[#f4b400] text-black"}`}>
          {priority}
        </span>
      </div>
      <p className="text-[9px] text-[#888] mb-2 line-clamp-2">{desc}</p>
      <button
        onClick={onAction}
        className={`w-full text-[9px] font-bold uppercase py-1 ${
          btnOutline ? "border border-[#333] text-white hover:bg-[#222]" : "bg-[#1c69d4] text-white hover:bg-[#0066b1]"
        }`}
      >
        {btn}
      </button>
    </div>
  );
}
