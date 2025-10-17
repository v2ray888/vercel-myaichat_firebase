import { db } from '@/lib/db';
import { conversations, messages as messagesTable } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get('agentId');

  if (!agentId) {
    return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
  }

  try {
    const agentConversations = await db.query.conversations.findMany({
      where: eq(conversations.assigneeId, agentId),
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
