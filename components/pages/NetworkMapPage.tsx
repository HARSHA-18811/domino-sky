'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AIRPORTS, FLIGHTS } from '@/lib/data/dataset';
import { timeToMins, minsToTime, type SimulationResultJSON } from '@/lib/simulation/engine';

// Dynamic import with ssr: false for Leaflet
const FlightMap = dynamic(() => import('@/components/FlightMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060d1f', color: '#00d4ff' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '32px' }}>✈</span>
        <div style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.08em' }}>LOADING INDIAN AIRSPACE RADAR...</div>
      </div>
    </div>
  ),
});

interface NetworkMapPageProps {
  simulationResult: SimulationResultJSON | null;
}

export default function NetworkMapPage({ simulationResult }: NetworkMapPageProps) {
  const [selectedAirport, setSelectedAirport] = useState<string | null>(null);
  const [currentTimeMins, setCurrentTimeMins] = useState(14 * 60); // 14:00 default (disruption time)
  const [isPlaying, setIsPlaying] = useState(false);
  const [showWeather, setShowWeather] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'delayed' | 'inflight'>('all');

  // Play animation timer (steps 5 minutes every 500ms)
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTimeMins((prev) => {
          if (prev >= 22 * 60) return 6 * 60; // loop back to 06:00
          return prev + 5;
        });
      }, 400);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const currentTimeStr = minsToTime(currentTimeMins);

  const selectedAirportData = selectedAirport ? AIRPORTS.find((a) => a.id === selectedAirport) : null;
  const airportFlights = selectedAirport
    ? FLIGHTS.filter((f) => f.origin === selectedAirport || f.destination === selectedAirport)
    : [];

  // Count active in-flight planes right now
  const activeInFlightCount = FLIGHTS.filter((f) => {
    const simF = simulationResult?.flightStatuses.find((s) => s.flight_id === f.flight_id);
    const depM = simF ? timeToMins(simF.actual_dep) : timeToMins(f.dep);
    const arrM = simF ? timeToMins(simF.actual_arr) : timeToMins(f.arr);
    return currentTimeMins >= depM && currentTimeMins <= arrM;
  }).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - 100px)' }}>
      {/* Top Map Mission Control Bar */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        {/* Playback Controls & Timeline Scrubber */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '320px' }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              background: isPlaying ? 'var(--status-red)' : 'linear-gradient(135deg, #00d4ff, #3b82f6)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              color: isPlaying ? '#fff' : '#000',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isPlaying ? '⏸ PAUSE' : '▶ PLAY RADAR'}
          </button>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>06:00</span>
            <input
              type="range"
              min={6 * 60}
              max={22 * 60}
              step={5}
              value={currentTimeMins}
              onChange={(e) => {
                setCurrentTimeMins(Number(e.target.value));
                setIsPlaying(false);
              }}
              style={{ flex: 1, accentColor: 'var(--accent-cyan)' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>22:00</span>
          </div>

          <div
            style={{
              background: 'rgba(0, 212, 255, 0.1)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              borderRadius: '6px',
              padding: '6px 12px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '13px',
              fontWeight: '800',
              color: 'var(--accent-cyan)',
              minWidth: '105px',
              textAlign: 'center',
            }}
          >
            ⏱ {currentTimeStr} IST
          </div>
        </div>

        {/* View Mode Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Weather radar toggle */}
          <button
            onClick={() => setShowWeather(!showWeather)}
            style={{
              background: showWeather ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-secondary)',
              border: `1px solid ${showWeather ? 'rgba(239, 68, 68, 0.5)' : 'var(--border-color)'}`,
              borderRadius: '8px',
              padding: '7px 12px',
              color: showWeather ? 'var(--status-red)' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ⛈️ Weather Radar {showWeather ? 'ON' : 'OFF'}
          </button>

          {/* Filter Pills */}
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            {(['all', 'delayed', 'inflight'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                style={{
                  background: filterMode === mode ? 'var(--accent-blue)' : 'transparent',
                  color: filterMode === mode ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {mode === 'all' ? 'All Routes' : mode === 'delayed' ? 'Delayed Only' : `In Flight (${activeInFlightCount})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Map + Right Operations Drawer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Leaflet Interactive Map Container */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
          <FlightMap
            simulationResult={simulationResult}
            onSelectAirport={setSelectedAirport}
            selectedAirport={selectedAirport}
            currentTime={currentTimeStr}
            showWeather={showWeather}
            filterMode={filterMode}
          />
        </div>

        {/* Right Drawer: Airport / Network Live Feed */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflowY: 'auto',
          }}
        >
          {selectedAirportData ? (
            <>
              {/* Selected Airport Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent-cyan)' }}>
                    {selectedAirportData.id}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {selectedAirportData.city}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selectedAirportData.name}</div>
                </div>
                <button
                  onClick={() => setSelectedAirport(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '16px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* Airport Specs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', fontSize: '11px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px' }}>AIRPORT TIER</span>
                  <span style={{ fontWeight: '700' }}>{selectedAirportData.tier.replace('_', ' ').toUpperCase()}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px' }}>RUNWAY CAPACITY</span>
                  <span style={{ fontWeight: '700' }}>{selectedAirportData.capacity_per_hour} fl/hr</span>
                </div>
              </div>

              {/* Flights Ledger for this Airport */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Scheduled Flights ({airportFlights.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '360px', overflowY: 'auto' }}>
                  {airportFlights.map((fl) => {
                    const simF = simulationResult?.flightStatuses.find((s) => s.flight_id === fl.flight_id);
                    const delay = simF?.delay_minutes ?? 0;
                    const isDeparting = fl.origin === selectedAirportData.id;

                    return (
                      <div
                        key={fl.flight_id}
                        style={{
                          background: 'var(--bg-secondary)',
                          borderLeft: `3px solid ${delay > 60 ? '#ef4444' : delay > 0 ? '#f97316' : '#22c55e'}`,
                          padding: '8px 10px',
                          borderRadius: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '700', color: 'var(--accent-cyan)', fontSize: '12px' }}>{fl.flight_id}</span>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: delay > 0 ? '#f97316' : '#22c55e' }}>
                            {delay > 0 ? `+${delay}m DELAY` : 'ON TIME'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {isDeparting ? `🛫 Outbound to ${fl.destination}` : `🛬 Inbound from ${fl.origin}`} · {fl.dep}–{fl.arr}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Aircraft: {fl.tail_id} · {fl.pax} Passengers
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Network Overview Summary */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  AIRSPACE MISSION STATUS
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Click any airport node on the radar map to inspect scheduled departures and arrivals.
                </div>
              </div>

              {simulationResult ? (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--status-red)', textTransform: 'uppercase' }}>
                    Active Disruption Incident
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
                    {simulationResult.params.airport} · {simulationResult.params.type.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Window: {simulationResult.params.startTime} - {simulationResult.summary.closure_end} ({simulationResult.params.durationMinutes}m)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginTop: '10px' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#f97316' }}>{simulationResult.summary.delayed_flights}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Delayed Flights</span>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#ef4444' }}>{simulationResult.passengerImpact.stranded}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Stranded Pax</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--status-green)' }}>
                    ✓ Normal Operations
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Airspace open. No ground stops or flow restrictions active.
                  </div>
                </div>
              )}

              {/* Key Airports List */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  16 Monitored Air Hubs
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '280px', overflowY: 'auto' }}>
                  {AIRPORTS.map((ap) => {
                    const isDis = simulationResult?.params.airport === ap.id;
                    const hasDelay = simulationResult?.flightStatuses.some(
                      (f) => (f.origin === ap.id || f.destination === ap.id) && f.delay_minutes > 0
                    );

                    return (
                      <div
                        key={ap.id}
                        onClick={() => setSelectedAirport(ap.id)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: isDis ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: isDis ? '#ef4444' : hasDelay ? '#f97316' : '#22c55e',
                            }}
                          />
                          <span style={{ fontWeight: '700', fontSize: '12px' }}>{ap.id}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ap.city}</span>
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{ap.tier.replace('_', ' ')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
