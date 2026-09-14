"use client";

import React, { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

const MAPTILER_KEY = "CRFoY3RXgAloQLarTcRL";

// Tile Styles
const TILE_STYLES: Record<string, { name: string; url: string; subdomains?: string[] }> = {
  dataviz: {
    name: "Dark SCADA",
    url: `https://api.maptiler.com/maps/dataviz-dark/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
  },
  hybrid: {
    name: "Satellite Hybrid",
    url: `https://api.maptiler.com/maps/hybrid/256/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`,
  },
  streets: {
    name: "Highways & Grid",
    url: `https://api.maptiler.com/maps/streets-v2-dark/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
  },
};

const riskColor: Record<string, string> = {
  CRITICAL: "#e22718",
  HIGH: "#f48c06",
  MEDIUM: "#f4b400",
  LOW: "#0fa336",
};

interface GridMapProps {
  markers: Array<{
    asset_id: string;
    asset_type?: string;
    name?: string;
    latitude: number;
    longitude: number;
    risk_level: string;
    overall_risk_score?: number;
    customers_served?: number;
    voltage_kv?: number;
    capacity_mva?: number;
    district?: string;
  }>;
  selectedAssetId?: string;
  onSelectAsset?: (assetId: string) => void;
}

export default function GridMap({
  markers = [],
  selectedAssetId,
  onSelectAsset,
}: GridMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const linesLayerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const [currentStyle, setCurrentStyle] = useState<string>("dataviz");
  const [showPowerLines, setShowPowerLines] = useState<boolean>(true);

  const onSelectRef = useRef(onSelectAsset);
  onSelectRef.current = onSelectAsset;

  const selectedRef = useRef(selectedAssetId);
  selectedRef.current = selectedAssetId;

  // Initialize Map safely (fixing "Map container is already initialized" error)
  useEffect(() => {
    if (!containerRef.current) return;

    // Destroy existing leaflet instance attached to DOM element
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
        center: [22.8, 71.5], // Gujarat Geographical Center
        zoom: 7.5,
        minZoom: 6,
        maxZoom: 18,
        zoomControl: true,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      // Base Tile Layer with Carto Dark fallback
      const baseTile = L.tileLayer(TILE_STYLES[currentStyle].url, {
        maxZoom: 19,
        tileSize: 256,
        errorTileUrl: "https://a.basemaps.cartocdn.com/dark_all/0/0/0.png",
      }).addTo(map);

      tileLayerRef.current = baseTile;

      baseTile.on("tileerror", () => {
        baseTile.setUrl("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png");
      });

      // Layer for Transmission Lines
      const linesGroup = L.layerGroup().addTo(map);
      linesLayerRef.current = linesGroup;

      // Layer for Equipment Markers
      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;

      // Render assets and interconnecting transmission grid lines
      renderMapContent(L, markersGroup, linesGroup, markers, selectedRef.current, showPowerLines);

      // Invalidate layout dimensions safely
      setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 250);

      const handleResize = () => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      };
      window.addEventListener("resize", handleResize);
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
  }, []);

  // Switch Tile Theme (Satellite Hybrid vs Dark SCADA)
  const changeTileStyle = (styleKey: string) => {
    setCurrentStyle(styleKey);
    if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(TILE_STYLES[styleKey].url);
    }
  };

  // Render Markers & Grid Interconnect Lines
  const renderMapContent = (
    L: any,
    markersGroup: any,
    linesGroup: any,
    items: typeof markers,
    selectedId?: string,
    drawLines = true
  ) => {
    if (!markersGroup || !linesGroup) return;
    markersGroup.clearLayers();
    linesGroup.clearLayers();

    if (!items || items.length === 0) return;

    // 1. Separate Substations / Power Plants for Transmission Interconnects
    const substations = items.filter(
      (a) =>
        a.asset_type === "substation" ||
        a.asset_type === "power_plant" ||
        a.asset_id.startsWith("SS-") ||
        a.asset_id.startsWith("PP-")
    );

    // 2. Draw High Voltage Grid Transmission Lines between Substations
    if (drawLines && substations.length > 1) {
      // Connect geographically nearest substations to simulate GETCO 400kV / 220kV Grid
      for (let i = 0; i < substations.length; i++) {
        const s1 = substations[i];
        if (!s1.latitude || !s1.longitude) continue;

        // Find 2 nearest neighbors
        const neighbors = substations
          .filter((_, idx) => idx !== i)
          .map((s2) => ({
            s2,
            dist: Math.hypot(s1.latitude - s2.latitude, s1.longitude - s2.longitude),
          }))
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 2);

        neighbors.forEach(({ s2, dist }) => {
          if (dist < 1.8) {
            // Draw transmission line
            const line = L.polyline(
              [
                [s1.latitude, s1.longitude],
                [s2.latitude, s2.longitude],
              ],
              {
                color: "#1c69d4",
                weight: 1.5,
                opacity: 0.45,
                dashArray: "4, 6",
              }
            );
            linesGroup.addLayer(line);
          }
        });
      }
    }

    // 3. Render Custom Industrial Markers
    items.forEach((asset) => {
      if (!asset.latitude || !asset.longitude) return;

      const risk = (asset.risk_level || "MEDIUM").toUpperCase();
      const color = riskColor[risk] || riskColor.MEDIUM;
      const isSelected = selectedId === asset.asset_id;
      const isPowerPlant = asset.asset_type === "power_plant" || asset.asset_id.startsWith("PP-");
      const isSubstation = asset.asset_type === "substation" || asset.asset_id.startsWith("SS-");
      const isCritical = risk === "CRITICAL";

      // Distinct geometry: Power Plant (large star/hex), Substation (diamond), Transformer (circle)
      let shapeStyles = "border-radius: 50%;";
      let size = isSelected ? 20 : 11;
      let symbolText = "";

      if (isPowerPlant) {
        shapeStyles = "border-radius: 3px; transform: rotate(0deg);";
        size = isSelected ? 24 : 16;
        symbolText = "⚡";
      } else if (isSubstation) {
        shapeStyles = "border-radius: 2px; transform: rotate(45deg);";
        size = isSelected ? 20 : 13;
      }

      const html = `
        <div class="custom-grid-marker ${isCritical ? "marker-critical-pulse" : ""} ${isSelected ? "marker-selected" : ""}" 
             style="width: ${size}px; height: ${size}px; background: ${color}; ${shapeStyles} 
                    border: ${isSelected ? "3px solid #ffffff" : "2px solid rgba(255,255,255,0.9)"}; 
                    box-shadow: 0 0 ${isSelected ? "18px" : isPowerPlant ? "12px" : "6px"} ${color}; 
                    display: flex; align-items: center; justify-content: center; font-size: 9px; cursor: pointer;">
          ${symbolText}
        </div>
      `;

      const icon = L.divIcon({
        className: "leaflet-grid-div-icon",
        html: html,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([asset.latitude, asset.longitude], { icon: icon });

      // Technical Inspector Popup
      const popupHtml = `
        <div style="background: #0d0d0d; color: #fff; padding: 12px 14px; font-family: Inter, sans-serif; font-size: 11px; border: 1px solid #3c3c3c; min-width: 170px; box-shadow: 0 12px 32px rgba(0,0,0,0.9);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
            <span style="font-weight: 800; font-size: 13px; color: #fff; letter-spacing: 0.04em;">${asset.asset_id}</span>
            <span style="background: ${color}; color: #fff; font-weight: 800; font-size: 8px; padding: 2px 5px; text-transform: uppercase;">${risk}</span>
          </div>
          <div style="color: #888; font-size: 9px; text-transform: uppercase; margin-bottom: 6px;">
            ${isPowerPlant ? "🏭 Power Generation Station" : isSubstation ? "⚡ GETCO Substation" : "🔌 Distribution Transformer"}
          </div>
          <div style="color: #bbb; font-size: 10px; margin-bottom: 6px; border-bottom: 1px solid #222; padding-bottom: 4px;">
            ${asset.name || "Gujarat Power Grid"} &bull; ${asset.district || "Gujarat"}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 9px; color: #aaa; margin-bottom: 6px;">
            <div>Capacity: <b style="color:#fff">${asset.capacity_mva || 40} MVA</b></div>
            <div>Voltage: <b style="color:#fff">${asset.voltage_kv || 66} kV</b></div>
            <div>Risk Score: <b style="color:${color}">${Math.round(asset.overall_risk_score || 50)}%</b></div>
            <div>Customers: <b style="color:#fff">${(asset.customers_served || 0).toLocaleString()}</b></div>
          </div>
          <div style="font-size: 8px; color: #1c69d4; font-weight: 800; text-transform: uppercase; text-align: center; border-top: 1px solid #222; padding-top: 5px; cursor: pointer;">
            Click to focus & inspect &rarr;
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        offset: [0, -size / 2],
        closeButton: false,
        className: "custom-leaflet-popup",
      });

      marker.on("click", () => {
        lastCenteredAssetIdRef.current = null;
        if (onSelectRef.current) {
          onSelectRef.current(asset.asset_id);
        }
      });

      marker.on("popupopen", (e: any) => {
        const popupNode = e.popup?.getElement();
        if (popupNode) {
          popupNode.style.cursor = "pointer";
          popupNode.onclick = (evt: MouseEvent) => {
            evt.stopPropagation();
            lastCenteredAssetIdRef.current = null;
            if (onSelectRef.current) {
              onSelectRef.current(asset.asset_id);
            }
          };
        }
      });

      marker.on("mouseover", function (this: any) {
        this.openPopup();
      });

      markersGroup.addLayer(marker);
    });
  };

  const lastCenteredAssetIdRef = useRef<string | null>(null);

  // Update markers when props change and fly to selected asset ONLY when selection changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    import("leaflet").then((leafletModule) => {
      const L = leafletModule.default || leafletModule;
      renderMapContent(L, markersLayerRef.current, linesLayerRef.current, markers, selectedAssetId, showPowerLines);

      if (
        selectedAssetId &&
        selectedAssetId !== lastCenteredAssetIdRef.current &&
        markers &&
        markers.length > 0
      ) {
        lastCenteredAssetIdRef.current = selectedAssetId;
        const target = markers.find((m) => m.asset_id === selectedAssetId);
        if (target && target.latitude && target.longitude) {
          mapInstanceRef.current.flyTo([target.latitude, target.longitude], 11.5, {
            animate: true,
            duration: 1.2,
          });
        }
      }
    });
  }, [markers, selectedAssetId, showPowerLines]);

  return (
    <div className="w-full h-full relative bg-[#0a0a0a] overflow-hidden" style={{ minHeight: "100%", width: "100%" }}>
      <style jsx global>{`
        @keyframes criticalPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(226, 39, 24, 0.9), 0 0 8px #e22718;
          }
          70% {
            box-shadow: 0 0 0 14px rgba(226, 39, 24, 0), 0 0 12px #e22718;
          }
          100% {
            box-shadow: 0 0 0 0 rgba(226, 39, 24, 0), 0 0 8px #e22718;
          }
        }
        .marker-critical-pulse {
          animation: criticalPulse 1.8s infinite !important;
        }
        .marker-selected {
          transform: scale(1.4) !important;
          z-index: 1000 !important;
        }
        .leaflet-grid-div-icon {
          background: transparent !important;
          border: none !important;
        }
        .custom-leaflet-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          padding: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
        .custom-leaflet-popup .leaflet-popup-content {
          margin: 0 !important;
          line-height: normal !important;
        }
        .custom-leaflet-popup .leaflet-popup-tip {
          background: #0d0d0d !important;
          border: 1px solid #3c3c3c !important;
        }
        .leaflet-container {
          background: #0a0a0a !important;
          font-family: inherit !important;
        }
      `}</style>

      {/* Floating Modern Map Controls (Satellite vs Dark SCADA + Transmission Lines Toggle) */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2 bg-[#0c0c0c]/90 border border-[#3c3c3c] p-1.5 backdrop-blur-md">
        <span className="text-[9px] text-[#888] font-bold uppercase px-1">Layers:</span>
        <button
          onClick={() => changeTileStyle("dataviz")}
          className={`px-2 py-1 text-[9px] font-bold uppercase transition-colors ${
            currentStyle === "dataviz" ? "bg-[#1c69d4] text-white" : "bg-[#1a1a1a] text-[#888] hover:text-white"
          }`}
        >
          🌑 Dark SCADA
        </button>
        <button
          onClick={() => changeTileStyle("hybrid")}
          className={`px-2 py-1 text-[9px] font-bold uppercase transition-colors ${
            currentStyle === "hybrid" ? "bg-[#1c69d4] text-white" : "bg-[#1a1a1a] text-[#888] hover:text-white"
          }`}
        >
          🛰️ Satellite Aerial
        </button>
        <button
          onClick={() => changeTileStyle("streets")}
          className={`px-2 py-1 text-[9px] font-bold uppercase transition-colors ${
            currentStyle === "streets" ? "bg-[#1c69d4] text-white" : "bg-[#1a1a1a] text-[#888] hover:text-white"
          }`}
        >
          🗺️ Highways
        </button>
        <button
          onClick={() => setShowPowerLines(!showPowerLines)}
          className={`px-2 py-1 text-[9px] font-bold uppercase border border-[#333] transition-colors ${
            showPowerLines ? "bg-[#0066b1]/30 text-[#1c69d4] border-[#1c69d4]" : "text-[#666]"
          }`}
        >
          ⚡ Grid Lines: {showPowerLines ? "ON" : "OFF"}
        </button>
      </div>

      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
      />
    </div>
  );
}
