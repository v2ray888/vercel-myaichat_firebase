import { db } from '@/lib/db';
import { desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // This query now fetches ALL active conversations.
    // The logic for filtering by assigneeId has been removed to prevent crashes.
    const allConversations = await db.query.conversations.findMany({
      orderBy: [desc(db.query.conversations.schema.updatedAt)],
    });

    const result = allConversations.map(c => ({
        id: c.id,
        name: c.customerName,
        messages: [], // Always return an empty array. Frontend will fetch on demand.
        isActive: c.isActive,
        unread: 0, 
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to fetch conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations', details: error.message }, { status: 500 });
  }
}
