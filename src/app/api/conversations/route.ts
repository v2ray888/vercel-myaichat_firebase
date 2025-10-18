
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { conversations as conversationsTable } from '@/lib/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allConversations = await db.query.conversations.findMany({
        where: eq(conversationsTable.isActive, true),
        orderBy: [desc(conversationsTable.updatedAt)]
    });

    const result = allConversations.map(c => ({
        id: c.id,
        name: c.customerName,
        ipAddress: c.ipAddress,
        messages: [], 
        isActive: c.isActive,
        unread: 0, 
        updatedAt: c.updatedAt,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to fetch conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations', details: error.message }, { status: 500 });
  }
}
