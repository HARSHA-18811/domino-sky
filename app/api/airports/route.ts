import { NextResponse } from 'next/server';
import { AIRPORTS } from '@/lib/data/dataset';

export async function GET() {
  return NextResponse.json({ airports: AIRPORTS });
}
