'use client';

import type { NavPage } from '@/app/page';
import type { SimulationResultJSON } from '@/lib/simulation/engine';

const NAV_ITEMS: { id: NavPage; label: string; icon: string; desc: string }[] = [
  { id: 'dashboard', label: 'Overview', icon: '⬡', desc: 'Executive Dashboard' },
  { id: 'network', label: 'Flight Network', icon: '◎', desc: 'Interactive Map' },
  { id: 'flights', label: 'Flight Ops', icon: '✈', desc: '70 Flights' },
  { id: 'simulator', label: 'Disruption Sim', icon: '⚡', desc: 'Run Scenarios' },
  { id: 'passengers', label: 'Passengers', icon: '◈', desc: 'Connection Impact' },
  { id: 'aircraft', label: 'Aircraft', icon: '◇', desc: '16 + 2 Spare' },
  { id: 'crew', label: 'Crew Monitor', icon: '◎', desc: 'Duty Hours' },
  { id: 'dispatcher', label: 'AI Dispatcher', icon: '◉', desc: 'Recovery AI' },
  { id: 'scenarios', label: 'Scenario Lab', icon: '⬢', desc: 'What-If Analysis' },
  { id: 'analytics', label: 'Analytics', icon: '◫', desc: 'Reports & Charts' },
];

interface SidebarProps {
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
  simulationResult: SimulationResultJSON | null;
}

export default function Sidebar({ activePage, onNavigate, simulationResult }: SidebarProps) {
  const hasSimulation = !!simulationResult;
  const delayedCount = simulationResult?.summary.delayed_flights ?? 0;
  const cancelledCount = simulationResult?.summary.cancelled_flights ?? 0;

  return (
    <aside style={{
      width: '220px',
      minWidth: '220px',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 16px 16px',
        borderBottom: '1px solid var(--border-color)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: 'linear-gradient(135deg, #00d4ff, #3b82f6)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', fontWeight: '800', color: '#000',
            boxShadow: '0 0 15px rgba(0, 212, 255, 0.4)',
          }}>✈</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#00d4ff', letterSpacing: '-0.02em' }}>DOMINO</div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', letterSpacing: '0.15em' }}>SKY</div>
          </div>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', letterSpacing: '0.08em' }}>
          PROMPT WARS 2026
        </div>
      </div>

      {/* Simulation Status Badge */}
      {hasSimulation && (
        <div style={{
          margin: '12px 12px 0',
          padding: '8px 10px',
          background: delayedCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
          border: `1px solid ${delayedCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
          borderRadius: '8px',
          fontSize: '11px',
        }}>
          <div style={{ color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>ACTIVE SIMULATION</div>
          <div style={{ color: delayedCount > 0 ? 'var(--status-red)' : 'var(--status-green)', fontWeight: '700' }}>
            {simulationResult?.params.airport} · {simulationResult?.params.type}
          </div>
          <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
            {delayedCount} delayed · {cancelledCount} cancelled
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
        {NAV_ITEMS.map(item => {
          const isActive = activePage === item.id;
          const needsAlert = hasSimulation && (item.id === 'simulator' || item.id === 'dispatcher' || item.id === 'passengers');
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 10px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '2px',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(59, 130, 246, 0.1))'
                  : 'transparent',
                borderLeft: isActive ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              <span style={{
                fontSize: '15px',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                width: '18px', textAlign: 'center',
                flexShrink: 0,
              }}>{item.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '500',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>{item.label}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>{item.desc}</div>
              </div>
              {needsAlert && hasSimulation && delayedCount > 0 && (
                <span style={{
                  width: '6px', height: '6px',
                  borderRadius: '50%',
                  background: 'var(--status-red)',
                  flexShrink: 0,
                  boxShadow: '0 0 6px rgba(239, 68, 68, 0.8)',
                }} className="pulse-dot" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Dataset info footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border-color)',
        fontSize: '10px',
        color: 'var(--text-muted)',
      }}>
        <div style={{ marginBottom: '4px', fontWeight: '600', color: 'var(--text-secondary)' }}>DATASET</div>
        <div>16 Airports · 70 Flights</div>
        <div>16 Aircraft · 2 Spares</div>
        <div>21 Connections · 16 Crew</div>
      </div>
    </aside>
  );
}
