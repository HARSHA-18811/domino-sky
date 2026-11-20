import { NextResponse } from 'next/server';
import { AIRPORTS, FLIGHTS, CREWS, SPARE_AIRCRAFT } from '@/lib/data/dataset';

export async function GET() {
  const totalPax = FLIGHTS.reduce((s, f) => s + f.pax, 0);
  
  // Group flights by aircraft
  const aircraftCount = new Set(FLIGHTS.map(f => f.tail_id)).size;
  
  return NextResponse.json({
    airports: AIRPORTS.length,
    total_flights: FLIGHTS.length,
    total_aircraft: aircraftCount,
    spare_aircraft: SPARE_AIRCRAFT.length,
    total_crews: CREWS.length,
    total_scheduled_pax: totalPax,
    airports_list: AIRPORTS,
    status: 'normal_operations',
    network_health: 100,
  });
}
