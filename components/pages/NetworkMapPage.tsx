'use client';

import { useState, useCallback } from 'react';
import { AIRPORTS, FLIGHTS } from '@/lib/data/dataset';
import type { SimulationResultJSON } from '@/lib/simulation/engine';

// Map India bounding box: lat 8-37, lng 68-97
const MAP_BOUNDS = { minLat: 7, maxLat: 37.5, minLng: 67, maxLng: 98 };
const MAP_W = 580, MAP_H = 540;

function latLngToXY(lat: number, lng: number) {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * MAP_W;
  const y = ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * MAP_H;
  return { x, y };
}

function getFlightColor(flightId: string, result: SimulationResultJSON | null): string {
  if (!result) return '#3b82f6';
  const f = result.flightStatuses.find(fs => fs.flight_id === flightId);
  if (!f) return '#3b82f6';
  if (f.status === 'cancelled') return '#ef4444';
  if (f.delay_minutes > 120) return '#ef4444';
  if (f.delay_minutes > 60) return '#f97316';
  if (f.delay_minutes > 0) return '#eab308';
  return '#22c55e';
}

function getAirportColor(airportId: string, result: SimulationResultJSON | null): string {
  if (!result) return '#3b82f6';
  if (airportId === result.params.airport) return '#ef4444';
  const hasDelayed = result.flightStatuses.some(f => (f.origin === airportId || f.destination === airportId) && f.delay_minutes > 0);
  if (hasDelayed) return '#f97316';
  return '#22c55e';
}

interface NetworkMapPageProps {
  simulationResult: SimulationResultJSON | null;
}

