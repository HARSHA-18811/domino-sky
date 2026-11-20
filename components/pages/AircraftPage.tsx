'use client';

import { FLIGHTS, SPARE_AIRCRAFT, AIRPORTS } from '@/lib/data/dataset';
import type { SimulationResultJSON } from '@/lib/simulation/engine';

interface AircraftPageProps {
  simulationResult: SimulationResultJSON | null;
}

export default function AircraftPage({ simulationResult }: AircraftPageProps) {
  // Aggregate aircraft rotations
  const aircraftMap = new Map<string, typeof FLIGHTS>();
  for (const f of FLIGHTS) {
    if (!aircraftMap.has(f.tail_id)) aircraftMap.set(f.tail_id, []);
    aircraftMap.get(f.tail_id)!.push(f);
  }

  const activeAircraftList = Array.from(aircraftMap.entries()).map(([tailId, legs]) => {
    legs.sort((a, b) => a.leg_order - b.leg_order);
    const firstLeg = legs[0];
    const lastLeg = legs[legs.length - 1];

    // Read status from simulation if available
    let state = 'scheduled';
    let delayMinutes = 0;
    let availableAt = lastLeg.arr;

    if (simulationResult) {
      const simStatus = simulationResult.aircraftStatuses.find((a) => a.tail_id === tailId);
      if (simStatus) {
        state = simStatus.state;
        delayMinutes = simStatus.delay_minutes;
        availableAt = simStatus.available_at ?? lastLeg.arr;
      }
    }

    return {
      tail_id: tailId,
      base: firstLeg.origin,
      final_dest: lastLeg.destination,
      legs,
      state,
      delayMinutes,
      availableAt,
      is_spare: false,
      total_pax: legs.reduce((s, l) => s + l.pax, 0),
    };
  });

  const spareAircraftList = SPARE_AIRCRAFT.map((s) => {
    let state = 'spare';
    if (simulationResult?.recovery?.type === 'assign_spare' && simulationResult.recovery.spareAircraftId === s.tail_id) {
      state = 'dispatched';
    }
    return {
      tail_id: s.tail_id,
      base: s.base,
      final_dest: s.base,
      legs: [],
      state,
      delayMinutes: 0,
      availableAt: s.available_from,
      is_spare: true,
      total_pax: 0,
    };
  });

  const allAircraft = [...activeAircraftList, ...spareAircraftList];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Spares Callout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Fleet Roster &amp; Aircraft Availability (16 Scheduled + 2 Reserves)
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Multi-leg rotation tracker. Validate physical location, turnaround readiness, and spare deployment feasibility.
          </div>
        </div>

        {/* Spare Badges */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {SPARE_AIRCRAFT.map((s) => {
            const isAssigned = simulationResult?.recovery?.spareAircraftId === s.tail_id;
            return (
              <div
                key={s.tail_id}
                style={{
                  background: isAssigned ? 'rgba(34, 197, 94, 0.15)' : 'rgba(0, 212, 255, 0.1)',
                  border: `1px solid ${isAssigned ? 'rgba(34, 197, 94, 0.4)' : 'rgba(0, 212, 255, 0.3)'}`,
                  borderRadius: '8px',
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '18px' }}>✈</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: isAssigned ? 'var(--status-green)' : 'var(--accent-cyan)' }}>
                    {s.tail_id} (SPARE)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Base: {s.base} · {isAssigned ? 'DEPLOYED ON RECOVERY' : `Standby from ${s.available_from}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Aircraft Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {allAircraft.map((ac) => {
          const isDelayed = ac.delayMinutes > 0;
          const isSpare = ac.is_spare;

          return (
            <div
              key={ac.tail_id}
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${isDelayed ? 'rgba(249, 115, 22, 0.4)' : isSpare ? 'rgba(0, 212, 255, 0.3)' : 'var(--border-color)'}`,
                borderRadius: '12px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: isSpare ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                    {ac.tail_id}
                  </span>
                  {isSpare && <span className="badge badge-cyan">RESERVE</span>}
                </div>
                {isDelayed ? (
                  <span className="badge badge-orange">+{ac.delayMinutes}m DELAY</span>
                ) : isSpare ? (
                  <span className="badge badge-blue">STANDBY</span>
                ) : (
                  <span className="badge badge-green">ON SCHEDULE</span>
                )}
              </div>

              {/* Specs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px' }}>HOME BASE</span>
                  <span style={{ fontWeight: '700' }}>{ac.base}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px' }}>EST. AVAILABILITY</span>
                  <span style={{ fontWeight: '700', fontFamily: 'monospace' }}>{ac.availableAt} IST</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px' }}>TOTAL ROTATION LEGS</span>
                  <span style={{ fontWeight: '700' }}>{ac.legs.length} flights</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px' }}>TOTAL PAX SERVED</span>
                  <span style={{ fontWeight: '700' }}>{ac.total_pax} passengers</span>
                </div>
              </div>

              {/* Legs timeline */}
              {!isSpare && ac.legs.length > 0 && (
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Flight Rotation Chain:
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {ac.legs.map((leg, idx) => {
                      const legSim = simulationResult?.flightStatuses.find((fs) => fs.flight_id === leg.flight_id);
                      const legDelayed = (legSim?.delay_minutes ?? 0) > 0;
                      return (
                        <div
                          key={leg.flight_id}
                          style={{
                            background: legDelayed ? 'rgba(249, 115, 22, 0.2)' : 'var(--bg-secondary)',
                            border: `1px solid ${legDelayed ? 'rgba(249, 115, 22, 0.5)' : 'var(--border-color)'}`,
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '11px',
                          }}
                        >
                          <span style={{ fontWeight: '700', color: legDelayed ? 'var(--status-orange)' : 'var(--text-primary)' }}>
                            {leg.flight_id}
                          </span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>
                            ({leg.origin}→{leg.destination})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
