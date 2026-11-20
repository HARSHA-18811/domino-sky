// Domino Sky - Deterministic Simulation Engine
// Pure TypeScript - deterministic calculations (no LLMs used for math)

import {
  FLIGHTS,
  CONNECTIONS,
  CREWS,
  SPARE_AIRCRAFT,
  AIRPORTS,
  type Flight,
  type Connection,
  type Crew,
} from '../data/dataset';

// ─── Time Utilities ───────────────────────────────────────────────────────────

export function timeToMins(t: string): number {
  if (!t || !t.includes(':')) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minsToTime(mins: number): string {
  const totalMins = Math.max(0, mins);
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addMins(t: string, mins: number): string {
  return minsToTime(timeToMins(t) + mins);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type FlightStatus = 'on_time' | 'delayed' | 'cancelled' | 'diverted';
export type ConnectionStatus = 'safe' | 'at_risk' | 'missed';
export type AircraftState = 'available' | 'scheduled' | 'in_flight' | 'delayed' | 'grounded' | 'spare';

export interface DisruptionParams {
  airport: string;
  startTime: string;      // "HH:MM"
  durationMinutes: number;
  type: string;
  scenarioName?: string;
}

export interface RecoveryAction {
  type: 'cancel_flight' | 'assign_spare' | 'swap_aircraft' | 'reassign_crew' | 'protect_connection';
  flightId?: string;
  spareAircraftId?: string;
  fromFlightId?: string;
  toFlightId?: string;
}

export interface AffectedFlight {
  flight_id: string;
  tail_id: string;
  origin: string;
  destination: string;
  scheduled_dep: string;
  scheduled_arr: string;
  actual_dep: string;
  actual_arr: string;
  delay_minutes: number;
  status: FlightStatus;
  cause: string;
  upstream_flight_id?: string;
  pax: number;
}

export interface ConnectionResult {
  connection_id: string;
  airport: string;
  from_flight: string;
  to_flight: string;
  passengers: number;
  status: ConnectionStatus;
  from_actual_arr: string;
  to_actual_dep: string;
  gap_minutes: number;
  required_minutes: number;
  reason: string;
}

export interface CrewWarning {
  crew_id: string;
  tail_id: string;
  duty_start: string;
  scheduled_end: string;
  actual_end: string;
  scheduled_duty_mins: number;
  actual_duty_mins: number;
  max_duty_mins: number;
  violation: boolean;
  warning: boolean;
  affected_flights: string[];
  violation_reason: string;
}

export interface AircraftStatus {
  tail_id: string;
  base: string;
  state: AircraftState;
  current_flight?: string;
  current_location?: string;
  next_flight?: string;
  available_at?: string;
  delay_minutes: number;
  is_spare: boolean;
  rotation: string[];
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  flight_id?: string;
  airport?: string;
  timestamp: string;
}

export interface PassengerImpact {
  total_affected: number;
  missed_connections: number;
  at_risk_connections: number;
  stranded: number;
  safe_connections: number;
  connection_details: ConnectionResult[];
}

export interface SimulationSummary {
  total_flights: number;
  on_time_flights: number;
  delayed_flights: number;
  cancelled_flights: number;
  total_delay_minutes: number;
  average_delay_minutes: number;
  disrupted_airport: string;
  closure_start: string;
  closure_end: string;
  cascade_depth: number;
}

export interface SimulationResultJSON {
  id: string;
  params: DisruptionParams;
  recovery?: RecoveryAction;
  flightStatuses: AffectedFlight[];
  passengerImpact: PassengerImpact;
  crewWarnings: CrewWarning[];
  aircraftStatuses: AircraftStatus[];
  alerts: Alert[];
  summary: SimulationSummary;
  timestamp: string;
}

export interface RecoveryRecommendation {
  id: string;
  action: RecoveryAction;
  title: string;
  reason: string;
  expected_delayed_flights: number;
  expected_delayed_reduction: number;
  expected_pax_saved: number;
  affected_flight?: string;
  constraints: string[];
  advantages: string[];
  disadvantages: string[];
  confidence: 'high' | 'medium' | 'low';
  priority: number;
}

// ─── Simulation Engine Algorithm ──────────────────────────────────────────────

export function runSimulation(params: DisruptionParams, recoveryAction?: RecoveryAction): SimulationResultJSON {
  const simId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const alerts: Alert[] = [];
  let alertCounter = 0;

  function addAlert(severity: Alert['severity'], message: string, flightId?: string, airport?: string) {
    alerts.push({
      id: `alert_${++alertCounter}`,
      severity,
      message,
      flight_id: flightId,
      airport,
      timestamp: new Date().toISOString(),
    });
  }

  const closureStartMins = timeToMins(params.startTime);
  const closureEndMins = closureStartMins + params.durationMinutes;

  addAlert(
    'critical',
    `${params.type.toUpperCase()} at ${params.airport}: Airport closed from ${params.startTime} to ${minsToTime(closureEndMins)} (${params.durationMinutes} min)`,
    undefined,
    params.airport
  );

  const actualDep = new Map<string, number>();
  const actualArr = new Map<string, number>();
  const flightDelay = new Map<string, number>();
  const flightStatus = new Map<string, FlightStatus>();
  const delayCause = new Map<string, string>();
  const upstreamFlight = new Map<string, string>();

  for (const f of FLIGHTS) {
    actualDep.set(f.flight_id, timeToMins(f.dep));
    actualArr.set(f.flight_id, timeToMins(f.arr));
    flightDelay.set(f.flight_id, 0);
    flightStatus.set(f.flight_id, 'on_time');
  }

  const cancelledFlights = new Set<string>();
  if (recoveryAction?.type === 'cancel_flight' && recoveryAction.flightId) {
    cancelledFlights.add(recoveryAction.flightId);
  }

  // Group flights by aircraft rotation
  const aircraftRotation = new Map<string, Flight[]>();
  for (const f of FLIGHTS) {
    if (!aircraftRotation.has(f.tail_id)) aircraftRotation.set(f.tail_id, []);
    aircraftRotation.get(f.tail_id)!.push(f);
  }
  for (const [, legs] of aircraftRotation) {
    legs.sort((a, b) => a.leg_order - b.leg_order);
  }

  // Propagate along aircraft rotations
  for (const [tailId, legs] of aircraftRotation) {
    for (let i = 0; i < legs.length; i++) {
      const flight = legs[i];
      const fid = flight.flight_id;

      if (cancelledFlights.has(fid)) {
        flightStatus.set(fid, 'cancelled');
        addAlert('warning', `Flight ${fid} cancelled as recovery action`, fid);
        continue;
      }

      let delayMins = flightDelay.get(fid) ?? 0;
      let depMins = actualDep.get(fid)!;
      let cause = delayCause.get(fid) ?? '';

      // Case A: Departure from disrupted airport during closure
      if (flight.origin === params.airport) {
        if (depMins < closureEndMins && depMins >= closureStartMins) {
          const pushTo = closureEndMins;
          if (pushTo > depMins) {
            const extraDelay = pushTo - depMins;
            if (extraDelay > delayMins) {
              delayMins = extraDelay;
              cause = `Airport ${params.airport} closed (${params.type}) until ${minsToTime(closureEndMins)} — departure held`;
              addAlert('critical', `${fid}: Departure held ${delayMins}min due to ${params.type}`, fid, params.airport);
            }
          }
        }
      }

      // Case B: Arrival at disrupted airport during closure
      if (flight.destination === params.airport) {
        const scheduledArr = timeToMins(flight.arr);
        const wouldArriveAt = depMins + flight.block_minutes;
        if (wouldArriveAt >= closureStartMins && wouldArriveAt <= closureEndMins) {
          const extraDelay = closureEndMins - wouldArriveAt;
          if (extraDelay > 0) {
            delayMins = Math.max(delayMins, extraDelay);
            cause = `Cannot land at ${params.airport} during ${params.type} — holding until ${minsToTime(closureEndMins)}`;
            addAlert('warning', `${fid}: Holding arrival at ${params.airport} — delayed ${delayMins}min`, fid, params.airport);
          }
        }
      }

      // Case C: Aircraft turnaround dependency from previous leg
      if (i > 0) {
        const prevFlight = legs[i - 1];
        const prevFid = prevFlight.flight_id;

        if (!cancelledFlights.has(prevFid)) {
          const prevActualArr = actualArr.get(prevFid)!;
          const turnaround = flight.turnaround_before_min ?? 30;
          const earliestDep = prevActualArr + turnaround;

          if (earliestDep > depMins + delayMins) {
            const rotationDelay = earliestDep - (depMins + delayMins);
            delayMins += rotationDelay;
            if (!cause) {
              cause = `Rotational delay: Aircraft ${tailId} arriving late on ${prevFid} + ${turnaround}m turnaround required`;
              upstreamFlight.set(fid, prevFid);
            } else {
              cause += ` | compounded by upstream rotation from ${prevFid}`;
              upstreamFlight.set(fid, prevFid);
            }
            addAlert(delayMins > 120 ? 'critical' : 'warning', `${fid}: Rotational cascading delay +${delayMins}m from ${prevFid}`, fid);
          }
        }
      }

      // Spare aircraft assignment recovery
      if (recoveryAction?.type === 'assign_spare' && recoveryAction.flightId === fid && recoveryAction.spareAircraftId) {
        const spare = SPARE_AIRCRAFT.find((s) => s.tail_id === recoveryAction.spareAircraftId);
        if (spare && spare.base === flight.origin) {
          delayMins = 0;
          cause = `Spare aircraft ${recoveryAction.spareAircraftId} deployed at ${spare.base} — delay eliminated`;
          addAlert('info', `${fid}: Spare aircraft ${recoveryAction.spareAircraftId} assigned — on-time departure restored`, fid);
        }
      }

      actualDep.set(fid, timeToMins(flight.dep) + delayMins);
      actualArr.set(fid, timeToMins(flight.arr) + delayMins);
      flightDelay.set(fid, delayMins);

      if (delayMins === 0) {
        flightStatus.set(fid, 'on_time');
      } else {
        flightStatus.set(fid, 'delayed');
      }
      delayCause.set(fid, cause || 'Operating on published schedule');
    }
  }

  // Build AffectedFlight array
  const flightStatusList: AffectedFlight[] = FLIGHTS.map((f) => {
    const delay = flightDelay.get(f.flight_id) ?? 0;
    const status = cancelledFlights.has(f.flight_id) ? 'cancelled' : (flightStatus.get(f.flight_id) ?? 'on_time');
    return {
      flight_id: f.flight_id,
      tail_id: f.tail_id,
      origin: f.origin,
      destination: f.destination,
      scheduled_dep: f.dep,
      scheduled_arr: f.arr,
      actual_dep: minsToTime(actualDep.get(f.flight_id)!),
      actual_arr: minsToTime(actualArr.get(f.flight_id)!),
      delay_minutes: delay,
      status,
      cause: delayCause.get(f.flight_id) ?? 'Operating on published schedule',
      upstream_flight_id: upstreamFlight.get(f.flight_id),
      pax: f.pax,
    };
  });

  // Evaluate Passenger Connections
  const connectionResults: ConnectionResult[] = [];
  for (const conn of CONNECTIONS) {
    const fromActualArr = actualArr.get(conn.from_flight)!;
    const toActualDep = actualDep.get(conn.to_flight)!;
    const gapMinutes = toActualDep - fromActualArr;

    let status: ConnectionStatus;
    let reason: string;

    const fromCancelled = cancelledFlights.has(conn.from_flight);
    const toCancelled = cancelledFlights.has(conn.to_flight);

    if (fromCancelled) {
      status = 'missed';
      reason = `Inbound flight ${conn.from_flight} was cancelled`;
    } else if (toCancelled) {
      status = 'missed';
      reason = `Connecting flight ${conn.to_flight} was cancelled`;
    } else if (gapMinutes >= conn.min_connect_minutes) {
      if (gapMinutes < conn.min_connect_minutes + 30) {
        status = 'at_risk';
        reason = `Tight transit buffer: only ${gapMinutes}m gap (minimum required: ${conn.min_connect_minutes}m)`;
      } else {
        status = 'safe';
        reason = `Connection safe: ${gapMinutes}m transfer buffer (minimum required: ${conn.min_connect_minutes}m)`;
      }
    } else {
      status = 'missed';
      reason = `Connection missed: Transfer window breached. Gap is ${gapMinutes}m, required: ${conn.min_connect_minutes}m`;
    }

    connectionResults.push({
      connection_id: conn.connection_id,
      airport: conn.airport,
      from_flight: conn.from_flight,
      to_flight: conn.to_flight,
      passengers: conn.passengers,
      status,
      from_actual_arr: minsToTime(fromActualArr),
      to_actual_dep: minsToTime(toActualDep),
      gap_minutes: gapMinutes,
      required_minutes: conn.min_connect_minutes,
      reason,
    });
  }

  const missedPax = connectionResults.filter((c) => c.status === 'missed').reduce((s, c) => s + c.passengers, 0);
  const atRiskPax = connectionResults.filter((c) => c.status === 'at_risk').reduce((s, c) => s + c.passengers, 0);
  const safePax = connectionResults.filter((c) => c.status === 'safe').reduce((s, c) => s + c.passengers, 0);
  const affectedPax = flightStatusList.filter((f) => f.status !== 'on_time').reduce((s, f) => s + f.pax, 0);

  const passengerImpact: PassengerImpact = {
    total_affected: affectedPax,
    missed_connections: missedPax,
    at_risk_connections: atRiskPax,
    stranded: missedPax,
    safe_connections: safePax,
    connection_details: connectionResults,
  };

  // Evaluate Crew Duty Hours
  const crewWarnings: CrewWarning[] = [];
  for (const crew of CREWS) {
    const crewFlights = FLIGHTS.filter((f) => crew.flight_ids.includes(f.flight_id));
    if (crewFlights.length === 0) continue;

    const lastFlight = crewFlights[crewFlights.length - 1];
    const scheduledEnd = lastFlight.arr;
    const actualArrMins = actualArr.get(lastFlight.flight_id) ?? timeToMins(lastFlight.arr);
    const actualEnd = minsToTime(actualArrMins);

    const dutyStartMins = timeToMins(crew.duty_start);
    const scheduledDutyMins = timeToMins(scheduledEnd) - dutyStartMins;
    const actualDutyMins = actualArrMins - dutyStartMins;

    const violation = actualDutyMins > crew.max_duty_mins;
    const warning = actualDutyMins > crew.max_duty_mins * 0.9;
    const affectedCrewFlights = crew.flight_ids.filter((fid) => (flightDelay.get(fid) ?? 0) > 0);

    let violationReason = 'Operating within legal regulatory flight duty period limits.';
    if (violation) {
      violationReason = `Duty time (${actualDutyMins}m) exceeds legal 600m ceiling by ${actualDutyMins - crew.max_duty_mins}m. Replacement crew required.`;
    } else if (warning) {
      violationReason = `Duty time (${actualDutyMins}m) approaching 600m ceiling (${Math.round((actualDutyMins / crew.max_duty_mins) * 100)}% utilization).`;
    }

    crewWarnings.push({
      crew_id: crew.crew_id,
      tail_id: crew.tail_id,
      duty_start: crew.duty_start,
      scheduled_end: scheduledEnd,
      actual_end: actualEnd,
      scheduled_duty_mins: scheduledDutyMins,
      actual_duty_mins: actualDutyMins,
      max_duty_mins: crew.max_duty_mins,
      violation,
      warning,
      affected_flights: affectedCrewFlights,
      violation_reason: violationReason,
    });
  }

  // Aircraft Statuses
  const aircraftStatuses: AircraftStatus[] = [];
  for (const [tailId, legs] of aircraftRotation) {
    const delayedLegs = legs.filter((f) => (flightDelay.get(f.flight_id) ?? 0) > 0);
    const lastLeg = legs[legs.length - 1];
    const lastActualArr = actualArr.get(lastLeg.flight_id)!;

    aircraftStatuses.push({
      tail_id: tailId,
      base: legs[0].origin,
      state: delayedLegs.length > 0 ? 'delayed' : 'scheduled',
      current_location: lastLeg.destination,
      available_at: minsToTime(lastActualArr),
      delay_minutes: flightDelay.get(lastLeg.flight_id) ?? 0,
      is_spare: false,
      rotation: legs.map((f) => f.flight_id),
    });
  }

  for (const spare of SPARE_AIRCRAFT) {
    const isAssigned = recoveryAction?.type === 'assign_spare' && recoveryAction.spareAircraftId === spare.tail_id;
    aircraftStatuses.push({
      tail_id: spare.tail_id,
      base: spare.base,
      state: isAssigned ? 'scheduled' : 'available',
      current_location: spare.base,
      available_at: spare.available_from,
      delay_minutes: 0,
      is_spare: true,
      rotation: [],
    });
  }

  const delayedList = flightStatusList.filter((f) => f.status === 'delayed');
  const cancelledList = flightStatusList.filter((f) => f.status === 'cancelled');
  const onTimeList = flightStatusList.filter((f) => f.status === 'on_time');
  const totalDelayMins = delayedList.reduce((s, f) => s + f.delay_minutes, 0);

  const summary: SimulationSummary = {
    total_flights: FLIGHTS.length,
    on_time_flights: onTimeList.length,
    delayed_flights: delayedList.length,
    cancelled_flights: cancelledList.length,
    total_delay_minutes: totalDelayMins,
    average_delay_minutes: delayedList.length > 0 ? Math.round(totalDelayMins / delayedList.length) : 0,
    disrupted_airport: params.airport,
    closure_start: params.startTime,
    closure_end: minsToTime(closureEndMins),
    cascade_depth: calculateDepth(flightStatusList, upstreamFlight),
  };

  return {
    id: simId,
    params,
    recovery: recoveryAction,
    flightStatuses: flightStatusList,
    passengerImpact,
    crewWarnings,
    aircraftStatuses,
    alerts,
    summary,
    timestamp: new Date().toISOString(),
  };
}

function calculateDepth(flights: AffectedFlight[], upstream: Map<string, string>): number {
  let maxDepth = 0;
  for (const f of flights) {
    if (f.delay_minutes > 0) {
      let depth = 1;
      let curr = f.flight_id;
      const seen = new Set<string>();
      while (upstream.has(curr) && !seen.has(curr)) {
        seen.add(curr);
        curr = upstream.get(curr)!;
        depth++;
      }
      maxDepth = Math.max(maxDepth, depth);
    }
  }
  return maxDepth;
}

// ─── Deterministic Recovery Recommendations ───────────────────────────────────

export function generateRecoveryRecommendations(result: SimulationResultJSON): RecoveryRecommendation[] {
  const recs: RecoveryRecommendation[] = [];
  let recId = 0;

  const delayedFlights = result.flightStatuses.filter((f) => f.status === 'delayed');
  const missedConnections = result.passengerImpact.connection_details.filter((c) => c.status === 'missed');

  // Strategy 1: Deploy Spare Aircraft
  for (const spare of SPARE_AIRCRAFT) {
    const candidates = delayedFlights.filter((f) => f.origin === spare.base && f.delay_minutes >= 30);
    if (candidates.length > 0) {
      const topFlight = candidates.sort((a, b) => b.delay_minutes - a.delay_minutes)[0];
      recs.push({
        id: `rec_${++recId}`,
        action: { type: 'assign_spare', flightId: topFlight.flight_id, spareAircraftId: spare.tail_id },
        title: `Deploy Spare Aircraft ${spare.tail_id} at ${spare.base}`,
        reason: `Reserve aircraft ${spare.tail_id} is stationed at ${spare.base} and ready to assume flight ${topFlight.flight_id} (${topFlight.origin}→${topFlight.destination}), eliminating its +${topFlight.delay_minutes}m delay.`,
        expected_delayed_flights: Math.max(0, result.summary.delayed_flights - 1),
        expected_delayed_reduction: topFlight.delay_minutes,
        expected_pax_saved: topFlight.pax,
        affected_flight: topFlight.flight_id,
        constraints: [`${spare.tail_id} must have crew stationed at ${spare.base}`],
        advantages: [`Restores on-time departure for ${topFlight.pax} passengers`, `Stops cascade into downstream rotation`, 'Immediate operational feasibility'],
        disadvantages: ['Consumes 1 of 2 strategic fleet reserve aircraft'],
        confidence: 'high',
        priority: 1,
      });
    }
  }

  // Strategy 2: Strategic Short-Haul Cancellation
  const severestFlights = [...delayedFlights].sort((a, b) => b.delay_minutes - a.delay_minutes);
  if (severestFlights.length > 0) {
    const worst = severestFlights[0];
    recs.push({
      id: `rec_${++recId}`,
      action: { type: 'cancel_flight', flightId: worst.flight_id },
      title: `Strategically Cancel Flight ${worst.flight_id} (+${worst.delay_minutes}m)`,
      reason: `Flight ${worst.flight_id} (${worst.origin}→${worst.destination}) has accumulated +${worst.delay_minutes}m in delays. Cancelling it breaks the delay cascade and frees the aircraft tail for evening rotations.`,
      expected_delayed_flights: result.summary.delayed_flights,
      expected_delayed_reduction: worst.delay_minutes,
      expected_pax_saved: 0,
      affected_flight: worst.flight_id,
      constraints: [`${worst.pax} passengers require automated rebooking on subsequent services`],
      advantages: ['Resets subsequent rotation legs to zero delay', 'Prevents crew duty-hour exhaustion'],
      disadvantages: [`Strands ${worst.pax} passengers temporarily pending rebooking`],
      confidence: 'medium',
      priority: 2,
    });
  }

  // Strategy 3: Protect High-Value Connection Gate
  if (missedConnections.length > 0) {
    const highestPax = [...missedConnections].sort((a, b) => b.passengers - a.passengers)[0];
    recs.push({
      id: `rec_${++recId}`,
      action: { type: 'protect_connection', fromFlightId: highestPax.from_flight, toFlightId: highestPax.to_flight },
      title: `Gate-Hold Connection: ${highestPax.from_flight} → ${highestPax.to_flight}`,
      reason: `${highestPax.passengers} passengers at ${highestPax.airport} are stranded between inbound ${highestPax.from_flight} and outbound ${highestPax.to_flight}. Issuing a short gate hold recovers the connection transfer.`,
      expected_delayed_flights: result.summary.delayed_flights,
      expected_delayed_reduction: 0,
      expected_pax_saved: highestPax.passengers,
      affected_flight: highestPax.to_flight,
      constraints: [`Gate hold adds small departure buffer to ${highestPax.to_flight}`],
      advantages: [`Saves ${highestPax.passengers} passengers from overnight stranding at ${highestPax.airport}`],
      disadvantages: ['May slightly delay arrival of flight ' + highestPax.to_flight],
      confidence: 'high',
      priority: 3,
    });
  }

  return recs;
}
