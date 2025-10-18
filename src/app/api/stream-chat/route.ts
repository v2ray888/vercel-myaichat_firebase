
import { db } from '@/lib/db';
import { conversations, messages as messagesTable, users } from '@/lib/schema';
import { eq, asc, and } from 'drizzle-orm';
import Pusher from 'pusher';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

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
    const conversationMessages = await db.query.messages.findMany({
        where: eq(messagesTable.conversationId, conversationId),
        orderBy: [asc(messagesTable.timestamp)],
    });
    
    const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
    });

    return NextResponse.json({ 
        id: conversation?.id, 
        name: conversation?.customerName,
        ipAddress: conversation?.ipAddress,
        messages: conversationMessages 
    });
  } catch (error: any) {
    console.error("Failed to fetch conversation history:", error);
    return NextResponse.json({ error: 'Failed to fetch conversation history', details: error.message }, { status: 500 });
  }
}

// POST a new message
export async function POST(req: NextRequest) {
  try {
    const { message, conversationId, role, senderName, appId, imageUrl } = await req.json();

    if ((!message || !message.trim()) && !imageUrl) {
      return NextResponse.json({ error: 'Missing message or image' }, { status: 400 });
    }
     if (!role) {
      return NextResponse.json({ error: 'Missing role' }, { status: 400 });
    }

    let currentConversationId = conversationId;
    let isNewConversation = false;
    
    // Use a placeholder IP for reliability in all environments.
    const ip = "127.0.0.1";


    if (role === 'customer' && !currentConversationId) {
        isNewConversation = true;

        const newConversationResult = await db.insert(conversations).values({ 
            customerName: senderName || `访客`,
            isActive: true,
            updatedAt: new Date(),
            ipAddress: ip,
        }).returning();

        const newConversation = newConversationResult[0];
        currentConversationId = newConversation.id;
    }


    if (!currentConversationId) {
        return NextResponse.json({ error: 'Conversation ID is missing.' }, { status: 400 });
    }

    // Update the conversation's updatedAt timestamp
    await db.update(conversations)
      .set({ updatedAt: new Date(), isActive: true })
      .where(eq(conversations.id, currentConversationId));

    const messagePayload: any = {
        conversationId: currentConversationId,
        sender: role,
    };

    if (imageUrl) {
        messagePayload.metadata = { imageUrl };
        messagePayload.text = message || null; 
    } else {
        messagePayload.text = message;
    }
    
    const insertedMessages = await db.insert(messagesTable).values(messagePayload).returning();

    const newMessage = insertedMessages[0];
    
    const customerChannelName = `private-conversation-${currentConversationId}`;
    
    // For a new conversation, we trigger a specific event for agents
    if (isNewConversation) {
        const admin = await db.query.users.findFirst();

        if (admin && admin.id) {
            const agentChannel = `private-agent-${admin.id}`;
             const conversationPayload = {
              id: currentConversationId,
              name: senderName || `访客`,
              ipAddress: ip, // Explicitly include IP here
              messages: [newMessage],
              createdAt: newMessage.timestamp.toISOString(),
              isActive: true,
              updatedAt: new Date().toISOString(),
              unread: 1, 
            };
            try {
                // Notify agent of new conversation to add to workbench list
                await pusher.trigger(agentChannel, 'new-conversation', conversationPayload);
                // Notify dashboard to update stats
                await pusher.trigger(agentChannel, 'dashboard-update', { message: 'new conversation' });
            } catch (e) {
                console.error("Pusher trigger failed for new-conversation:", e);
            }
        }
    }

    try {
        // For customer messages, always notify the agent channel with updated info
        if (role === 'customer') {
            const currentConversation = await db.query.conversations.findFirst({ where: eq(conversations.id, currentConversationId) });
            const admin = await db.query.users.findFirst(); 
            if (admin?.id) {
                const agentChannel = `private-agent-${admin.id}`;
                // Ensure IP is included in the new-message event payload
                await pusher.trigger(agentChannel, 'new-message', { ...newMessage, conversationName: currentConversation?.customerName, conversationIp: currentConversation?.ipAddress });
            }
        }
        // Always notify the customer's own channel
        if (role === 'agent') {
           await pusher.trigger(customerChannelName, 'new-message', newMessage);
        }

    } catch (e) {
        console.error("Pusher trigger failed for new-message:", e);
    }

    return NextResponse.json({ success: true, newConversationId: currentConversationId }, { status: 200 });

  } catch (error: any) {
    console.error('Error in POST /api/stream-chat:', error);
    return NextResponse.json({ 
        error: 'Internal Server Error',
        details: error.message 
    }, { status: 500 });
  }
}


export async function DELETE(req: NextRequest) {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('id');

    if (!session?.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!conversationId) {
        return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    try {
        const updated = await db.update(conversations)
            .set({ isActive: false })
            .where(eq(conversations.id, conversationId))
            .returning();

        if (updated.length === 0) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }
        
        const agentChannel = `private-agent-${session.userId}`;
        // Notify the agent channel to remove it from the UI in real-time
        await pusher.trigger(agentChannel, 'conversation-archived', { conversationId });
        // Notify dashboard to update stats
        await pusher.trigger(agentChannel, 'dashboard-update', { message: 'conversation archived' });


        return NextResponse.json({ success: true, conversationId });
    } catch (error: any) {
        console.error("Failed to archive conversation:", error);
        return NextResponse.json({ error: 'Failed to archive conversation', details: error.message }, { status: 500 });
    }
}
