'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { AIRPORTS, FLIGHTS, type Airport, type Flight } from '@/lib/data/dataset';
import { timeToMins, minsToTime, type SimulationResultJSON } from '@/lib/simulation/engine';
import 'leaflet/dist/leaflet.css';

interface FlightMapProps {
  simulationResult: SimulationResultJSON | null;
  onSelectAirport: (airportId: string | null) => void;
  selectedAirport: string | null;
  currentTime: string; // "HH:MM"
  showWeather: boolean;
  filterMode: 'all' | 'delayed' | 'inflight';
}

export default function FlightMap({
  simulationResult,
  onSelectAirport,
  selectedAirport,
  currentTime,
  showWeather,
  filterMode,
}: FlightMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const [LState, setLState] = useState<any>(null);

  // Load Leaflet dynamically on client
  useEffect(() => {
    let isMounted = true;
    import('leaflet').then((leaflet) => {
      if (isMounted) {
        setLState(leaflet.default || leaflet);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!LState || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = LState;
    // Center of India (lat: 21.0, lng: 78.5), zoom level 5
    const map = L.map(mapContainerRef.current, {
      center: [21.5, 79.0],
      zoom: 5,
      minZoom: 4,
      maxZoom: 9,
      zoomControl: false,
      attributionControl: false,
    });

    // Sleek CartoDB Dark Matter aviation control room tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Zoom controls at bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, [LState]);

  // Current simulation minutes for in-flight positioning
  const currentMins = useMemo(() => timeToMins(currentTime), [currentTime]);

  // Redraw layers whenever simulationResult, filters, or time changes
  useEffect(() => {
    if (!LState || !mapInstanceRef.current || !layerGroupRef.current) return;

    const L = LState;
    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    // 1. Weather Radar Overlay (if enabled & disruption active)
    if (showWeather && simulationResult) {
      const disHub = AIRPORTS.find((a) => a.id === simulationResult.params.airport);
      if (disHub) {
        // Convective storm radar circle
        const stormCircle = L.circle([disHub.lat, disHub.lng], {
          radius: 120000, // 120km radius storm cell
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.22,
          weight: 1.5,
          dashArray: '4, 4',
        });
        stormCircle.bindTooltip(
          `<div style="font-weight:700;color:#ef4444;">⛈️ ACTIVE ${simulationResult.params.type.toUpperCase()} RADAR CELL</div>
           <div style="font-size:11px;color:#94a3b8;">${simulationResult.params.airport} Airspace Restricted (${simulationResult.params.startTime} - ${simulationResult.summary.closure_end})</div>`,
          { sticky: true, className: 'aviation-tooltip' }
        );
        layerGroup.addLayer(stormCircle);

        // Core inner heavy precipitation cell
        const coreStorm = L.circle([disHub.lat, disHub.lng], {
          radius: 60000,
          color: '#f97316',
          fillColor: '#dc2626',
          fillOpacity: 0.4,
          weight: 1,
        });
        layerGroup.addLayer(coreStorm);
      }
    }

    // 2. Flight Routes (Curved Geodesic Arcs)
    const routesMap = new Map<string, { from: Airport; to: Airport; flights: Flight[] }>();
    for (const f of FLIGHTS) {
      const fromAp = AIRPORTS.find((a) => a.id === f.origin);
      const toAp = AIRPORTS.find((a) => a.id === f.destination);
      if (!fromAp || !toAp) continue;

      const key = [f.origin, f.destination].sort().join('-');
      if (!routesMap.has(key)) {
        routesMap.set(key, { from: fromAp, to: toAp, flights: [] });
      }
      routesMap.get(key)!.flights.push(f);
    }

    routesMap.forEach(({ from, to, flights }) => {
      // Find delay status among flights on this route
      let isDelayed = false;
      let isSevere = false;
      let hasInFlight = false;

      for (const fl of flights) {
        const simF = simulationResult?.flightStatuses.find((s) => s.flight_id === fl.flight_id);
        const depM = simF ? timeToMins(simF.actual_dep) : timeToMins(fl.dep);
        const arrM = simF ? timeToMins(simF.actual_arr) : timeToMins(fl.arr);

        if (currentMins >= depM && currentMins <= arrM) hasInFlight = true;
        if (simF && simF.delay_minutes > 0) {
          isDelayed = true;
          if (simF.delay_minutes > 60 || simF.status === 'cancelled') isSevere = true;
        }
      }

      // Filter modes
      if (filterMode === 'delayed' && !isDelayed) return;
      if (filterMode === 'inflight' && !hasInFlight) return;

      const color = isSevere ? '#ef4444' : isDelayed ? '#f97316' : '#00d4ff';
      const weight = isSevere ? 2.5 : isDelayed ? 2 : 1.2;
      const opacity = isSevere ? 0.85 : isDelayed ? 0.7 : 0.35;

      // Calculate midpoint curvature for aviation airway arc
      const latMid = (from.lat + to.lat) / 2 + (to.lng - from.lng) * 0.08;
      const lngMid = (from.lng + to.lng) / 2 - (to.lat - from.lat) * 0.08;

      const curvePoints: [number, number][] = [
        [from.lat, from.lng],
        [latMid, lngMid],
        [to.lat, to.lng],
      ];

      const polyline = L.polyline(curvePoints, {
        color,
        weight,
        opacity,
        dashArray: isSevere ? '6, 6' : undefined,
      });

      const flightListHtml = flights
        .map((fl) => {
          const simF = simulationResult?.flightStatuses.find((s) => s.flight_id === fl.flight_id);
          const delay = simF?.delay_minutes ?? 0;
          return `<div style="display:flex;justify-content:space-between;gap:8px;font-size:11px;margin-top:2px;">
            <span style="font-weight:700;color:#00d4ff;">${fl.flight_id}</span>
            <span>${fl.dep}→${fl.arr} (${fl.tail_id})</span>
            <span style="color:${delay > 0 ? '#f97316' : '#22c55e'};font-weight:600;">${delay > 0 ? `+${delay}m` : 'On Time'}</span>
          </div>`;
        })
        .join('');

      polyline.bindTooltip(
        `<div style="font-weight:700;color:#fff;border-bottom:1px solid #334155;padding-bottom:4px;">AIRWAY: ${from.id} ⇄ ${to.id} (${flights.length} flights)</div>${flightListHtml}`,
        { sticky: true, className: 'aviation-tooltip' }
      );

      layerGroup.addLayer(polyline);
    });

    // 3. Aircraft In-Flight Icons (Positioned based on currentTime)
    for (const f of FLIGHTS) {
      const simF = simulationResult?.flightStatuses.find((s) => s.flight_id === f.flight_id);
      const depMins = simF ? timeToMins(simF.actual_dep) : timeToMins(f.dep);
      const arrMins = simF ? timeToMins(simF.actual_arr) : timeToMins(f.arr);

      if (currentMins >= depMins && currentMins <= arrMins && depMins < arrMins) {
        const fromAp = AIRPORTS.find((a) => a.id === f.origin);
        const toAp = AIRPORTS.find((a) => a.id === f.destination);
        if (!fromAp || !toAp) continue;

        const progress = (currentMins - depMins) / (arrMins - depMins);
        const curLat = fromAp.lat + (toAp.lat - fromAp.lat) * progress;
        const curLng = fromAp.lng + (toAp.lng - fromAp.lng) * progress;
        const delay = simF?.delay_minutes ?? 0;

        const planeColor = delay > 60 ? '#ef4444' : delay > 0 ? '#f97316' : '#22c55e';

        // Calculate heading angle
        const dy = toAp.lat - fromAp.lat;
        const dx = (toAp.lng - fromAp.lng) * Math.cos((fromAp.lat * Math.PI) / 180);
        const angle = (Math.atan2(dx, dy) * 180) / Math.PI;

        const planeIcon = L.divIcon({
          className: 'plane-marker',
          html: `<div style="transform: rotate(${angle}deg); width: 22px; height: 22px; display:flex; align-items:center; justify-content:center; color: ${planeColor}; filter: drop-shadow(0 0 6px ${planeColor}); font-size: 16px;">✈</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        const planeMarker = L.marker([curLat, curLng], { icon: planeIcon });
        planeMarker.bindTooltip(
          `<div style="font-weight:700;color:${planeColor};">✈ ${f.flight_id} (${f.tail_id}) IN FLIGHT</div>
           <div style="font-size:11px;color:#94a3b8;">${f.origin} ➔ ${f.destination} · ${Math.round(progress * 100)}% route complete</div>
           <div style="font-size:11px;color:${delay > 0 ? '#f97316' : '#22c55e'};">Status: ${delay > 0 ? `+${delay}m delay (${simF?.cause})` : 'Operating On Time'}</div>`,
          { sticky: true, className: 'aviation-tooltip' }
        );
        layerGroup.addLayer(planeMarker);
      }
    }

    // 4. Airport Hub Nodes
    for (const airport of AIRPORTS) {
      const isDisrupted = simulationResult?.params.airport === airport.id;
      const isSelected = selectedAirport === airport.id;

      // Check if airport has delayed flights departing or arriving
      const hasDelays = simulationResult?.flightStatuses.some(
        (f) => (f.origin === airport.id || f.destination === airport.id) && f.delay_minutes > 0
      );

      const color = isDisrupted ? '#ef4444' : hasDelays ? '#f97316' : '#22c55e';
      const size = airport.tier === 'mega_hub' ? 14 : airport.tier === 'regional_hub' ? 10 : 8;

      const airportIcon = L.divIcon({
        className: 'airport-marker',
        html: `
          <div style="position: relative; width: ${size * 2}px; height: ${size * 2}px; display:flex; align-items:center; justify-content:center;">
            ${
              isDisrupted
                ? `<div style="position:absolute; inset:-8px; border: 2px solid #ef4444; border-radius:50%; animation: pulse-ring 1.8s infinite;"></div>`
                : ''
            }
            <div style="width: ${size}px; height: ${size}px; border-radius: 50%; background: ${color}; border: 2px solid ${
          isSelected ? '#ffffff' : '#0a1628'
        }; box-shadow: 0 0 10px ${color};"></div>
            <div style="position:absolute; top:-16px; font-size: 10px; font-weight:800; color: #f8fafc; font-family: monospace; text-shadow: 0 0 4px #000; letter-spacing:0.05em;">${
              airport.id
            }</div>
          </div>
        `,
        iconSize: [size * 2, size * 2],
        iconAnchor: [size, size],
      });

      const marker = L.marker([airport.lat, airport.lng], { icon: airportIcon });

      const departing = FLIGHTS.filter((f) => f.origin === airport.id).length;
      const arriving = FLIGHTS.filter((f) => f.destination === airport.id).length;

      marker.bindTooltip(
        `<div style="font-weight:800;color:${color};font-size:13px;">${airport.id} — ${airport.city}</div>
         <div style="font-size:11px;color:#94a3b8;">${airport.name}</div>
         <div style="font-size:11px;color:#e2e8f0;margin-top:4px;">Tier: <b>${airport.tier.replace('_', ' ')}</b> · Capacity: <b>${airport.capacity_per_hour} fl/hr</b></div>
         <div style="font-size:11px;color:#cbd5e1;">Departures: <b>${departing}</b> · Arrivals: <b>${arriving}</b></div>
         ${isDisrupted ? `<div style="font-weight:700;color:#ef4444;margin-top:4px;">⚠️ GROUND STOP: ${simulationResult.params.type.toUpperCase()}</div>` : ''}`,
        { sticky: true, className: 'aviation-tooltip' }
      );

      marker.on('click', () => {
        onSelectAirport(selectedAirport === airport.id ? null : airport.id);
      });

      layerGroup.addLayer(marker);
    }
  }, [LState, simulationResult, selectedAirport, currentMins, showWeather, filterMode, onSelectAirport]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#060d1f' }} />
      <style jsx global>{`
        .aviation-tooltip {
          background: rgba(10, 22, 40, 0.95) !important;
          border: 1px solid #1e3a5f !important;
          color: #f8fafc !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7) !important;
          font-family: 'Inter', system-ui, sans-serif !important;
        }
        .leaflet-tooltip-left:before { border-left-color: #1e3a5f !important; }
        .leaflet-tooltip-right:before { border-right-color: #1e3a5f !important; }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
