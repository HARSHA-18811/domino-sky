import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, context } = body as { message: string; context?: string };

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      const systemContext = context ? `\n\nCurrent simulation context:\n${context}` : '';
      const prompt = `You are Domino Sky AI — an airline operations control center assistant specializing in flight disruption management, cascade analysis, and recovery planning.${systemContext}

User question: ${message}

Provide a concise, professional answer focused on operational recovery. Use specific flight numbers, times, and passenger counts when available from the context.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return NextResponse.json({ reply: text, source: 'gemini' });
      }
    }

    // Rule-based fallback
    const reply = getRuleBasedReply(message);
    return NextResponse.json({ reply, source: 'rules' });
  } catch (err) {
    console.error('Assistant error:', err);
    return NextResponse.json({ error: 'Assistant failed' }, { status: 500 });
  }
}

function getRuleBasedReply(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('delay') || lower.includes('delayed')) {
    return 'Flight delays cascade through aircraft rotations. When an aircraft arrives late, its next flight is pushed back by at least the minimum turnaround time (30 min). I recommend checking the cascade visualization to see the full impact chain.';
  }
  if (lower.includes('connection') || lower.includes('passenger') || lower.includes('stranded')) {
    return 'For missed connections, the fastest recovery is to hold the connecting flight if the gap is less than 30 minutes. For longer delays, check the Passenger Impact tab to identify which connections to protect first by pax count.';
  }
  if (lower.includes('crew') || lower.includes('duty')) {
    return 'Crew duty time violations occur when delays push the actual arrival of the last flight beyond the max duty limit (600 min from duty start). Check the Crew Monitoring page for specific violations and consider crew swaps at major hubs.';
  }
  if (lower.includes('spare') || lower.includes('aircraft')) {
    return 'Two spare aircraft are available: VT-DS17 at BLR and VT-DS18 at DEL. Deploy them to cover heavily delayed rotations at their base airports. Check the Aircraft Management page for assignment options.';
  }
  if (lower.includes('cancel') || lower.includes('cancell')) {
    return 'Cancellation is recommended for flights with delays exceeding 180 minutes. This frees the aircraft for a fresh rotation and limits crew duty exposure. The AI Dispatcher page shows specific cancellation recommendations.';
  }
  if (lower.includes('recover') || lower.includes('recommend')) {
    return 'Key recovery actions: (1) Deploy spare aircraft at disrupted hub, (2) Hold connecting flights for stranded pax, (3) Cancel severely delayed flights, (4) Accept minor delays (<45 min) without intervention. Run the full dispatcher analysis for a complete plan.';
  }
  if (lower.includes('bom') || lower.includes('mumbai')) {
    return 'BOM (Mumbai) is a mega-hub with 32 movements/hour. A closure here typically affects 8-12 flights directly and cascades to 15+ through aircraft rotations. Key connections at risk are CX01-CX05 (BOM hub connections). Deploy VT-DS17 from BLR if available.';
  }

  return 'I can help with flight delay analysis, connection protection, crew duty monitoring, and recovery planning. Try asking about specific flights, connections, or recovery options. Run a simulation first to get real-time data to analyze.';
}
