'use client';

import { useState, useEffect } from 'react';
import type { NavPage } from '@/app/page';
import type { SimulationResultJSON } from '@/lib/simulation/engine';

const PAGE_TITLES: Record<NavPage, string> = {
  dashboard: 'Executive Operations Dashboard',
  network: 'Interactive Flight Network',
  flights: 'Flight Operations',
  simulator: 'Disruption Simulator',
  passengers: 'Passenger Impact Analysis',
  aircraft: 'Aircraft Management',
  crew: 'Crew Duty Monitoring',
  dispatcher: 'AI Recovery Dispatcher',
  scenarios: 'Scenario Laboratory',
  analytics: 'Analytics & Reports',
};

interface TopBarProps {
  activePage: NavPage;
  alerts: { id: string; severity: string; message: string }[];
  isSimulating: boolean;
  simulationResult: SimulationResultJSON | null;
}

export default function TopBar({ activePage, alerts, isSimulating, simulationResult }: TopBarProps) {
  const [showAlerts, setShowAlerts] = useState(false);
  const [timeStr, setTimeStr] = useState('10:30:00');
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      style={{
        height: '56px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: '16px',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* Page title */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          {PAGE_TITLES[activePage]}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
          Domino Sky · Deterministic Simulation Engine v1.0
        </div>
      </div>

      {/* Simulation Status */}
      {isSimulating && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '6px',
            padding: '5px 12px',
            fontSize: '12px',
            color: 'var(--accent-blue)',
            fontWeight: '600',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--accent-blue)',
              display: 'inline-block',
            }}
            className="pulse-dot"
          />
          SIMULATING...
        </div>
      )}

      {/* Network Health */}
      {simulationResult && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background:
              simulationResult.summary.delayed_flights > 0
                ? 'rgba(239, 68, 68, 0.08)'
                : 'rgba(34, 197, 94, 0.08)',
            border: `1px solid ${
              simulationResult.summary.delayed_flights > 0
                ? 'rgba(239, 68, 68, 0.3)'
                : 'rgba(34, 197, 94, 0.3)'
            }`,
            borderRadius: '6px',
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: '600',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background:
                simulationResult.summary.delayed_flights > 0 ? 'var(--status-red)' : 'var(--status-green)',
              display: 'inline-block',
            }}
            className="pulse-dot"
          />
          <span
            style={{
              color:
                simulationResult.summary.delayed_flights > 0 ? 'var(--status-red)' : 'var(--status-green)',
            }}
          >
            {simulationResult.summary.delayed_flights > 0
              ? `${simulationResult.summary.delayed_flights} DELAYED`
              : 'ALL ON TIME'}
          </span>
        </div>
      )}

      {/* Alerts bell */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowAlerts(!showAlerts)}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '7px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: criticalAlerts > 0 ? 'var(--status-red)' : 'var(--text-secondary)',
            fontSize: '13px',
            transition: 'all 0.15s',
          }}
        >
          🔔
          {criticalAlerts > 0 && (
            <span
              style={{
                background: 'var(--status-red)',
                color: 'white',
                borderRadius: '10px',
                fontSize: '10px',
                fontWeight: '700',
                padding: '1px 5px',
                minWidth: '16px',
                textAlign: 'center',
              }}
            >
              {criticalAlerts}
            </span>
          )}
        </button>

        {showAlerts && alerts.length > 0 && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '8px',
              width: '360px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              zIndex: 100,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-color)',
                fontSize: '12px',
                fontWeight: '700',
                color: 'var(--text-secondary)',
                letterSpacing: '0.08em',
              }}
            >
              OPERATIONAL ALERTS ({alerts.length})
            </div>
            {alerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid rgba(26, 47, 74, 0.5)',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ fontSize: '14px', flexShrink: 0 }}>
                  {alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🔵'}
                </span>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                    {alert.message}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                      marginTop: '2px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {alert.severity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clock */}
      <div
        style={{
          fontSize: '13px',
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--accent-cyan)',
          fontWeight: '600',
          letterSpacing: '0.05em',
          background: 'rgba(0, 212, 255, 0.05)',
          padding: '5px 10px',
          borderRadius: '6px',
          border: '1px solid rgba(0, 212, 255, 0.2)',
        }}
      >
        {timeStr} IST
      </div>
    </header>
  );
}
