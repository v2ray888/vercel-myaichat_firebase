
import { kv } from '@vercel/kv';
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

const CONVERSATION_PREFIX = 'conversation:';

// GET a conversation's history - Returns empty array for now
export async function GET(req: NextRequest) {
  // NOTE: This is a temporary implementation.
  // We will return an empty array as we are not using Vercel KV yet.
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
  }

  return NextResponse.json({ id: conversationId, messages: [] });
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
   
    // If it's a new customer message, create a conversation ID
    if (role === 'customer' && !currentConversationId) {
      isNewConversation = true;
      currentConversationId = crypto.randomUUID();
    }

    if (!currentConversationId) {
        return NextResponse.json({ error: 'Conversation ID is missing.' }, { status: 400 });
    }

    const newMessage = {
      id: crypto.randomUUID(),
      text: message,
      sender: role,
      conversationId: currentConversationId,
      timestamp: new Date().toISOString(),
    };
    
    // Define the Pusher channel
    const channelName = `private-conversation-${currentConversationId}`;

    if (isNewConversation) {
        // In this temporary version, the conversation data is transient
        const conversationData = {
          id: currentConversationId,
          name: senderName || `访客 ${currentConversationId.substring(0, 6)}`,
          messages: [newMessage], // Include the first message
          createdAt: new Date().toISOString(),
          isActive: true,
        };
        // Trigger an event for agents to discover the new conversation
        await pusher.trigger('agent-dashboard', 'new-conversation', JSON.stringify(conversationData));
    }

    // Trigger Pusher event for the new message
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
