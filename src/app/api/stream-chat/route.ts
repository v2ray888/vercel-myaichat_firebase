import { db } from '@/lib/db';
import { conversations, messages as messagesTable } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import Pusher from 'pusher';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true
});

// GET a conversation's history
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
  }

  try {
    const conversationMessages = await db.query.messagesTable.findMany({
        where: eq(messagesTable.conversationId, conversationId),
        orderBy: (messages, { asc }) => [asc(messages.timestamp)],
    });
    
    const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
    });

    return NextResponse.json({ 
        id: conversation?.id, 
        name: conversation?.customerName,
        messages: conversationMessages 
    });
  } catch (error) {
    console.error("Failed to fetch conversation history:", error);
    return NextResponse.json({ error: 'Failed to fetch conversation history' }, { status: 500 });
  }
}

// POST a new message
export async function POST(req: NextRequest) {
  try {
    const { message, conversationId, role, senderName } = await req.json();

    if (!message || !role) {
      return NextResponse.json({ error: 'Missing message or role' }, { status: 400 });
    }

    let currentConversationId = conversationId;
    let isNewConversation = false;
   
    if (role === 'customer' && !currentConversationId) {
      isNewConversation = true;
      const newConversation = await db.insert(conversations).values({ 
          customerName: senderName || `访客`,
      }).returning({ id: conversations.id });
      currentConversationId = newConversation[0].id;
    }

    if (!currentConversationId) {
        return NextResponse.json({ error: 'Conversation ID is missing.' }, { status: 400 });
    }

    const insertedMessages = await db.insert(messagesTable).values({
        conversationId: currentConversationId,
        text: message,
        sender: role,
    }).returning();

    const newMessage = insertedMessages[0];
    
    const channelName = `private-conversation-${currentConversationId}`;

    if (isNewConversation) {
        const conversationData = {
          id: currentConversationId,
          name: senderName || `访客 ${currentConversationId.substring(0, 6)}`,
          messages: [newMessage],
          createdAt: newMessage.timestamp.toISOString(),
          isActive: true,
        };
        await pusher.trigger('agent-dashboard', 'new-conversation', JSON.stringify(conversationData));
    }

    await pusher.trigger(channelName, 'new-message', newMessage);

    return NextResponse.json({ success: true, newConversationId: currentConversationId }, { status: 200 });

  } catch (error: any) {
    console.error('Error in POST /api/stream-chat:', error);
    return NextResponse.json({ 
        error: 'Internal Server Error',
        details: error.message 
    }, { status: 500 });
  }
}
