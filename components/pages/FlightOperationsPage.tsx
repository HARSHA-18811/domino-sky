'use client';

import { useState, useMemo } from 'react';
import { FLIGHTS, AIRPORTS, type Flight } from '@/lib/data/dataset';
import type { SimulationResultJSON, AffectedFlight } from '@/lib/simulation/engine';

interface FlightOperationsPageProps {
  simulationResult: SimulationResultJSON | null;
}

export default function FlightOperationsPage({ simulationResult }: FlightOperationsPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_time' | 'delayed' | 'cancelled'>('all');
  const [selectedFlight, setSelectedFlight] = useState<AffectedFlight | null>(null);

  // Merge base dataset flights with simulation state
  const enrichedFlights = useMemo(() => {
    return FLIGHTS.map((f) => {
      if (simulationResult) {
        const found = simulationResult.flightStatuses.find((fs) => fs.flight_id === f.flight_id);
        if (found) return found;
      }
      return {
        flight_id: f.flight_id,
        tail_id: f.tail_id,
        origin: f.origin,
        destination: f.destination,
        scheduled_dep: f.dep,
        scheduled_arr: f.arr,
        actual_dep: f.dep,
        actual_arr: f.arr,
        delay_minutes: 0,
        status: 'on_time' as const,
        cause: 'Operating on published schedule',
        pax: f.pax,
      };
    });
  }, [simulationResult]);

  const filteredFlights = enrichedFlights.filter((f) => {
    const matchesSearch =
      f.flight_id.toLowerCase().includes(search.toLowerCase()) ||
      f.origin.toLowerCase().includes(search.toLowerCase()) ||
      f.destination.toLowerCase().includes(search.toLowerCase()) ||
      f.tail_id.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' ? true : f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string, delay: number) => {
    if (status === 'cancelled') return <span className="badge badge-red">CANCELLED</span>;
    if (delay > 120) return <span className="badge badge-red">+{delay}m SEVERE</span>;
    if (delay > 60) return <span className="badge badge-orange">+{delay}m SIGNIFICANT</span>;
    if (delay > 0) return <span className="badge badge-yellow">+{delay}m DELAYED</span>;
    return <span className="badge badge-green">ON TIME</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Flight Operations Schedule ({enrichedFlights.length} Flights)
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Real-time rotation tracking across 16 aircraft. Inspect delays, turnarounds, and upstream root causes.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Search box */}
          <input
            type="text"
            placeholder="Search Flight, City, Tail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              color: 'var(--text-primary)',
              width: '220px',
              outline: 'none',
            }}
          />

          {/* Status filters */}
          <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            {(['all', 'on_time', 'delayed', 'cancelled'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                style={{
                  background: statusFilter === filter ? 'var(--accent-blue)' : 'transparent',
                  color: statusFilter === filter ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {filter.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Flight</th>
              <th>Tail ID</th>
              <th>Route</th>
              <th>Sched Dep / Arr</th>
              <th>Actual Dep / Arr</th>
              <th>Delay</th>
              <th>Pax</th>
              <th>Status</th>
              <th>Root Cause / Details</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredFlights.map((flight) => {
              const origAirport = AIRPORTS.find((a) => a.id === flight.origin);
              const destAirport = AIRPORTS.find((a) => a.id === flight.destination);

              return (
                <tr key={flight.flight_id} style={{ cursor: 'pointer' }} onClick={() => setSelectedFlight(flight)}>
                  <td>
                    <span style={{ fontWeight: '700', color: 'var(--accent-cyan)' }}>{flight.flight_id}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '12px' }}>{flight.tail_id}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: '600' }}>{flight.origin}</span>
                    <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>→</span>
                    <span style={{ fontWeight: '600' }}>{flight.destination}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>
                      {origAirport?.city} to {destAirport?.city}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace' }}>{flight.scheduled_dep}</span>
                    <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>–</span>
                    <span style={{ fontFamily: 'monospace' }}>{flight.scheduled_arr}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', color: flight.delay_minutes > 0 ? 'var(--status-orange)' : 'var(--text-primary)' }}>
                      {flight.actual_dep}
                    </span>
                    <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>–</span>
                    <span style={{ fontFamily: 'monospace', color: flight.delay_minutes > 0 ? 'var(--status-orange)' : 'var(--text-primary)' }}>
                      {flight.actual_arr}
                    </span>
                  </td>
                  <td>
                    {flight.delay_minutes > 0 ? (
                      <span style={{ fontWeight: '700', color: flight.delay_minutes > 120 ? 'var(--status-red)' : 'var(--status-orange)' }}>
                        +{flight.delay_minutes} min
                      </span>
                    ) : (
                      <span style={{ color: 'var(--status-green)' }}>0 min</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: '600' }}>{flight.pax}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}> / 180</span>
                  </td>
                  <td>{getStatusBadge(flight.status, flight.delay_minutes)}</td>
                  <td style={{ maxWidth: '280px', fontSize: '12px', color: flight.delay_minutes > 0 ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                    {flight.cause}
                  </td>
                  <td>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFlight(flight);
                      }}
                      style={{
                        background: 'rgba(0, 212, 255, 0.1)',
                        border: '1px solid rgba(0, 212, 255, 0.3)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        color: 'var(--accent-cyan)',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Flight Detail Modal */}
      {selectedFlight && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedFlight(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '24px',
              width: '520px',
              maxWidth: '90vw',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-cyan)' }}>{selectedFlight.flight_id}</span>
                  {getStatusBadge(selectedFlight.status, selectedFlight.delay_minutes)}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {selectedFlight.origin} → {selectedFlight.destination} · Aircraft: {selectedFlight.tail_id}
                </div>
              </div>
              <button
                onClick={() => setSelectedFlight(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Scheduled Times</div>
                <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '2px' }}>
                  {selectedFlight.scheduled_dep} → {selectedFlight.scheduled_arr}
                </div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Actual Times</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: selectedFlight.delay_minutes > 0 ? 'var(--status-orange)' : 'var(--status-green)', marginTop: '2px' }}>
                  {selectedFlight.actual_dep} → {selectedFlight.actual_arr}
                </div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Passengers Aboard</div>
                <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '2px' }}>
                  {selectedFlight.pax} Passengers ({Math.round((selectedFlight.pax / 180) * 100)}% load factor)
                </div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Delay Minutes</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: selectedFlight.delay_minutes > 0 ? 'var(--status-red)' : 'var(--status-green)', marginTop: '2px' }}>
                  +{selectedFlight.delay_minutes} minutes
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', borderLeft: '3px solid var(--accent-cyan)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Cascade Root Cause Analysis
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {selectedFlight.cause}
              </div>
              {selectedFlight.upstream_flight_id && (
                <div style={{ fontSize: '11px', color: 'var(--status-yellow)', marginTop: '8px' }}>
                  ⚡ Upstream Predecessor: Flight {selectedFlight.upstream_flight_id}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
