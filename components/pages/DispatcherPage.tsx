'use client';

import { useState } from 'react';
import { runSimulation, generateRecoveryRecommendations, type SimulationResultJSON, type RecoveryAction, type RecoveryRecommendation } from '@/lib/simulation/engine';
import { AIRPORTS, FLIGHTS, SPARE_AIRCRAFT } from '@/lib/data/dataset';

interface DispatcherPageProps {
  simulationResult: SimulationResultJSON | null;
  onSimulationComplete: (result: SimulationResultJSON) => void;
}

export default function DispatcherPage({ simulationResult, onSimulationComplete }: DispatcherPageProps) {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'comparison' | 'assistant'>('recommendations');
  const [appliedAction, setAppliedAction] = useState<RecoveryAction | null>(null);
  const [beforeResult, setBeforeResult] = useState<SimulationResultJSON | null>(null);

  // Chat assistant state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    {
      sender: 'assistant',
      text: 'Hello, I am Domino Sky Operations AI. Ask me anything about current delays, stranded passengers, aircraft availability, crew duty hours, or optimal recovery strategies.',
    },
  ]);
  const [queryInput, setQueryInput] = useState('');

  if (!simulationResult) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚡</div>
        <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>No Active Disruption to Recover</div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '440px', margin: '6px auto 20px' }}>
          Please go to Disruption Simulator and trigger a disruption (e.g., Mumbai 90-min thunderstorm) to activate the AI Recovery Dispatcher.
        </div>
      </div>
    );
  }

  const recommendations = generateRecoveryRecommendations(simulationResult);

  const handleApplyAction = (action: RecoveryAction) => {
    // Preserve baseline for Before & After comparison
    if (!beforeResult) {
      setBeforeResult(simulationResult);
    }
    setAppliedAction(action);
    const recoveredResult = runSimulation(simulationResult.params, action);
    onSimulationComplete(recoveredResult);
    setActiveTab('comparison');
  };

  const handleResetBaseline = () => {
    if (beforeResult) {
      onSimulationComplete(beforeResult);
      setAppliedAction(null);
      setBeforeResult(null);
      setActiveTab('recommendations');
    }
  };

  const handleAssistantQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim()) return;

    const query = queryInput.trim();
    const userMsg = { sender: 'user' as const, text: query };
    setChatMessages((prev) => [...prev, userMsg]);
    setQueryInput('');

    // Deterministic intelligence response generator
    const qLower = query.toLowerCase();
    let responseText = '';

    if (qLower.includes('stranded') || qLower.includes('passenger')) {
      const stranded = simulationResult.passengerImpact.stranded;
      const missed = simulationResult.passengerImpact.missed_connections;
      responseText = `Currently, ${stranded} passengers are stranded across the network due to ${missed} missed connections. The highest concentration of stranded passengers is at transit hub ${simulationResult.params.airport}.`;
    } else if (qLower.includes('why') && (qLower.includes('delayed') || qLower.includes('flight'))) {
      const delayed = simulationResult.flightStatuses.filter((f) => f.delay_minutes > 0);
      if (delayed.length > 0) {
        const topFlight = delayed[0];
        responseText = `Flight ${topFlight.flight_id} (${topFlight.origin}→${topFlight.destination}) is delayed by ${topFlight.delay_minutes} minutes. Primary cause: ${topFlight.cause}.`;
      } else {
        responseText = 'All flights are currently operating on published schedule with 0 delay minutes.';
      }
    } else if (qLower.includes('spare') || qLower.includes('aircraft')) {
      responseText = `There are 2 spare aircraft on standby: VT-DS17 based at BLR (available from 05:00) and VT-DS18 based at DEL (available from 05:00). Both have 180 seats and can be reassigned to recover delayed rotations.`;
    } else if (qLower.includes('crew')) {
      const violations = simulationResult.crewWarnings.filter((w) => w.violation);
      if (violations.length > 0) {
        responseText = `There are ${violations.length} crew duty-hour violations detected. Crew ${violations[0].crew_id} exceeds the 600-minute maximum duty limit due to rotational arrival delays. Replacement crew is required at ${violations[0].tail_id}.`;
      } else {
        responseText = `All 16 crew rosters are currently compliant with legal duty hour regulations (under 600 minutes max duty).`;
      }
    } else if (qLower.includes('best') || qLower.includes('recommend') || qLower.includes('recovery')) {
      const topRec = recommendations[0];
      responseText = topRec
        ? `Top recommendation: ${topRec.title}. Reason: ${topRec.reason} Expected impact: Saves ${topRec.expected_pax_saved} passengers and cuts rotational delays.`
        : 'Current operations are nominal; no urgent recovery dispatch needed.';
    } else {
      responseText = `Domino Sky analysis: Under ${simulationResult.params.airport} ${simulationResult.params.type} (${simulationResult.params.durationMinutes}m closure), ${simulationResult.summary.delayed_flights} flights are delayed, totaling ${simulationResult.summary.total_delay_minutes} delay minutes. I recommend applying a spare aircraft dispatch or flight cancellation to protect downstream rotations.`;
    }

    setTimeout(() => {
      setChatMessages((prev) => [...prev, { sender: 'assistant', text: responseText }]);
    }, 300);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Mode switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
            AI Operations Dispatcher &amp; Recovery Engine
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Deterministic decision-support system: evaluates fleet availability, spare aircraft, and passenger connections to recommend optimal recovery interventions.
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('recommendations')}
            style={{
              background: activeTab === 'recommendations' ? 'var(--accent-blue)' : 'transparent',
              color: activeTab === 'recommendations' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Recommendations ({recommendations.length})
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            style={{
              background: activeTab === 'comparison' ? 'var(--accent-blue)' : 'transparent',
              color: activeTab === 'comparison' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Before vs After Comparison
          </button>
          <button
            onClick={() => setActiveTab('assistant')}
            style={{
              background: activeTab === 'assistant' ? 'var(--accent-blue)' : 'transparent',
              color: activeTab === 'assistant' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            AI Operations Chat
          </button>
        </div>
      </div>

      {/* TAB 1: RECOMMENDATIONS */}
      {activeTab === 'recommendations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-cyan)', letterSpacing: '0.08em' }}>
            OPERATIONAL RECOVERY ACTION PROPOSALS
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>{rec.title}</div>
                  <span className="badge badge-green">CONFIDENCE: {rec.confidence.toUpperCase()}</span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{rec.reason}</div>

                {/* Impact metrics preview */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>DELAY REDUCTION</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--status-green)' }}>
                      -{rec.expected_delayed_reduction} min
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>PAX PROTECTED</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                      +{rec.expected_pax_saved} pax
                    </span>
                  </div>
                </div>

                {/* Pros and cons */}
                <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ color: 'var(--status-green)' }}>✓ {rec.advantages[0]}</div>
                  <div style={{ color: 'var(--status-orange)' }}>⚠ {rec.disadvantages[0]}</div>
                </div>

                {/* Apply button */}
                <button
                  onClick={() => handleApplyAction(rec.action)}
                  style={{
                    background: 'linear-gradient(135deg, #00d4ff, #3b82f6)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    color: '#000',
                    fontWeight: '800',
                    fontSize: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 0 15px rgba(0, 212, 255, 0.3)',
                    marginTop: 'auto',
                  }}
                >
                  Apply &amp; Simulate Recovery
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: BEFORE VS AFTER COMPARISON */}
      {activeTab === 'comparison' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {beforeResult ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                  RECOVERY INTERVENTION BENCHMARK AUDIT
                </div>
                <button
                  onClick={handleResetBaseline}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  ↺ Reset to Original Disruption Baseline
                </button>
              </div>

              {/* Comparison Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {[
                  {
                    label: 'Delayed Flights',
                    before: beforeResult.summary.delayed_flights,
                    after: simulationResult.summary.delayed_flights,
                    unit: 'flights',
                    invertBetter: true,
                  },
                  {
                    label: 'Total Delay Minutes',
                    before: beforeResult.summary.total_delay_minutes,
                    after: simulationResult.summary.total_delay_minutes,
                    unit: 'min',
                    invertBetter: true,
                  },
                  {
                    label: 'Stranded Passengers',
                    before: beforeResult.passengerImpact.stranded,
                    after: simulationResult.passengerImpact.stranded,
                    unit: 'pax',
                    invertBetter: true,
                  },
                  {
                    label: 'Intact Connections',
                    before: beforeResult.passengerImpact.safe_connections,
                    after: simulationResult.passengerImpact.safe_connections,
                    unit: 'safe',
                    invertBetter: false,
                  },
                ].map((item) => {
                  const diff = item.after - item.before;
                  const isImproved = item.invertBetter ? diff <= 0 : diff >= 0;

                  return (
                    <div
                      key={item.label}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '18px',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.label}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
                        <span style={{ fontSize: '20px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                          {item.before}
                        </span>
                        <span style={{ fontSize: '28px', fontWeight: '800', color: isImproved ? 'var(--status-green)' : 'var(--status-red)' }}>
                          {item.after}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.unit}</span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: isImproved ? 'var(--status-green)' : 'var(--status-red)', marginTop: '4px' }}>
                        {diff > 0 ? `+${diff}` : diff} {item.unit} ({isImproved ? 'IMPROVEMENT' : 'INCREASED'})
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action summary badge */}
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '10px', padding: '16px 20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--status-green)' }}>
                  ✓ Recovery Action Dispatched Successfully
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  The network was re-simulated using deterministic propagation. Turnarounds and rotational dependencies were reconciled in real-time.
                </div>
              </div>
            </>
          ) : (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '30px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Select and apply a recommendation from the Recommendations tab to visualize the Before &amp; After audit.
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AI OPERATIONS CHAT ASSISTANT */}
      {activeTab === 'assistant' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '520px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Chat log */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  background: msg.sender === 'user' ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                  color: '#fff',
                  padding: '12px 16px',
                  borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  border: msg.sender === 'assistant' ? '1px solid var(--border-color)' : 'none',
                }}
              >
                {msg.text}
              </div>
            ))}
          </div>

          {/* Quick prompt pills */}
          <div style={{ padding: '8px 16px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {[
              'How many passengers are stranded?',
              'Why is the top flight delayed?',
              'Are spare aircraft available?',
              'Are there crew duty violations?',
              'What is the best recovery recommendation?',
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => setQueryInput(prompt)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '4px 10px',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat input box */}
          <form onSubmit={handleAssistantQuery} style={{ display: 'flex', padding: '14px', background: 'var(--bg-secondary)', gap: '10px' }}>
            <input
              type="text"
              placeholder="Ask Domino Sky AI about delays, passenger impact, aircraft, crew..."
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              style={{
                flex: 1,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                background: 'var(--accent-cyan)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                padding: '0 20px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
