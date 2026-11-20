import { NextResponse } from 'next/server';
import { FLIGHTS, SPARE_AIRCRAFT } from '@/lib/data/dataset';

export async function GET() {
  // Build aircraft roster
  const aircraftMap = new Map<string, { tail_id: string; flights: typeof FLIGHTS; }>();
  for (const f of FLIGHTS) {
    if (!aircraftMap.has(f.tail_id)) aircraftMap.set(f.tail_id, { tail_id: f.tail_id, flights: [] });
    aircraftMap.get(f.tail_id)!.flights.push(f);
  }

  const aircraft = Array.from(aircraftMap.values()).map(a => ({
    tail_id: a.tail_id,
    base: a.flights[0].origin,
    total_flights: a.flights.length,
    flights: a.flights.map(f => f.flight_id),
    is_spare: false,
  }));

  const spares = SPARE_AIRCRAFT.map(s => ({ ...s, is_spare: true, total_flights: 0, flights: [] }));

  return NextResponse.json({ aircraft: [...aircraft, ...spares] });
}
