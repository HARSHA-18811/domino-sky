'use client';

import { useState } from 'react';
import { AIRPORTS } from '@/lib/data/dataset';
import { runSimulation, type DisruptionParams, type SimulationResultJSON } from '@/lib/simulation/engine';
import type { NavPage } from '@/app/page';

interface SimulatorPageProps {
  onSimulationComplete: (result: SimulationResultJSON) => void;
  onNavigate: (page: NavPage) => void;
  isSimulating: boolean;
  setIsSimulating: (val: boolean) => void;
}

const PRESET_SCENARIOS = [
  {
    name: 'Mumbai Morning Hub Storm (07:30 IST - 90 min) [High Stranded Pax]',
    airport: 'BOM',
    type: 'Thunderstorm',
    startTime: '07:30',
    durationMinutes: 90,
    desc: 'Peak morning transit bank closure at CSMIA. Directly breaks connections CX01, CX03, and CX05, stranding over 150 transfer passengers!',
  },
  {
    name: 'Mumbai Afternoon Thunderstorm (13:30 IST - 120 min) [High Cascade]',
    airport: 'BOM',
    type: 'Thunderstorm',
    startTime: '13:30',
    durationMinutes: 120,
    desc: 'Severe 2-hour monsoon squall holding arrivals and triggering multi-aircraft rotational delays across AMD, DEL, and CCU.',
  },
  {
    name: 'Delhi Winter Fog & Runway Closure (08:00 IST - 120 min)',
    airport: 'DEL',
    type: 'Runway Closure',
    startTime: '08:00',
    durationMinutes: 120,
    desc: 'Dense morning fog holding northern mega-hub departures and breaking passenger connections CX10, CX13, and CX14.',
  },
  {
    name: 'Bengaluru Radar Technical Outage (11:00 IST - 90 min)',
    airport: 'BLR',
    type: 'Technical Disruption',
    startTime: '11:00',
    durationMinutes: 90,
    desc: 'Air Traffic Control radar glitch halting southern corridor departures and breaking transfers to COK, MAA, and HYD.',
  },
];

export default function SimulatorPage({
  onSimulationComplete,
  onNavigate,
  isSimulating,
  setIsSimulating,
}: SimulatorPageProps) {
  const [selectedAirport, setSelectedAirport] = useState('BOM');
  const [disruptionType, setDisruptionType] = useState('Thunderstorm');
  const [startTime, setStartTime] = useState('07:30');
  const [duration, setDuration] = useState(90);
  const [activePreset, setActivePreset] = useState<string | null>(PRESET_SCENARIOS[0].name);

  const applyPreset = (preset: typeof PRESET_SCENARIOS[0]) => {
    setSelectedAirport(preset.airport);
    setDisruptionType(preset.type);
    setStartTime(preset.startTime);
    setDuration(preset.durationMinutes);
    setActivePreset(preset.name);
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const params: DisruptionParams = {
        airport: selectedAirport,
        type: disruptionType,
        startTime,
        durationMinutes: duration,
      };
      const result = runSimulation(params);
      onSimulationComplete(result);
      setIsSimulating(false);
      onNavigate('dashboard');
    }, 500);
  };

  const airportObj = AIRPORTS.find((a) => a.id === selectedAirport);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Title section */}
      <div>
        <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Airport Disruption Simulation Studio
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Induce airport closures, schedule ground stops, and trigger deterministic cascade propagation across 70 flights and 16 aircraft rotations.
        </div>
      </div>

      {/* Preset cards */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: '12px' }}>
          OFFICIAL HACKATHON BENCHMARK PRESETS (CLICK ANY TO LOAD)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
          {PRESET_SCENARIOS.map((p) => {
            const isSelected = activePreset === p.name;
            return (
              <div
                key={p.name}
                onClick={() => applyPreset(p)}
                style={{
                  background: isSelected ? 'rgba(0, 212, 255, 0.08)' : 'var(--bg-card)',
                  border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                  borderRadius: '10px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{p.airport === 'BOM' ? '⚡' : p.airport === 'DEL' ? '🌫️' : '⚠️'}</span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                      {p.airport} · {p.type} ({p.durationMinutes}m)
                    </span>
                  </div>
                  <span className="badge badge-cyan">{p.startTime} IST</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {p.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom configuration builder */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-cyan)', letterSpacing: '0.08em', marginBottom: '18px' }}>
          CUSTOM DISRUPTION PARAMETERS
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          {/* Target Airport */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Target Airport
            </label>
            <select
              value={selectedAirport}
              onChange={(e) => {
                setSelectedAirport(e.target.value);
                setActivePreset(null);
              }}
              style={{
                width: '100%',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            >
              {AIRPORTS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id} - {a.city} ({a.name}) [{a.tier.replace('_', ' ')}]
                </option>
              ))}
            </select>
            {airportObj && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                Tier: {airportObj.tier} · Standard Hourly Runway Capacity: {airportObj.capacity_per_hour} flights
              </div>
            )}
          </div>

          {/* Disruption Type */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Disruption Event Type
            </label>
            <select
              value={disruptionType}
              onChange={(e) => {
                setDisruptionType(e.target.value);
                setActivePreset(null);
              }}
              style={{
                width: '100%',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            >
              <option value="Thunderstorm">Thunderstorm (Convective Weather / Ground Stop)</option>
              <option value="Heavy Rainfall">Heavy Rainfall / Standing Water / Low Visibility</option>
              <option value="Runway Closure">Runway Closure / Emergency Maintenance</option>
              <option value="Technical Disruption">Technical Disruption / ATC Radar Outage</option>
              <option value="Operational Restrictions">Operational Restrictions / Slot Bottleneck</option>
            </select>
          </div>

          {/* Disruption Start Time */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Disruption Start Time (IST)
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                setActivePreset(null);
              }}
              style={{
                width: '100%',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Duration Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                Closure Duration
              </label>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                {duration} minutes ({Math.floor(duration / 60)}h {duration % 60}m)
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="300"
              step="15"
              value={duration}
              onChange={(e) => {
                setDuration(Number(e.target.value));
                setActivePreset(null);
              }}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>30 mins</span>
              <span>90 mins</span>
              <span>180 mins</span>
              <span>300 mins (5h)</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ marginTop: '28px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg, #00d4ff, #3b82f6)',
              border: 'none',
              borderRadius: '10px',
              padding: '14px 24px',
              color: '#000',
              fontWeight: '800',
              fontSize: '14px',
              cursor: isSimulating ? 'not-allowed' : 'pointer',
              boxShadow: '0 0 25px rgba(0, 212, 255, 0.4)',
              transition: 'all 0.2s',
              opacity: isSimulating ? 0.6 : 1,
            }}
          >
            {isSimulating ? '⚡ PROPAGATING DELAYS ACROSS NETWORK GRAPH...' : '⚡ RUN DETERMINISTIC CASCADE SIMULATION'}
          </button>
        </div>
      </div>
    </div>
  );
}
