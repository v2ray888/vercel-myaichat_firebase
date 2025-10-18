
import { db } from '@/lib/db';
import { conversations, messages as messagesTable, users } from '@/lib/schema';
import { eq, asc } from 'drizzle-orm';
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
    
    // Get IP address from request
    const ip = req.headers.get('x-forwarded-for') || req.ip;

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
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, currentConversationId));

    const messagePayload: any = {
        conversationId: currentConversationId,
        sender: role,
    };

    if (imageUrl) {
        messagePayload.metadata = { imageUrl };
        // Use a placeholder for text if there's an image, or leave it null
        messagePayload.text = message || null; 
    } else {
        messagePayload.text = message;
    }

    const insertedMessages = await db.insert(messagesTable).values(messagePayload).returning();

    const newMessage = insertedMessages[0];
    
    // Channel for the customer widget
    const customerChannelName = `private-conversation-${currentConversationId}`;
    
    if (isNewConversation) {
        // Find admin based on appId in a real scenario. For now, hardcoded.
        const admin = await db.query.users.findFirst({
             // In a real app, you would look up the user associated with the appId
             // For now, we continue to use a hardcoded admin for simplicity.
        });

        if (admin && admin.id) {
            const agentChannel = `private-agent-${admin.id}`;
             const conversationPayload = {
              id: currentConversationId,
              name: senderName || `访客`,
              ipAddress: ip,
              messages: [newMessage],
              createdAt: newMessage.timestamp.toISOString(),
              isActive: true,
              updatedAt: new Date().toISOString(),
              unread: 1, // Set unread count to 1 for new conversations
            };
            try {
                // Send the payload as a JS object, not a string
                await pusher.trigger(agentChannel, 'new-conversation', conversationPayload);
            } catch (e) {
                console.error("Pusher trigger failed for new-conversation:", e);
            }
        }
    }

    // Trigger message for both customer and agent
    try {
        // Exclude agent-sent messages from being sent back to the agent channel
        if (role !== 'agent') {
            const currentConversation = await db.query.conversations.findFirst({ where: eq(conversations.id, currentConversationId) });
            const admin = await db.query.users.findFirst(); // simplified admin lookup
            if (admin?.id) {
                const agentChannel = `private-agent-${admin.id}`;
                await pusher.trigger(agentChannel, 'new-message', { ...newMessage, conversationName: currentConversation?.customerName, conversationIp: currentConversation?.ipAddress });
            }
        }
        await pusher.trigger(customerChannelName, 'new-message', newMessage);

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
