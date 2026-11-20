import { runSimulation } from './lib/simulation/engine';

console.log('Testing Domino Sky Simulation Engine with BOM 90m Thunderstorm scenario...');

const result = runSimulation({
  airport: 'BOM',
  type: 'Thunderstorm',
  startTime: '14:00',
  durationMinutes: 90,
});

console.log('=== SIMULATION RESULTS ===');
console.log(`Disrupted Airport: ${result.summary.disrupted_airport}`);
console.log(`Closure Window: ${result.summary.closure_start} - ${result.summary.closure_end}`);
console.log(`Total Flights: ${result.summary.total_flights}`);
console.log(`On-Time Flights: ${result.summary.on_time_flights}`);
console.log(`Delayed Flights: ${result.summary.delayed_flights}`);
console.log(`Cancelled Flights: ${result.summary.cancelled_flights}`);
console.log(`Total Delay Minutes: ${result.summary.total_delay_minutes} min`);
console.log(`Average Delay: ${result.summary.average_delay_minutes} min`);
console.log(`Max Cascade Depth: ${result.summary.cascade_depth} legs`);
console.log(`Stranded Passengers: ${result.passengerImpact.stranded}`);
console.log(`Crew Warnings / Violations: ${result.crewWarnings.filter(w => w.violation || w.warning).length}`);
console.log('Test completed successfully!');
