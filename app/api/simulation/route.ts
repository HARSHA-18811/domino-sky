import { NextRequest, NextResponse } from 'next/server';
import { runSimulation, type DisruptionParams, type RecoveryAction } from '@/lib/simulation/engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { params, recoveryAction } = body as {
      params: DisruptionParams;
      recoveryAction?: RecoveryAction;
    };

    if (!params || !params.airport || !params.startTime || !params.durationMinutes) {
      return NextResponse.json(
        { error: 'Missing required parameters: airport, startTime, durationMinutes' },
        { status: 400 }
      );
    }

    const result = runSimulation(params, recoveryAction);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Simulation run failure:', error);
    return NextResponse.json({ error: 'Simulation execution failed', details: String(error) }, { status: 500 });
  }
}

export async function GET() {
  // Baseline nominal simulation (0 minute disruption)
  const baseline = runSimulation({
    airport: 'BOM',
    type: 'Baseline',
    startTime: '00:00',
    durationMinutes: 0,
  });
  return NextResponse.json(baseline);
}
