'use client';

import { CONNECTIONS, FLIGHTS, AIRPORTS } from '@/lib/data/dataset';
import type { SimulationResultJSON } from '@/lib/simulation/engine';

interface PassengerPageProps {
  simulationResult: SimulationResultJSON | null;
}

export default function PassengerPage({ simulationResult }: PassengerPageProps) {
  const totalConnectingPax = CONNECTIONS.reduce((s, c) => s + c.passengers, 0);

  // If simulation exists, read deterministic connection results; otherwise default all safe
  const connectionDetails = simulationResult?.passengerImpact.connection_details ?? CONNECTIONS.map((c) => {
    const fromF = FLIGHTS.find((f) => f.flight_id === c.from_flight);
    const toF = FLIGHTS.find((f) => f.flight_id === c.to_flight);
    return {
      connection_id: c.connection_id,
      airport: c.airport,
      from_flight: c.from_flight,
      to_flight: c.to_flight,
      passengers: c.passengers,
      status: 'safe' as const,
      from_actual_arr: fromF?.arr ?? '--:--',
      to_actual_dep: toF?.dep ?? '--:--',
      gap_minutes: 60,
      required_minutes: c.min_connect_minutes,
      reason: 'Nominal operational buffer',
    };
  });

  const missedCount = connectionDetails.filter((c) => c.status === 'missed').length;
  const atRiskCount = connectionDetails.filter((c) => c.status === 'at_risk').length;
  const safeCount = connectionDetails.filter((c) => c.status === 'safe').length;

  const strandedPax = connectionDetails
    .filter((c) => c.status === 'missed')
    .reduce((s, c) => s + c.passengers, 0);

  const atRiskPax = connectionDetails
    .filter((c) => c.status === 'at_risk')
    .reduce((s, c) => s + c.passengers, 0);

  // Group missed by airport
  const airportImpactMap = new Map<string, number>();
  for (const c of connectionDetails) {
    if (c.status === 'missed') {
      airportImpactMap.set(c.airport, (airportImpactMap.get(c.airport) ?? 0) + c.passengers);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Connecting Pax</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--accent-cyan)', marginTop: '4px' }}>{totalConnectingPax}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Across {CONNECTIONS.length} monitored city-pair transfers</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stranded Passengers</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: strandedPax > 0 ? 'var(--status-red)' : 'var(--status-green)', marginTop: '4px' }}>
            {strandedPax}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {missedCount} missed connections requiring rebooking
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>At-Risk Passengers</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: atRiskPax > 0 ? 'var(--status-yellow)' : 'var(--status-green)', marginTop: '4px' }}>
            {atRiskPax}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {atRiskCount} tight connections (&lt;30m buffer)
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Intact Connections</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--status-green)', marginTop: '4px' }}>
            {safeCount} / {CONNECTIONS.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {Math.round((safeCount / CONNECTIONS.length) * 100)}% connection integrity preserved
          </div>
        </div>
      </div>

      {/* Airport breakdown if stranded */}
      {airportImpactMap.size > 0 && (
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--status-red)', textTransform: 'uppercase', marginBottom: '10px' }}>
            Stranded Passenger Distribution by Transit Hub
          </div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {Array.from(airportImpactMap.entries()).map(([hub, count]) => {
              const ap = AIRPORTS.find((a) => a.id === hub);
              return (
                <div key={hub} style={{ background: 'var(--bg-card)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--status-red)' }}>{count} Pax</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                    {hub} - {ap?.city}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Connections Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Passenger Connection Ledger (All 21 Transfers)
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Deterministic rule: A connection fails if `actual_arrival(from_flight) + min_connect_minutes &gt; actual_departure(to_flight)`
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Transit Hub</th>
              <th>Inbound Flight</th>
              <th>Outbound Flight</th>
              <th>Passengers</th>
              <th>Inbound Actual Arr</th>
              <th>Outbound Actual Dep</th>
              <th>Buffer / Gap</th>
              <th>Status</th>
              <th>Reason &amp; Deterministic Diagnosis</th>
            </tr>
          </thead>
          <tbody>
            {connectionDetails.map((conn) => {
              const ap = AIRPORTS.find((a) => a.id === conn.airport);
              return (
                <tr key={conn.connection_id}>
                  <td>
                    <span style={{ fontWeight: '700', color: 'var(--accent-cyan)' }}>{conn.connection_id}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: '600' }}>{conn.airport}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>{ap?.city}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: '700' }}>{conn.from_flight}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: '700' }}>{conn.to_flight}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: '700', color: conn.status === 'missed' ? 'var(--status-red)' : 'var(--text-primary)' }}>
                      {conn.passengers}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace' }}>{conn.from_actual_arr}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace' }}>{conn.to_actual_dep}</span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: '600',
                        color: conn.gap_minutes < conn.required_minutes ? 'var(--status-red)' : 'var(--status-green)',
                      }}
                    >
                      {conn.gap_minutes}m (min {conn.required_minutes}m)
                    </span>
                  </td>
                  <td>
                    {conn.status === 'missed' ? (
                      <span className="badge badge-red">MISSED</span>
                    ) : conn.status === 'at_risk' ? (
                      <span className="badge badge-yellow">AT RISK</span>
                    ) : (
                      <span className="badge badge-green">SAFE</span>
                    )}
                  </td>
                  <td style={{ fontSize: '12px', color: conn.status === 'missed' ? 'var(--status-red)' : 'var(--text-secondary)' }}>
                    {conn.reason}
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
