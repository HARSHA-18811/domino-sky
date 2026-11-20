'use client';

import { FLIGHTS, AIRPORTS, CONNECTIONS } from '@/lib/data/dataset';
import type { SimulationResultJSON } from '@/lib/simulation/engine';

interface AnalyticsPageProps {
  simulationResult: SimulationResultJSON | null;
}

export default function AnalyticsPage({ simulationResult }: AnalyticsPageProps) {
  // Aggregate flight delay by airport
  const airportDelayMap = new Map<string, { totalDelay: number; flightsAffected: number }>();
  for (const a of AIRPORTS) {
    airportDelayMap.set(a.id, { totalDelay: 0, flightsAffected: 0 });
  }

  if (simulationResult) {
    for (const f of simulationResult.flightStatuses) {
      if (f.delay_minutes > 0) {
        const orig = airportDelayMap.get(f.origin);
        if (orig) {
          orig.totalDelay += f.delay_minutes;
          orig.flightsAffected += 1;
        }
      }
    }
  }

  const topDisruptedAirports = Array.from(airportDelayMap.entries())
    .filter(([_, data]) => data.totalDelay > 0)
    .sort((a, b) => b[1].totalDelay - a[1].totalDelay);

  const handleExportJSON = () => {
    if (!simulationResult) return;
    const blob = new Blob([JSON.stringify(simulationResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `domino_sky_${simulationResult.params.airport}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!simulationResult) return;
    const headers = ['Flight_ID', 'Tail_ID', 'Origin', 'Destination', 'Sched_Dep', 'Sched_Arr', 'Actual_Dep', 'Actual_Arr', 'Delay_Mins', 'Status', 'Cause'];
    const rows = simulationResult.flightStatuses.map((f) => [
      f.flight_id,
      f.tail_id,
      f.origin,
      f.destination,
      f.scheduled_dep,
      f.scheduled_arr,
      f.actual_dep,
      f.actual_arr,
      f.delay_minutes,
      f.status,
      `"${f.cause.replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `domino_sky_flights_${simulationResult.params.airport}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Export buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Network Vulnerability &amp; Analytics Reports
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Empirical cascade analytics, hub susceptibility scores, and regulatory compliance export files.
          </div>
        </div>

        {simulationResult && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleExportCSV}
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: '8px',
                padding: '8px 14px',
                color: 'var(--accent-blue)',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              📥 Export Flights CSV
            </button>
            <button
              onClick={handleExportJSON}
              style={{
                background: 'linear-gradient(135deg, #00d4ff, #3b82f6)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                color: '#000',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
              }}
            >
              📥 Export Full Simulation JSON
            </button>
          </div>
        )}
      </div>

      {/* Disruption hub vulnerability ranking */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-cyan)', letterSpacing: '0.08em', marginBottom: '14px' }}>
          HUB DELAY ACCUMULATION PROFILE
        </div>

        {topDisruptedAirports.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topDisruptedAirports.map(([airportId, data]) => {
              const ap = AIRPORTS.find((a) => a.id === airportId);
              const maxDelay = topDisruptedAirports[0][1].totalDelay;
              const pct = Math.round((data.totalDelay / maxDelay) * 100);

              return (
                <div key={airportId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '700' }}>
                      {airportId} · {ap?.city} ({data.flightsAffected} flights impacted)
                    </span>
                    <span style={{ fontWeight: '700', color: 'var(--status-orange)' }}>{data.totalDelay} minutes total delay</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, #f97316, #ef4444)',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
            All 16 airports currently have 0 cumulative departure delays. Trigger a disruption in the simulator to view delay distribution.
          </div>
        )}
      </div>

      {/* Dataset Network Graph Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Network Density</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
            4.38 legs/aircraft
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            70 flights operated across 16 primary aircraft rotations
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Transfer Criticality</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
            21 Connections
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Average minimum connecting time requirement: 43.8 minutes
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fleet Buffer Ratio</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--status-green)', marginTop: '4px' }}>
            12.5% Reserves
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            2 spare aircraft strategically positioned at BLR &amp; DEL
          </div>
        </div>
      </div>
    </div>
  );
}
