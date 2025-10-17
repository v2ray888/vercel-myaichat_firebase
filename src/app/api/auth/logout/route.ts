import { deleteSession } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  await deleteSession();
  return NextResponse.json({ success: true });
}
