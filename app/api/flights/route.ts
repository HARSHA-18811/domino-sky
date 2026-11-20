import { NextResponse } from 'next/server';
import { FLIGHTS, AIRPORTS } from '@/lib/data/dataset';

export async function GET() {
  return NextResponse.json({ flights: FLIGHTS, airports: AIRPORTS });
}
