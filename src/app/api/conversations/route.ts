
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { conversations as conversationsTable } from '@/lib/schema';
import { desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // This query now fetches ALL active conversations.
    // The sorting will now be handled client-side for dynamic updates.
    const allConversations = await db.query.conversations.findMany({
        orderBy: [desc(conversationsTable.updatedAt)] // Keep a sensible default server-side sort
    });

    const result = allConversations.map(c => ({
        id: c.id,
        name: c.customerName,
        messages: [], // Always return an empty array. Frontend will fetch on demand.
        isActive: c.isActive,
        unread: 0, // Initialize unread count to 0, client will manage it.
        updatedAt: c.updatedAt,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to fetch conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations', details: error.message }, { status: 500 });
  }
}
