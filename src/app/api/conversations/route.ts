import { db } from '@/lib/db';
import { conversations, messages as messagesTable } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const agentConversations = await db.query.conversations.findMany({
      where: eq(conversations.assigneeId, session.userId),
      orderBy: [desc(conversations.updatedAt)],
      with: {
        messages: {
            orderBy: [desc(messagesTable.timestamp)],
            limit: 1,
        }
      }
    });

    const result = agentConversations.map(c => ({
        id: c.id,
        name: c.customerName,
        messages: c.messages,
        isActive: c.isActive,
        unread: 0, // In a real app, you'd calculate this
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch conversations for agent:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}
