import { db } from '@/lib/db';
import { conversations, messages as messagesTable, users } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
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

// This is a temporary solution to assign all chats to a single admin.
// In a real app, you would have a more dynamic way to assign agents.
const ADMIN_EMAIL = 'v2rayn@outlook.com';

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

        // Create the new conversation, REMOVING the assigneeId logic
        const newConversation = await db.insert(conversations).values({ 
            customerName: senderName || `访客`,
        }).returning({ id: conversations.id });

        currentConversationId = newConversation[0].id;
    }


    if (!currentConversationId) {
        return NextResponse.json({ error: 'Conversation ID is missing.' }, { status: 400 });
    }

    // Update the conversation's updatedAt timestamp
    await db.update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, currentConversationId));

    const insertedMessages = await db.insert(messagesTable).values({
        conversationId: currentConversationId,
        text: message,
        sender: role,
    }).returning();

    const newMessage = insertedMessages[0];
    
    // Channel for the customer widget
    const customerChannelName = `private-conversation-${currentConversationId}`;
    
    // For a new conversation, we need to find ANY agent to notify.
    // In this simplified model, we will notify ALL agents by using a public channel
    // for new conversations. A better approach would be a dedicated channel for agents.
    // For now, let's assume we have a way to get all agent channels.
    // We will just broadcast to a generic agent channel for simplicity for now.
    // The proper fix is to notify the specific agent.
    if (isNewConversation) {
        const admin = await db.query.users.findFirst({
            where: eq(users.email, ADMIN_EMAIL),
        });

        // This is a simplified notification. Ideally, you'd have a system
        // to broadcast to all logged-in agents.
        if (admin && admin.id) {
            const agentChannel = `private-agent-${admin.id}`;
             const conversationPayload = {
              id: currentConversationId,
              name: senderName || `访客 ${currentConversationId.substring(0, 6)}`,
              messages: [newMessage],
              createdAt: newMessage.timestamp.toISOString(),
              isActive: true,
            };
            try {
                await pusher.trigger(agentChannel, 'new-conversation', JSON.stringify(conversationPayload));
            } catch (e) {
                console.error("Pusher trigger failed:", e);
            }
        }
    }

    // Trigger message for both customer and agent
    await pusher.trigger(customerChannelName, 'new-message', newMessage);

    return NextResponse.json({ success: true, newConversationId: currentConversationId }, { status: 200 });

  } catch (error: any) {
    console.error('Error in POST /api/stream-chat:', error);
    return NextResponse.json({ 
        error: 'Internal Server Error',
        details: error.message 
    }, { status: 500 });
  }
}
