"use client";

import React, { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

// Read from NEXT_PUBLIC_MAPTILER_KEY env var; fall back to OpenStreetMap when absent.
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || "CRFoY3RXgAloQLarTcRL";

const OSM_FALLBACK = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function buildTileUrl(style: string): string {
  if (!MAPTILER_KEY) return OSM_FALLBACK;
  const urls: Record<string, string> = {
    dataviz: `https://api.maptiler.com/maps/dataviz-dark/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
    streets: `https://api.maptiler.com/maps/streets-v2-dark/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
  };
  return urls[style] || OSM_FALLBACK;
}

// Tile style display names (Satellite View removed per requirements)
const TILE_STYLES: Record<string, string> = {
  dataviz: "🌑 Dark SCADA",
  streets: "🗺️ Highway Grid",
};

const riskColor: Record<string, string> = {
  CRITICAL: "#e22718",
  HIGH:     "#f48c06",
  MEDIUM:   "#f4b400",
  LOW:      "#0fa336",
};

export interface GridMapMarker {
  asset_id: string;
  asset_type?: string;
  name?: string;
  latitude: number;
  longitude: number;
  risk_level: string;
  overall_risk_score?: number;
  failure_probability?: number;
  customers_served?: number;
  voltage_kv?: number;
  capacity_mva?: number;
  district?: string;
}

interface GridMapProps {
  markers: GridMapMarker[];
  selectedAssetId?: string;
  onSelectAsset?: (assetId: string) => void;
  onInspectAsset?: (assetId: string) => void;
}

export default function GridMap({
  markers = [],
  selectedAssetId,
  onSelectAsset,
  onInspectAsset,
}: GridMapProps) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const mapInstanceRef  = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const linesLayerRef   = useRef<any>(null);
  const tileLayerRef    = useRef<any>(null);
  const lastCenteredRef = useRef<string | null>(null);

  const [currentStyle, setCurrentStyle]     = useState<string>("dataviz");
  const [showPowerLines, setShowPowerLines] = useState<boolean>(true);

  // Keep callbacks in refs so marker event closures never go stale
  const onSelectRef  = useRef(onSelectAsset);
  const onInspectRef = useRef(onInspectAsset);
  onSelectRef.current  = onSelectAsset;
  onInspectRef.current = onInspectAsset;

  const selectedRef = useRef(selectedAssetId);
  selectedRef.current = selectedAssetId;

  // ── Map Initialisation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    if ((containerRef.current as any)._leaflet_id != null) {
      (containerRef.current as any)._leaflet_id = null;
    }

    let isMounted = true;

    import("leaflet").then((leafletModule) => {
      if (!isMounted || !containerRef.current) return;
      const L = leafletModule.default || leafletModule;
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const map = L.map(containerRef.current, {
        center:        [22.8, 71.5],
        zoom:          7.5,
        minZoom:       6,
        maxZoom:       18,
        zoomControl:   true,
        attributionControl: false,
      });
      mapInstanceRef.current = map;

      // Tile layer — fall back to Carto dark on 403/tile error
      const tileUrl = buildTileUrl(currentStyle);
      const tileOpts: any = { maxZoom: 19, tileSize: 256 };
      if (!MAPTILER_KEY) tileOpts.subdomains = "abcd";
      const tile = L.tileLayer(tileUrl, tileOpts).addTo(map);
      tileLayerRef.current = tile;

      tile.on("tileerror", () => {
        if (tileLayerRef.current) {
          tileLayerRef.current.setUrl(OSM_FALLBACK);
          (tileLayerRef.current as any).options.subdomains = "abc";
        }
      });

      const linesGroup   = L.layerGroup().addTo(map);
      const markersGroup = L.layerGroup().addTo(map);
      linesLayerRef.current   = linesGroup;
      markersLayerRef.current = markersGroup;

      renderMapContent(L, markersGroup, linesGroup, markers, selectedRef.current, showPowerLines);

      setTimeout(() => map.invalidateSize(), 250);
      window.addEventListener("resize", () => map.invalidateSize());
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (containerRef.current) {
        (containerRef.current as any)._leaflet_id = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tile style switch ───────────────────────────────────────────────────────
  const changeTileStyle = (styleKey: string) => {
    setCurrentStyle(styleKey);
    if (tileLayerRef.current) {
      const url = MAPTILER_KEY ? buildTileUrl(styleKey) : OSM_FALLBACK;
      tileLayerRef.current.setUrl(url);
    }
  };

  // ── Marker + line rendering ─────────────────────────────────────────────────
  const renderMapContent = (
    L: any,
    markersGroup: any,
    linesGroup: any,
    items: GridMapMarker[],
    selectedId?: string,
    drawLines = true,
  ) => {
    if (!markersGroup || !linesGroup) return;
    markersGroup.clearLayers();
    linesGroup.clearLayers();
    if (!items || items.length === 0) return;

    // Transmission grid lines between substations / power plants
    const nodes = items.filter(
      (a) =>
        a.asset_type === "substation" ||
        a.asset_type === "power_plant" ||
        a.asset_id.startsWith("SS-") ||
        a.asset_id.startsWith("PP-"),
    );

    if (drawLines && nodes.length > 1) {
      for (let i = 0; i < nodes.length; i++) {
        const s1 = nodes[i];
        if (!s1.latitude || !s1.longitude) continue;
        const neighbours = nodes
          .filter((_, idx) => idx !== i)
          .map((s2) => ({
            s2,
            dist: Math.hypot(s1.latitude - s2.latitude, s1.longitude - s2.longitude),
          }))
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 2);

        neighbours.forEach(({ s2, dist }) => {
          if (dist < 1.8) {
            L.polyline(
              [[s1.latitude, s1.longitude], [s2.latitude, s2.longitude]],
              { color: "#1c69d4", weight: 1.5, opacity: 0.4, dashArray: "4 6" },
            ).addTo(linesGroup);
          }
        });
      }
    }

    // Individual equipment markers
    items.forEach((asset) => {
      if (!asset.latitude || !asset.longitude) return;

      const risk       = (asset.risk_level || "MEDIUM").toUpperCase();
      const color      = riskColor[risk] || riskColor.MEDIUM;
      const isSelected = selectedId === asset.asset_id;
      const isPP       = asset.asset_type === "power_plant" || asset.asset_id.startsWith("PP-");
      const isSS       = asset.asset_type === "substation"  || asset.asset_id.startsWith("SS-");
      const isCritical = risk === "CRITICAL";

      let shape    = "border-radius:50%;";
      let size     = isSelected ? 20 : 11;
      let symbol   = "";

      if (isPP) {
        shape  = "border-radius:3px;";
        size   = isSelected ? 24 : 16;
        symbol = "⚡";
      } else if (isSS) {
        shape  = "border-radius:2px;transform:rotate(45deg);";
        size   = isSelected ? 20 : 13;
      }

      const iconHtml = `
        <div class="cgm ${isCritical ? "cgm-pulse" : ""} ${isSelected ? "cgm-sel" : ""}"
             style="width:${size}px;height:${size}px;background:${color};${shape}
                    border:${isSelected ? "3px solid #fff" : "2px solid rgba(255,255,255,0.9)"};
                    box-shadow:0 0 ${isSelected ? 18 : isPP ? 12 : 6}px ${color};
                    display:flex;align-items:center;justify-content:center;
                    font-size:9px;cursor:pointer;">
          ${symbol}
        </div>`;

      const icon = L.divIcon({
        className:  "cgm-wrap",
        html:       iconHtml,
        iconSize:   [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([asset.latitude, asset.longitude], { icon });

      // ── Popup content with Inspect + Dispatch buttons ─────────────────────
      const failPct   = asset.failure_probability != null
        ? Math.round(asset.failure_probability * 100)
        : Math.round(asset.overall_risk_score || 50);
      const custCount = (asset.customers_served || 0).toLocaleString();
      const assetType = isPP
        ? "Power Generation Station"
        : isSS
        ? "GETCO Substation"
        : "Distribution Transformer";

      const popupHtml = `
        <div style="background:#0d0d0d;color:#fff;padding:12px 14px;
                    font-family:Inter,sans-serif;font-size:11px;
                    border:1px solid #3c3c3c;min-width:200px;
                    box-shadow:0 12px 32px rgba(0,0,0,0.9);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">
            <span style="font-weight:800;font-size:13px;color:#fff;">${asset.asset_id}</span>
            <span style="background:${color};color:#fff;font-weight:800;font-size:8px;padding:2px 5px;text-transform:uppercase;">${risk}</span>
          </div>
          <div style="color:#888;font-size:9px;text-transform:uppercase;margin-bottom:6px;">${assetType}</div>
          <div style="color:#bbb;font-size:10px;margin-bottom:6px;border-bottom:1px solid #222;padding-bottom:4px;">
            ${asset.name || "Gujarat Power Grid"} &bull; ${asset.district || "Gujarat"}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;color:#aaa;margin-bottom:8px;">
            <div>Capacity: <b style="color:#fff">${asset.capacity_mva || 40} MVA</b></div>
            <div>Voltage: <b style="color:#fff">${asset.voltage_kv || 66} kV</b></div>
            <div>Failure Risk: <b style="color:${color}">${failPct}%</b></div>
            <div>Customers: <b style="color:#fff">${custCount}</b></div>
          </div>
          <div style="display:flex;gap:6px;">
            <button
              data-action="inspect"
              data-id="${asset.asset_id}"
              style="flex:1;background:#1c69d4;color:#fff;border:none;cursor:pointer;
                     font-size:9px;font-weight:800;text-transform:uppercase;padding:5px 0;">
              🔍 Inspect
            </button>
            <button
              data-action="select"
              data-id="${asset.asset_id}"
              style="flex:1;background:#333;color:#fff;border:1px solid #555;cursor:pointer;
                     font-size:9px;font-weight:800;text-transform:uppercase;padding:5px 0;">
              Focus
            </button>
          </div>
        </div>`;

      marker.bindPopup(popupHtml, {
        offset:      [0, -(size / 2)],
        closeButton: false,
        className:   "cgm-popup",
      });

      // Wire popup button clicks via delegated handler on popup element
      marker.on("popupopen", (e: any) => {
        const el = e.popup?.getElement();
        if (!el) return;
        el.addEventListener("click", (evt: MouseEvent) => {
          const btn = (evt.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
          if (!btn) return;
          const action = btn.dataset.action;
          const id     = btn.dataset.id || asset.asset_id;
          if (action === "inspect" && onInspectRef.current) {
            onInspectRef.current(id);
          } else if (action === "select" && onSelectRef.current) {
            lastCenteredRef.current = null; // explicit focus centers the map
            onSelectRef.current(id);
          }
        });
      });

      marker.on("click", () => {
        if (onSelectRef.current) onSelectRef.current(asset.asset_id);
      });

      marker.on("mouseover", function (this: any) { this.openPopup(); });

      markersGroup.addLayer(marker);
    });
  };

  // ── Re-render markers whenever data/selection changes ──────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    import("leaflet").then((leafletModule) => {
      const L = leafletModule.default || leafletModule;
      renderMapContent(
        L,
        markersLayerRef.current,
        linesLayerRef.current,
        markers,
        selectedAssetId,
        showPowerLines,
      );

      if (
        selectedAssetId &&
        selectedAssetId !== lastCenteredRef.current &&
        markers.length > 0
      ) {
        lastCenteredRef.current = selectedAssetId;
        const target = markers.find((m) => m.asset_id === selectedAssetId);
        if (target?.latitude && target?.longitude) {
          mapInstanceRef.current.flyTo([target.latitude, target.longitude], 11.5, {
            animate: true, duration: 1.2,
          });
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, selectedAssetId, showPowerLines]);

  // ── Legend items ────────────────────────────────────────────────────────────
  const legendItems = [
    { label: "Critical", color: riskColor.CRITICAL },
    { label: "High",     color: riskColor.HIGH },
    { label: "Medium",   color: riskColor.MEDIUM },
    { label: "Low",      color: riskColor.LOW },
  ];

  return (
    <div className="w-full h-full relative bg-[#edebe9] overflow-hidden">
      {/* ── Global marker CSS ───────────────────────────────────────────── */}
      <style jsx global>{`
        @keyframes cgmPulse {
          0%   { box-shadow: 0 0 0 0   rgba(226,39,24,0.9), 0 0 8px #e22718; }
          70%  { box-shadow: 0 0 0 14px rgba(226,39,24,0),   0 0 12px #e22718; }
          100% { box-shadow: 0 0 0 0   rgba(226,39,24,0),   0 0 8px #e22718; }
        }
        .cgm-pulse { animation: cgmPulse 1.8s infinite !important; }
        .cgm-sel   { transform: scale(1.4) !important; z-index: 1000 !important; }
        .cgm-wrap  { background: transparent !important; border: none !important; }
        .cgm-popup .leaflet-popup-content-wrapper {
          background: transparent !important; padding: 0 !important;
          border-radius: 0 !important; box-shadow: none !important;
        }
        .cgm-popup .leaflet-popup-content { margin: 0 !important; line-height: normal !important; }
        .cgm-popup .leaflet-popup-tip { background: #0d0d0d !important; border: 1px solid #3c3c3c !important; }
        .leaflet-container { background: #0a0a0a !important; font-family: inherit !important; }
      `}</style>

      {/* ── Layer switcher ──────────────────────────────────────────────── */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 bg-[#0c0c0c]/90 border border-[#3c3c3c] p-1.5 backdrop-blur-md shadow-lg">
        <span className="text-[9px] text-white font-bold uppercase px-1">Layers:</span>
        {Object.entries(TILE_STYLES).map(([key, label]) => (
          <button
            key={key}
            onClick={() => changeTileStyle(key)}
            className={`px-2 py-1 rounded-full transform active:scale-[0.95] transition-all duration-200 ease-out text-[9px] font-bold uppercase transition-colors ${
              currentStyle === key
                ? "bg-[#00754A] text-white"
                : "bg-[#ffffff] text-black/87 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setShowPowerLines(!showPowerLines)}
          className={`px-2 py-1 rounded-full transform active:scale-[0.95] transition-all duration-200 ease-out text-[9px] font-bold uppercase border transition-colors ${
            showPowerLines
              ? "bg-[#0066b1]/30 text-[#00754A] border-[#00754A]"
              : "bg-[#ffffff] text-[#666] border-[#edebe9]"
          }`}
        >
          ⚡ Grid {showPowerLines ? "ON" : "OFF"}
        </button>
      </div>

      {/* ── Status legend ───────────────────────────────────────────────── */}
      <div className="absolute bottom-4 left-3 z-[1000] bg-[#0c0c0c]/90 border border-[#3c3c3c] p-2 backdrop-blur-md flex flex-col gap-1 shadow-lg">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: item.color }}
            />
            <span className="text-[9px] text-white font-extrabold uppercase tracking-wider">{item.label}</span>
          </div>
        ))}
      </div>

      {/* ── Leaflet mount point ─────────────────────────────────────────── */}
      <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
    </div>
  );
}
