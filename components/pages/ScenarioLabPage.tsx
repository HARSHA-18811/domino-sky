'use client';

import { useState } from 'react';
import { runSimulation, type DisruptionParams, type SimulationResultJSON } from '@/lib/simulation/engine';
import { AIRPORTS } from '@/lib/data/dataset';

interface ScenarioLabPageProps {
  onSimulationComplete: (result: SimulationResultJSON) => void;
}

interface SavedScenario {
  id: string;
  name: string;
  result: SimulationResultJSON;
}

export default function ScenarioLabPage({ onSimulationComplete }: ScenarioLabPageProps) {
  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => {
    // Generate initial benchmark scenarios automatically
    const sc1 = runSimulation({ airport: 'BOM', type: 'Thunderstorm', startTime: '14:00', durationMinutes: 90 });
    const sc2 = runSimulation({ airport: 'DEL', type: 'Runway Closure', startTime: '08:00', durationMinutes: 120 });
    const sc3 = runSimulation({ airport: 'BLR', type: 'Technical Outage', startTime: '11:00', durationMinutes: 60 });
    return [
      { id: 'sc_bom_90', name: 'Mumbai 90m Thunderstorm (14:00)', result: sc1 },
      { id: 'sc_del_120', name: 'Delhi 120m Runway Closure (08:00)', result: sc2 },
      { id: 'sc_blr_60', name: 'Bengaluru 60m Radar Outage (11:00)', result: sc3 },
    ];
  });

  const [newAirport, setNewAirport] = useState('HYD');
  const [newType, setNewType] = useState('Heavy Rainfall');
  const [newStartTime, setNewStartTime] = useState('12:00');
  const [newDuration, setNewDuration] = useState(75);

  const handleAddScenario = () => {
    const params: DisruptionParams = {
      airport: newAirport,
      type: newType,
      startTime: newStartTime,
      durationMinutes: newDuration,
    };
    const res = runSimulation(params);
    const newSc: SavedScenario = {
      id: `sc_${Date.now()}`,
      name: `${newAirport} ${newDuration}m ${newType} (${newStartTime})`,
      result: res,
    };
    setScenarios((prev) => [...prev, newSc]);
  };

  const handleLoadScenario = (sc: SavedScenario) => {
    onSimulationComplete(sc.result);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
          What-If Scenario Laboratory &amp; Side-by-Side Benchmark
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Simulate and contrast multi-scenario disruption impacts across Indian airspace hubs. Original master dataset remains untouched.
        </div>
      </div>

      {/* Add New Scenario Form */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '14px' }}>
          SPAWN NEW WHAT-IF SIMULATION EXPERIMENT
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Airport</label>
            <select
              value={newAirport}
              onChange={(e) => setNewAirport(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px', color: '#fff', fontSize: '12px' }}
            >
              {AIRPORTS.map((a) => (
                <option key={a.id} value={a.id}>{a.id} ({a.city})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Disruption Event</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px', color: '#fff', fontSize: '12px' }}
            >
              <option value="Thunderstorm">Thunderstorm</option>
              <option value="Heavy Rainfall">Heavy Rainfall</option>
              <option value="Runway Closure">Runway Closure</option>
              <option value="Technical Outage">Technical Outage</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Start Time (IST)</label>
            <input
              type="time"
              value={newStartTime}
              onChange={(e) => setNewStartTime(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px', color: '#fff', fontSize: '12px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Duration: {newDuration}m</label>
            <input
              type="range"
              min="30"
              max="240"
              step="15"
              value={newDuration}
              onChange={(e) => setNewDuration(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
          </div>
          <div>
            <button
              onClick={handleAddScenario}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #00d4ff, #3b82f6)',
                border: 'none',
                borderRadius: '6px',
                padding: '9px',
                color: '#000',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              + Run &amp; Compare
            </button>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Matrix */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Scenario Name</th>
              <th>Target Hub</th>
              <th>Duration</th>
              <th>Delayed Flights</th>
              <th>Cancelled Flights</th>
              <th>Total Delay Mins</th>
              <th>Stranded Pax</th>
              <th>Max Cascade Depth</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((sc) => (
              <tr key={sc.id}>
                <td>
                  <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{sc.name}</span>
                </td>
                <td>
                  <span className="badge badge-cyan">{sc.result.params.airport}</span>
                </td>
                <td>
                  <span style={{ fontFamily: 'monospace' }}>{sc.result.params.durationMinutes} min</span>
                </td>
                <td>
                  <span style={{ fontWeight: '700', color: 'var(--status-orange)' }}>
                    {sc.result.summary.delayed_flights}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}> / 70</span>
                </td>
                <td>
                  <span style={{ fontWeight: '700', color: sc.result.summary.cancelled_flights > 0 ? 'var(--status-red)' : 'var(--text-muted)' }}>
                    {sc.result.summary.cancelled_flights}
                  </span>
                </td>
                <td>
                  <span style={{ fontWeight: '700', color: 'var(--status-yellow)' }}>
                    {sc.result.summary.total_delay_minutes} m
                  </span>
                </td>
                <td>
                  <span style={{ fontWeight: '700', color: sc.result.passengerImpact.stranded > 0 ? 'var(--status-red)' : 'var(--status-green)' }}>
                    {sc.result.passengerImpact.stranded} pax
                  </span>
                </td>
                <td>
                  <span style={{ fontWeight: '700', color: 'var(--accent-cyan)' }}>
                    {sc.result.summary.cascade_depth} legs deep
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => handleLoadScenario(sc)}
                    style={{
                      background: 'rgba(0, 212, 255, 0.1)',
                      border: '1px solid rgba(0, 212, 255, 0.3)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      color: 'var(--accent-cyan)',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Load into Simulator
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
