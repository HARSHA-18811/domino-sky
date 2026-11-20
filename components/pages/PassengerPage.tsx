'use client';

import { useState } from 'react';
import { CONNECTIONS, FLIGHTS, AIRPORTS } from '@/lib/data/dataset';
import type { SimulationResultJSON, ConnectionResult } from '@/lib/simulation/engine';

interface PassengerPageProps {
  simulationResult: SimulationResultJSON | null;
}

interface RebookingAction {
  connectionId: string;
  actionType: 'next_flight' | 'partner_airline' | 'hotel_voucher' | 'refund';
  paxCount: number;
  assignedOption: string;
  timestamp: string;
}

export default function PassengerPage({ simulationResult }: PassengerPageProps) {
  const [selectedConnection, setSelectedConnection] = useState<ConnectionResult | null>(null);
  const [rebookingLog, setRebookingLog] = useState<RebookingAction[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  const totalConnectingPax = CONNECTIONS.reduce((s, c) => s + c.passengers, 0);

  // Connection details from simulation or baseline nominal
  const connectionDetails: ConnectionResult[] =
    simulationResult?.passengerImpact.connection_details ??
    CONNECTIONS.map((c) => {
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

  const missedConnections = connectionDetails.filter((c) => c.status === 'missed');
  const atRiskConnections = connectionDetails.filter((c) => c.status === 'at_risk');
  const safeConnections = connectionDetails.filter((c) => c.status === 'safe');

  const strandedPax = missedConnections.reduce((s, c) => s + c.passengers, 0);
  const atRiskPax = atRiskConnections.reduce((s, c) => s + c.passengers, 0);

  // Handle rebooking passenger action
  const handleExecuteRebooking = (conn: ConnectionResult, actionType: RebookingAction['actionType']) => {
    let assignedOption = '';
    const toFlightData = FLIGHTS.find((f) => f.flight_id === conn.to_flight);
    const dest = toFlightData?.destination ?? 'destination';

    if (actionType === 'next_flight') {
      assignedOption = `Auto-rebooked onto next available flight to ${dest} (Flight DS-Next Morning). Boarding passes sent via SMS.`;
    } else if (actionType === 'partner_airline') {
      assignedOption = `Endorsed onto partner carrier flight to ${dest} departing within 2 hours. Seamless bag transfer tagged.`;
    } else if (actionType === 'hotel_voucher') {
      assignedOption = `Issued Transit Hotel Vouchers + INR 1,500 Meal Coupons at ${conn.airport} Airport Hotel (DGCA Passenger Charter).`;
    } else {
      assignedOption = `Initiated 100% full refund + 20% future travel credit voucher to all ${conn.passengers} passengers.`;
    }

    const logEntry: RebookingAction = {
      connectionId: conn.connection_id,
      actionType,
      paxCount: conn.passengers,
      assignedOption,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    };

    setRebookingLog((prev) => [logEntry, ...prev]);
    setNotification(`✓ ${conn.passengers} Passengers on ${conn.connection_id} Protected: ${assignedOption}`);
    setTimeout(() => setNotification(null), 6000);
    setSelectedConnection(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Notification */}
      {notification && (
        <div
          style={{
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            borderRadius: '10px',
            padding: '14px 18px',
            color: 'var(--status-green)',
            fontWeight: '700',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)',
          }}
        >
          <span style={{ fontSize: '18px' }}>✓</span>
          <span>{notification}</span>
        </div>
      )}

      {/* KPI Cards */}
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
            {missedConnections.length} missed connections requiring rebooking
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rebooked &amp; Protected</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--status-green)', marginTop: '4px' }}>
            {rebookingLog.reduce((s, r) => s + r.paxCount, 0)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {rebookingLog.length} passenger care protocols executed
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>At-Risk Transfers</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: atRiskPax > 0 ? 'var(--status-yellow)' : 'var(--status-green)', marginTop: '4px' }}>
            {atRiskPax}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {atRiskConnections.length} tight buffer transfers (&lt;30m buffer)
          </div>
        </div>
      </div>

      {/* Rebooking Protocol Audit Feed */}
      {rebookingLog.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-cyan)', letterSpacing: '0.08em', marginBottom: '10px' }}>
            RECENT PASSENGER RECOVERY &amp; REBOOKING ACTIONS LOG
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rebookingLog.map((log, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  borderLeft: '4px solid var(--status-green)',
                }}
              >
                <div>
                  <span style={{ fontWeight: '800', color: 'var(--accent-cyan)' }}>{log.connectionId}</span>
                  <span style={{ color: 'var(--text-secondary)', marginLeft: '8px', fontWeight: '600' }}>
                    ({log.paxCount} Passengers)
                  </span>
                  <div style={{ color: 'var(--text-primary)', marginTop: '3px' }}>{log.assignedOption}</div>
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--status-green)', fontWeight: '700' }}>
                  ✓ {log.timestamp} IST
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connections Table with Action Button */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Passenger Connection Ledger (All 21 Transfers)
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              👉 Click <b style={{ color: 'var(--accent-cyan)' }}>"⚡ Rebook / Protect"</b> on <b>ANY</b> transfer below to open the Passenger Care &amp; Rebooking Protocol.
            </div>
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
              <th>Inbound Arr</th>
              <th>Outbound Dep</th>
              <th>Buffer / Gap</th>
              <th>Status</th>
              <th>Action Protocol</th>
            </tr>
          </thead>
          <tbody>
            {connectionDetails.map((conn) => {
              const ap = AIRPORTS.find((a) => a.id === conn.airport);
              const isMissed = conn.status === 'missed';
              const isAtRisk = conn.status === 'at_risk';
              const isResolved = rebookingLog.some((r) => r.connectionId === conn.connection_id);

              return (
                <tr
                  key={conn.connection_id}
                  style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                  onClick={() => setSelectedConnection(conn)}
                >
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
                    <span style={{ fontWeight: '700', color: isMissed ? 'var(--status-red)' : 'var(--text-primary)' }}>
                      {conn.passengers} pax
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
                        color: conn.gap_minutes < conn.required_minutes ? 'var(--status-red)' : isAtRisk ? 'var(--status-yellow)' : 'var(--status-green)',
                      }}
                    >
                      {conn.gap_minutes}m (min {conn.required_minutes}m)
                    </span>
                  </td>
                  <td>
                    {isResolved ? (
                      <span className="badge badge-green">✓ PROTECTED</span>
                    ) : isMissed ? (
                      <span className="badge badge-red">MISSED</span>
                    ) : isAtRisk ? (
                      <span className="badge badge-yellow">AT RISK</span>
                    ) : (
                      <span className="badge badge-green">SAFE</span>
                    )}
                  </td>
                  <td>
                    {isResolved ? (
                      <span style={{ fontSize: '11px', color: 'var(--status-green)', fontWeight: '700' }}>
                        ✓ Care Assigned
                      </span>
                    ) : isMissed ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedConnection(conn);
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #f97316, #ef4444)',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          boxShadow: '0 0 12px rgba(239, 68, 68, 0.4)',
                        }}
                      >
                        ⚡ Rebook Stranded
                      </button>
                    ) : isAtRisk ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedConnection(conn);
                        }}
                        style={{
                          background: 'rgba(234, 179, 8, 0.2)',
                          border: '1px solid rgba(234, 179, 8, 0.5)',
                          borderRadius: '6px',
                          padding: '5px 10px',
                          color: 'var(--status-yellow)',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        ⚡ Protect Transfer
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedConnection(conn);
                        }}
                        style={{
                          background: 'rgba(0, 212, 255, 0.1)',
                          border: '1px solid rgba(0, 212, 255, 0.3)',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          color: 'var(--accent-cyan)',
                          fontSize: '10px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Manage Care
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Rebooking Action Modal */}
      {selectedConnection && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedConnection(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '24px',
              width: '560px',
              maxWidth: '92vw',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.85)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-cyan)' }}>
                    Passenger Recovery &amp; Rebooking Protocol
                  </span>
                  <span className="badge badge-cyan">{selectedConnection.connection_id}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <b>{selectedConnection.passengers} passengers</b> connecting at <b>{selectedConnection.airport}</b> ({selectedConnection.from_flight} ➔ {selectedConnection.to_flight})
                </div>
              </div>
              <button
                onClick={() => setSelectedConnection(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Diagnostic Box */}
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', marginBottom: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Transfer Buffer Diagnosis
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '3px' }}>
                Available buffer: <b>{selectedConnection.gap_minutes} minutes</b> (Minimum requirement: {selectedConnection.required_minutes} minutes)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {selectedConnection.reason}
              </div>
            </div>

            {/* 4 Standard Airline Recovery Options */}
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-cyan)', letterSpacing: '0.08em', marginBottom: '10px' }}>
              SELECT PASSENGER RECOVERY WORKFLOW:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Option 1: Auto Rebook next flight */}
              <button
                onClick={() => handleExecuteRebooking(selectedConnection, 'next_flight')}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-cyan)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)')}
              >
                <div>
                  <div style={{ fontWeight: '700', color: '#fff', fontSize: '13px' }}>
                    1. Auto-Rebook Next Available Service
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Rebook on next scheduled frequency today; dispatch new mobile boarding passes via SMS/WhatsApp.
                  </div>
                </div>
                <span className="badge badge-cyan">RECOMMENDED</span>
              </button>

              {/* Option 2: Partner Carrier Endorsement */}
              <button
                onClick={() => handleExecuteRebooking(selectedConnection, 'partner_airline')}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-blue)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)')}
              >
                <div style={{ fontWeight: '700', color: '#fff', fontSize: '13px' }}>
                  2. Interline Transfer (Partner Airline)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Endorse tickets onto partner carrier operating same route within 2 hours; auto-transfer checked bags.
                </div>
              </button>

              {/* Option 3: Transit Hotel & Food */}
              <button
                onClick={() => handleExecuteRebooking(selectedConnection, 'hotel_voucher')}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--status-yellow)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)')}
              >
                <div style={{ fontWeight: '700', color: '#fff', fontSize: '13px' }}>
                  3. Issue Transit Hotel Vouchers + Meals
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Provide airport hotel room and meal vouchers for overnight layover (DGCA Passenger Charter compliance).
                </div>
              </button>

              {/* Option 4: Full Refund + Travel Credits */}
              <button
                onClick={() => handleExecuteRebooking(selectedConnection, 'refund')}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--status-orange)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)')}
              >
                <div style={{ fontWeight: '700', color: '#fff', fontSize: '13px' }}>
                  4. Instant 100% Refund + 20% Travel Credits
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Cancel journey with immediate full refund to original payment method plus future flight discount credit.
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
