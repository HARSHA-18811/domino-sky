'use client';

import { useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import DashboardPage from '@/components/pages/DashboardPage';
import NetworkMapPage from '@/components/pages/NetworkMapPage';
import SimulatorPage from '@/components/pages/SimulatorPage';
import FlightOperationsPage from '@/components/pages/FlightOperationsPage';
import PassengerPage from '@/components/pages/PassengerPage';
import AircraftPage from '@/components/pages/AircraftPage';
import CrewPage from '@/components/pages/CrewPage';
import DispatcherPage from '@/components/pages/DispatcherPage';
import ScenarioLabPage from '@/components/pages/ScenarioLabPage';
import AnalyticsPage from '@/components/pages/AnalyticsPage';
import type { SimulationResultJSON } from '@/lib/simulation/engine';

export type NavPage = 
  | 'dashboard' | 'network' | 'flights' | 'simulator'
  | 'passengers' | 'aircraft' | 'crew' | 'dispatcher'
  | 'scenarios' | 'analytics';

export default function Home() {
  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const [simulationResult, setSimulationResult] = useState<SimulationResultJSON | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [alerts, setAlerts] = useState<{ id: string; severity: string; message: string }[]>([]);

  const handleSimulationComplete = useCallback((result: SimulationResultJSON) => {
    setSimulationResult(result);
    setAlerts(result.alerts.slice(0, 5));
  }, []);

  const handleNavigate = useCallback((page: NavPage) => {
    setActivePage(page);
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardPage simulationResult={simulationResult} onNavigate={handleNavigate} />;
      case 'network': return <NetworkMapPage simulationResult={simulationResult} />;
      case 'flights': return <FlightOperationsPage simulationResult={simulationResult} />;
      case 'simulator': return <SimulatorPage onSimulationComplete={handleSimulationComplete} onNavigate={handleNavigate} isSimulating={isSimulating} setIsSimulating={setIsSimulating} />;
      case 'passengers': return <PassengerPage simulationResult={simulationResult} />;
      case 'aircraft': return <AircraftPage simulationResult={simulationResult} />;
      case 'crew': return <CrewPage simulationResult={simulationResult} />;
      case 'dispatcher': return <DispatcherPage simulationResult={simulationResult} onSimulationComplete={handleSimulationComplete} />;
      case 'scenarios': return <ScenarioLabPage onSimulationComplete={handleSimulationComplete} />;
      case 'analytics': return <AnalyticsPage simulationResult={simulationResult} />;
      default: return <DashboardPage simulationResult={simulationResult} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      <Sidebar activePage={activePage} onNavigate={handleNavigate} simulationResult={simulationResult} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar 
          activePage={activePage} 
          alerts={alerts} 
          isSimulating={isSimulating}
          simulationResult={simulationResult}
        />
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