export default function NetworkMapPage({ simulationResult }: NetworkMapPageProps) {
  const [selectedAirport, setSelectedAirport] = useState<string | null>(null);
  const [hoveredFlight, setHoveredFlight] = useState<string | null>(null);

  const selectedAirportData = selectedAirport ? AIRPORTS.find(a => a.id === selectedAirport) : null;
  const selectedFlights = selectedAirport 
    ? FLIGHTS.filter(f => f.origin === selectedAirport || f.destination === selectedAirport)
    : [];

  // Build unique routes (avoid duplicates)
  const routes = new Map<string, { from: string; to: string; flights: string[] }>();
  for (const f of FLIGHTS) {
    const key = [f.origin, f.destination].sort().join('-');
    if (!routes.has(key)) routes.set(key, { from: f.origin, to: f.destination, flights: [] });
    routes.get(key)!.flights.push(f.flight_id);
  }

  const tierRadius = { mega_hub: 10, regional_hub: 7, spoke: 5 };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', height: 'calc(100vh - 120px)' }}>
      
      {/* Map */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: '12px', padding: '20px', overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: '12px' }}>
          INDIA FLIGHT NETWORK — {AIRPORTS.length} AIRPORTS · {FLIGHTS.length} FLIGHTS
        </div>
        
        {/* Legend */}
        <div style={{ position: 'absolute', top: '50px', right: '30px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 10 }}>
          {[
            { color: '#22c55e', label: 'On Time' },
            { color: '#eab308', label: 'Minor Delay' },
            { color: '#f97316', label: 'Significant Delay' },
            { color: '#ef4444', label: 'Cancelled / Closed' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
            </div>
          ))}
        </div>

        <svg width="100%" viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ maxHeight: '460px' }}>
          {/* Background */}
          <rect width={MAP_W} height={MAP_H} fill="rgba(6, 13, 31, 0.5)" rx="8" />
          
          {/* Route lines */}
          {Array.from(routes.values()).map(route => {
            const fromAp = AIRPORTS.find(a => a.id === route.from);
            const toAp = AIRPORTS.find(a => a.id === route.to);
            if (!fromAp || !toAp) return null;
            const p1 = latLngToXY(fromAp.lat, fromAp.lng);
            const p2 = latLngToXY(toAp.lat, toAp.lng);
            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2 - 30;
            const color = getFlightColor(route.flights[0], simulationResult);
            const isHovered = route.flights.includes(hoveredFlight ?? '');
            
            return (
              <path
                key={`${route.from}-${route.to}`}
                d={`M${p1.x},${p1.y} Q${mx},${my} ${p2.x},${p2.y}`}
                fill="none"
                stroke={color}
                strokeWidth={isHovered ? 2.5 : 1.2}
                strokeOpacity={isHovered ? 0.9 : 0.35}
                strokeDasharray={color === '#ef4444' ? '4,3' : undefined}
                style={{ transition: 'all 0.2s', cursor: 'pointer' }}
                onMouseEnter={() => setHoveredFlight(route.flights[0])}
                onMouseLeave={() => setHoveredFlight(null)}
              />
            );
          })}

          {/* Airport nodes */}
          {AIRPORTS.map(airport => {
            const { x, y } = latLngToXY(airport.lat, airport.lng);
            const r = tierRadius[airport.tier];
            const color = getAirportColor(airport.id, simulationResult);
            const isSelected = selectedAirport === airport.id;
            const isDisrupted = simulationResult?.params.airport === airport.id;

            return (
              <g key={airport.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedAirport(isSelected ? null : airport.id)}>
                {isDisrupted && (
                  <circle cx={x} cy={y} r={r + 8} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.5">
                    <animate attributeName="r" values={`${r+8};${r+16};${r+8}`} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={x} cy={y} r={isSelected ? r + 3 : r} fill={color}
                  stroke={isSelected ? '#fff' : 'rgba(255,255,255,0.3)'}
                  strokeWidth={isSelected ? 2 : 1}
                  style={{ filter: `drop-shadow(0 0 ${r}px ${color})`, transition: 'all 0.2s' }}
                />
                <text x={x} y={y - r - 4} textAnchor="middle" fill="white" fontSize="9" fontWeight="600" fontFamily="monospace">
                  {airport.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Side panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        
        {/* Simulation status */}
        {simulationResult && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px', padding: '14px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--status-red)', letterSpacing: '0.08em', marginBottom: '8px' }}>
              ACTIVE DISRUPTION
            </div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
              {simulationResult.params.airport} · {simulationResult.params.type}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {simulationResult.params.startTime} → {simulationResult.summary.closure_end}
            </div>
            <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Delayed', value: simulationResult.summary.delayed_flights, color: '#f97316' },
                { label: 'Cancelled', value: simulationResult.summary.cancelled_flights, color: '#ef4444' },
                { label: 'Stranded Pax', value: simulationResult.passengerImpact.stranded, color: '#ef4444' },
                { label: 'Total Delay', value: `${simulationResult.summary.total_delay_minutes}m`, color: '#eab308' },
              ].map(item => (
                <div key={item.label} style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected airport panel */}
        {selectedAirportData ? (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-cyan)' }}>{selectedAirportData.id}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '600' }}>{selectedAirportData.city}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selectedAirportData.name}</div>
              </div>
              <span className={`badge badge-${selectedAirportData.tier === 'mega_hub' ? 'cyan' : selectedAirportData.tier === 'regional_hub' ? 'blue' : 'purple'}`}>
                {selectedAirportData.tier.replace('_', ' ')}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Capacity: {selectedAirportData.capacity_per_hour} flights/hr · {selectedFlights.length} flights today
            </div>
            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {selectedFlights.map(f => {
                const statusInfo = simulationResult?.flightStatuses.find(fs => fs.flight_id === f.flight_id);
                const delay = statusInfo?.delay_minutes ?? 0;
                return (
                  <div key={f.flight_id} style={{
                    padding: '7px 10px', borderRadius: '6px', marginBottom: '4px',
                    background: 'rgba(255,255,255,0.03)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderLeft: `2px solid ${delay > 60 ? '#ef4444' : delay > 0 ? '#f97316' : '#22c55e'}`,
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{f.flight_id}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{f.origin}→{f.destination} · {f.dep}</div>
                    </div>
                    {delay > 0 && (
                      <span style={{ fontSize: '11px', fontWeight: '700', color: delay > 60 ? '#ef4444' : '#f97316' }}>+{delay}m</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: '10px' }}>
              AIRPORT OVERVIEW
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>Click an airport to see details</div>
            {AIRPORTS.map(a => {
              const color = getAirportColor(a.id, simulationResult);
              const flights = FLIGHTS.filter(f => f.origin === a.id || f.destination === a.id);
              return (
                <div key={a.id}
                  onClick={() => setSelectedAirport(a.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', marginBottom: '2px',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', width: '34px' }}>{a.id}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1 }}>{a.city}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{flights.length}f</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
