'use client';

import { FLIGHTS, AIRPORTS, CREWS, SPARE_AIRCRAFT, CONNECTIONS } from '@/lib/data/dataset';
import type { SimulationResultJSON } from '@/lib/simulation/engine';
import type { NavPage } from '@/app/page';

function KPICard({ label, value, sub, color, icon, onClick }: {
  label: string; value: string | number; sub?: string;
  color: string; icon: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.borderColor = color; }}
      onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)'; }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>{label}</div>
          <div style={{ fontSize: '32px', fontWeight: '800', color, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
          {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>{sub}</div>}
        </div>
        <div style={{ fontSize: '24px', opacity: 0.4 }}>{icon}</div>
      </div>
    </div>
  );
}

interface DashboardPageProps {
  simulationResult: SimulationResultJSON | null;
  onNavigate: (page: NavPage) => void;
}

export default function DashboardPage({ simulationResult, onNavigate }: DashboardPageProps) {
  const totalPax = FLIGHTS.reduce((s, f) => s + f.pax, 0);
  const sim = simulationResult;

  const onTimeFlights = sim ? sim.summary.on_time_flights : FLIGHTS.length;
  const delayedFlights = sim ? sim.summary.delayed_flights : 0;
  const cancelledFlights = sim ? sim.summary.cancelled_flights : 0;
  const affectedPax = sim ? sim.passengerImpact.total_affected : 0;
  const strandedPax = sim ? sim.passengerImpact.stranded : 0;
  const missedConnections = sim ? sim.passengerImpact.missed_connections : 0;
  const crewViolations = sim ? sim.crewWarnings.filter(w => w.violation).length : 0;
  const networkHealth = sim ? Math.round((onTimeFlights / FLIGHTS.length) * 100) : 100;

  const recentAlerts = sim?.alerts.slice(0, 6) ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header banner */}
      {!sim ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          borderRadius: '12px',
          padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-cyan)', marginBottom: '4px' }}>
              ✈ Normal Operations — All Systems Nominal
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              {FLIGHTS.length} flights scheduled · {AIRPORTS.length} airports active · 2 spare aircraft on standby
            </div>
          </div>
          <button
            onClick={() => onNavigate('simulator')}
            style={{
              background: 'linear-gradient(135deg, #00d4ff, #3b82f6)',
              border: 'none', borderRadius: '8px',
              padding: '10px 20px', cursor: 'pointer',
              color: '#000', fontWeight: '700', fontSize: '13px',
              boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)',
            }}
          >
            ⚡ Run Disruption Simulation
          </button>
        </div>
      ) : (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(249, 115, 22, 0.05) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--status-red)', marginBottom: '4px' }}>
              ⚠ Disruption Active: {sim.params.type.toUpperCase()} at {sim.params.airport}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Airport closed {sim.params.startTime}–{sim.summary.closure_end} · {sim.params.durationMinutes}min duration · 
              Cascade depth: {sim.summary.cascade_depth} flights
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => onNavigate('dispatcher')} style={{
              background: 'linear-gradient(135deg, #00d4ff, #3b82f6)',
              border: 'none', borderRadius: '8px',
              padding: '10px 16px', cursor: 'pointer',
              color: '#000', fontWeight: '700', fontSize: '12px',
            }}>AI Recovery</button>
            <button onClick={() => onNavigate('simulator')} style={{
              background: 'transparent',
              border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px',
              padding: '10px 16px', cursor: 'pointer',
              color: 'var(--status-red)', fontWeight: '600', fontSize: '12px',
            }}>Re-Simulate</button>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <KPICard label="Total Flights" value={FLIGHTS.length} sub="Scheduled today" color="#3b82f6" icon="✈" />
        <KPICard label="On Time" value={onTimeFlights} sub={`${Math.round((onTimeFlights/FLIGHTS.length)*100)}% operational`} color="#22c55e" icon="✓" onClick={() => onNavigate('flights')} />
        <KPICard label="Delayed" value={delayedFlights} sub={sim ? `Avg ${sim.summary.average_delay_minutes}min delay` : 'No disruption'} color={delayedFlights > 0 ? '#f97316' : '#22c55e'} icon="⏱" onClick={() => onNavigate('flights')} />
        <KPICard label="Cancelled" value={cancelledFlights} sub="Operational impact" color={cancelledFlights > 0 ? '#ef4444' : '#22c55e'} icon="✕" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <KPICard label="Affected Pax" value={affectedPax.toLocaleString()} sub={`of ${totalPax.toLocaleString()} total`} color="#f97316" icon="◈" onClick={() => onNavigate('passengers')} />
        <KPICard label="Stranded Pax" value={strandedPax} sub="Missed connections" color={strandedPax > 0 ? '#ef4444' : '#22c55e'} icon="⚠" onClick={() => onNavigate('passengers')} />
        <KPICard label="Aircraft" value={16} sub={`+${SPARE_AIRCRAFT.length} spare available`} color="#8b5cf6" icon="◇" onClick={() => onNavigate('aircraft')} />
        <KPICard label="Crew Violations" value={crewViolations} sub={crewViolations > 0 ? 'Duty hour exceeded' : 'All within limits'} color={crewViolations > 0 ? '#ef4444' : '#22c55e'} icon="◎" onClick={() => onNavigate('crew')} />
      </div>

      {/* Network Health + Recent Events */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Network Health */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: '16px' }}>
            NETWORK HEALTH INDICATOR
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-color)" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="none"
                  stroke={networkHealth > 80 ? '#22c55e' : networkHealth > 50 ? '#f97316' : '#ef4444'}
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 40 * networkHealth / 100} ${2 * Math.PI * 40}`}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column',
              }}>
                <div style={{ fontSize: '24px', fontWeight: '800', color: networkHealth > 80 ? '#22c55e' : networkHealth > 50 ? '#f97316' : '#ef4444' }}>
                  {networkHealth}%
                </div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              {[
                { label: 'On-Time Rate', value: `${onTimeFlights}/${FLIGHTS.length}`, pct: onTimeFlights/FLIGHTS.length, color: '#22c55e' },
                { label: 'Delay Impact', value: sim ? `${sim.summary.total_delay_minutes}min` : '0min', pct: sim ? Math.min(sim.summary.total_delay_minutes / 1000, 1) : 0, color: '#f97316' },
                { label: 'Connections Safe', value: sim ? `${sim.passengerImpact.safe_connections}/${CONNECTIONS.length}` : `${CONNECTIONS.length}/${CONNECTIONS.length}`, pct: sim ? sim.passengerImpact.safe_connections/CONNECTIONS.length : 1, color: '#3b82f6' },
              ].map(item => (
                <div key={item.label} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span style={{ color: item.color, fontWeight: '600' }}>{item.value}</span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${item.pct * 100}%`, background: item.color, borderRadius: '2px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: '16px' }}>
            RECENT OPERATIONAL EVENTS
          </div>
          {recentAlerts.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>✓</div>
              No active disruptions — all systems normal
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentAlerts.map(alert => (
                <div key={alert.id} style={{
                  display: 'flex', gap: '10px', alignItems: 'flex-start',
                  padding: '8px 10px',
                  background: alert.severity === 'critical' ? 'rgba(239,68,68,0.06)' : alert.severity === 'warning' ? 'rgba(234,179,8,0.06)' : 'rgba(0,212,255,0.04)',
                  borderRadius: '6px',
                  borderLeft: `2px solid ${alert.severity === 'critical' ? '#ef4444' : alert.severity === 'warning' ? '#eab308' : '#00d4ff'}`,
                }}>
                  <span>{alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🔵'}</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', flex: 1 }}>{alert.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
        {[
          { label: 'Airports', value: AIRPORTS.length, icon: '◎' },
          { label: 'Aircraft', value: 16, icon: '✈' },
          { label: 'Spare Aircraft', value: SPARE_AIRCRAFT.length, icon: '◇' },
          { label: 'Connections', value: CONNECTIONS.length, icon: '◈' },
          { label: 'Crew Teams', value: CREWS.length, icon: '◎' },
        ].map(item => (
          <div key={item.label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: '10px', padding: '14px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <span style={{ fontSize: '20px', color: 'var(--accent-cyan)', opacity: 0.6 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>{item.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
