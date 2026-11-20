import { NextResponse } from 'next/server';
import { CREWS } from '@/lib/data/dataset';

export async function GET() {
  return NextResponse.json({ crews: CREWS });
}
