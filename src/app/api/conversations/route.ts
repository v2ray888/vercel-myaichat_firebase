
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { conversations as conversationsTable } from '@/lib/schema';
import { desc, eq, gte, sql } from 'drizzle-orm';
import { startOfToday } from 'date-fns';

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allConversations = await db.query.conversations.findMany({
        orderBy: [desc(conversationsTable.updatedAt)]
    });

    const totalConversations = allConversations.length;
    const activeConversations = allConversations.filter(c => c.isActive).length;
    const todayConversations = allConversations.filter(c => new Date(c.createdAt) >= startOfToday()).length;
    
    const recentConversations = allConversations.slice(0, 5).map(c => ({
        id: c.id,
        name: c.customerName,
        ipAddress: c.ipAddress,
        messages: [], 
        isActive: c.isActive,
        unread: 0, 
        updatedAt: c.updatedAt,
    }));


    return NextResponse.json({
        stats: {
            totalConversations,
            activeConversations,
            todayConversations,
        },
        conversations: recentConversations,
    });
    
  } catch (error: any) {
    console.error('Failed to fetch conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations', details: error.message }, { status: 500 });
  }
}
