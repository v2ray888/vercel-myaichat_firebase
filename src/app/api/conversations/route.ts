import { db } from '@/lib/db';
import { conversations } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // This query now ONLY fetches conversations, not messages.
    // This avoids the complex join that was causing errors.
    const agentConversations = await db.query.conversations.findMany({
      where: eq(conversations.assigneeId, session.userId),
      orderBy: [desc(conversations.updatedAt)],
      // The 'with' clause for messages is removed to simplify the query.
    });

    // The frontend will be responsible for fetching messages for a selected conversation.
    // We can add a placeholder for the latest message if needed in the future,
    // but for now, we keep it simple and robust.
    const result = agentConversations.map(c => ({
        id: c.id,
        name: c.customerName,
        messages: [], // Always return an empty array. Frontend will fetch on demand.
        isActive: c.isActive,
        unread: 0, // This can be calculated later
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to fetch conversations for agent:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations', details: error.message }, { status: 500 });
  }
}
