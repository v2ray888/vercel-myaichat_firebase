import { NextRequest, NextResponse } from 'next/server';
import { generateQuickReply } from '@/ai/flows/generate-quick-reply-flow';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { customerMessage } = await req.json();

    if (!customerMessage) {
      return NextResponse.json({ error: 'Customer message is required' }, { status: 400 });
    }

    const result = await generateQuickReply({ customerMessage });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('AI quick reply generation error:', error);
    return NextResponse.json({ error: 'Failed to generate AI suggestion', details: error.message }, { status: 500 });
  }
}
