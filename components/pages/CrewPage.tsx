'use client';

import { CREWS, FLIGHTS, AIRPORTS } from '@/lib/data/dataset';
import { timeToMins, minsToTime, type SimulationResultJSON } from '@/lib/simulation/engine';

interface CrewPageProps {
  simulationResult: SimulationResultJSON | null;
}

export default function CrewPage({ simulationResult }: CrewPageProps) {
  // Aggregate crew duty calculations
  const crewRoster = CREWS.map((crew) => {
    const crewFlights = FLIGHTS.filter((f) => crew.flight_ids.includes(f.flight_id));
    crewFlights.sort((a, b) => a.leg_order - b.leg_order);
    const lastFlight = crewFlights[crewFlights.length - 1];

    const dutyStartMins = timeToMins(crew.duty_start);
    const scheduledEndMins = lastFlight ? timeToMins(lastFlight.arr) : dutyStartMins;
    const scheduledDuty = scheduledEndMins - dutyStartMins;

    // Simulation actuals
    let actualEndMins = scheduledEndMins;
    let actualDuty = scheduledDuty;
    let violation = false;
    let warning = false;
    let violationReason = 'Operating within safe DGCA / airline regulatory limits.';

    if (simulationResult) {
      const simWarning = simulationResult.crewWarnings.find((w) => w.crew_id === crew.crew_id);
      if (simWarning) {
        actualDuty = simWarning.actual_duty_mins;
        actualEndMins = dutyStartMins + actualDuty;
        violation = simWarning.violation;
        warning = simWarning.warning;
        violationReason = simWarning.violation_reason;
      }
    }

    const utilizationPct = Math.min(100, Math.round((actualDuty / crew.max_duty_mins) * 100));

    return {
      crew_id: crew.crew_id,
      tail_id: crew.tail_id,
      base: crew.base,
      duty_start: crew.duty_start,
      scheduled_end: lastFlight ? lastFlight.arr : '--:--',
      actual_end: minsToTime(actualEndMins),
      scheduled_duty: scheduledDuty,
      actual_duty: actualDuty,
      max_duty: crew.max_duty_mins,
      flight_ids: crew.flight_ids,
      violation,
      warning,
      violationReason,
      utilizationPct,
    };
  });

  const totalViolations = crewRoster.filter((c) => c.violation).length;
  const totalWarnings = crewRoster.filter((c) => c.warning && !c.violation).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Crew Teams</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--accent-cyan)', marginTop: '4px' }}>{CREWS.length}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>1 crew roster dedicated per aircraft tail</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Duty Hour Violations</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: totalViolations > 0 ? 'var(--status-red)' : 'var(--status-green)', marginTop: '4px' }}>
            {totalViolations}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Exceeding legal 600m (10h) duty limit</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>High Fatigue Warnings</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: totalWarnings > 0 ? 'var(--status-yellow)' : 'var(--status-green)', marginTop: '4px' }}>
            {totalWarnings}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>&gt;90% duty utilization (buffer &lt;60m)</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Regulatory Ceiling</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--accent-blue)', marginTop: '4px' }}>600 min</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>10.0 hours maximum legal flight duty period</div>
        </div>
      </div>

      {/* Roster Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Crew Duty Ledger &amp; Legal Compliance Monitoring
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Detects crew duty violations when cascading flight delays push block arrivals past the 600-minute maximum duty window.
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Crew ID</th>
              <th>Assigned Tail</th>
              <th>Home Base</th>
              <th>Duty Start</th>
              <th>Sched End</th>
              <th>Actual End</th>
              <th>Duty Total / Max</th>
              <th>Duty Bar</th>
              <th>Compliance Status</th>
              <th>Diagnostic / Replacement Action</th>
            </tr>
          </thead>
          <tbody>
            {crewRoster.map((crew) => {
              const ap = AIRPORTS.find((a) => a.id === crew.base);
              return (
                <tr key={crew.crew_id}>
                  <td>
                    <span style={{ fontWeight: '700', color: 'var(--accent-cyan)' }}>{crew.crew_id}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{crew.tail_id}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: '600' }}>{crew.base}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>{ap?.city}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace' }}>{crew.duty_start}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace' }}>{crew.scheduled_end}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', color: crew.violation ? 'var(--status-red)' : crew.warning ? 'var(--status-yellow)' : 'var(--text-primary)' }}>
                      {crew.actual_end}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: '700', color: crew.violation ? 'var(--status-red)' : 'var(--text-primary)' }}>
                      {crew.actual_duty}m
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}> / {crew.max_duty}m</span>
                  </td>
                  <td style={{ width: '130px' }}>
                    <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${crew.utilizationPct}%`,
                          background: crew.violation ? 'var(--status-red)' : crew.warning ? 'var(--status-yellow)' : 'var(--status-green)',
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                      {crew.utilizationPct}% used
                    </span>
                  </td>
                  <td>
                    {crew.violation ? (
                      <span className="badge badge-red">DUTY VIOLATION</span>
                    ) : crew.warning ? (
                      <span className="badge badge-yellow">NEAR LIMIT</span>
                    ) : (
                      <span className="badge badge-green">LEGAL</span>
                    )}
                  </td>
                  <td style={{ fontSize: '12px', color: crew.violation ? 'var(--status-red)' : 'var(--text-secondary)', maxWidth: '280px' }}>
                    {crew.violationReason}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
