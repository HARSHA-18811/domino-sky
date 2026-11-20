import { NextRequest, NextResponse } from 'next/server';
import { generateRecoveryRecommendations, type SimulationResultJSON } from '@/lib/simulation/engine';

export async function POST(request: NextRequest) {
  try {
    const simulationResult: SimulationResultJSON = await request.json();

    // Rule-based deterministic recommendations
    const recommendations = generateRecoveryRecommendations(simulationResult);

    // Optional Gemini LLM enhancement if GEMINI_API_KEY is configured
    let aiExplanation = '';
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const prompt = `You are the AI Operations Dispatcher for Domino Sky.
A ${simulationResult.params.type} has closed airport ${simulationResult.params.airport} for ${simulationResult.params.durationMinutes} minutes.
Impact: ${simulationResult.summary.delayed_flights} delayed flights, ${simulationResult.passengerImpact.stranded} stranded passengers.
Recommend 2 priority recovery steps.`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 250, temperature: 0.2 },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          aiExplanation = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        }
      } catch (e) {
        console.warn('Gemini fallback activated:', e);
      }
    }

    if (!aiExplanation) {
      aiExplanation = `Airport ${simulationResult.params.airport} disruption (${simulationResult.params.type}, ${simulationResult.params.durationMinutes}m) caused ${simulationResult.summary.delayed_flights} delayed flights and stranded ${simulationResult.passengerImpact.stranded} passengers. Priority recovery: (1) ${recommendations[0]?.title ?? 'Deploy Spare Aircraft'} and (2) ${recommendations[1]?.title ?? 'Protect Inbound Transfers'}.`;
    }

    return NextResponse.json({ recommendations, aiExplanation });
  } catch (error) {
    return NextResponse.json({ error: 'Dispatcher failure', details: String(error) }, { status: 500 });
  }
}
