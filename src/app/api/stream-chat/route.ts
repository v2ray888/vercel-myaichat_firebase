
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

// GET a conversation's history
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
  }

  try {
    const conversation = await kv.get(`${CONVERSATION_PREFIX}${conversationId}`);
    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
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
    let conversationData;

    // If it's a new customer message, create a conversation
    if (role === 'customer' && !currentConversationId) {
      isNewConversation = true;
      currentConversationId = crypto.randomUUID();
      conversationData = {
        id: currentConversationId,
        name: senderName || `访客 ${currentConversationId.substring(0, 6)}`,
        messages: [],
        createdAt: new Date().toISOString(),
        isActive: true, // Mark as active
      };
    } else {
        // If it's not a new conversation, we must fetch the existing data.
        conversationData = await kv.get(`${CONVERSATION_PREFIX}${currentConversationId}`);
    }

    if (!currentConversationId || !conversationData) {
        // This case should ideally not be hit if new conversation logic is sound.
        return NextResponse.json({ error: `Conversation with ID ${currentConversationId} not found.` }, { status: 404 });
    }

    const newMessage = {
      id: crypto.randomUUID(),
      text: message,
      sender: role,
      conversationId: currentConversationId,
      timestamp: new Date().toISOString(),
    };
    
    // Append message to conversation in KV
    conversationData.messages.push(newMessage);
    // Also update active status on new message
    conversationData.isActive = true; 
    await kv.set(`${CONVERSATION_PREFIX}${currentConversationId}`, conversationData);


    // Define the Pusher channel
    const channelName = `private-conversation-${currentConversationId}`;

    if (isNewConversation) {
        // Trigger an event for agents to discover the new conversation
        await pusher.trigger('agent-dashboard', 'new-conversation', JSON.stringify(conversationData));
    }

    // Trigger Pusher event
    await pusher.trigger(channelName, 'new-message', newMessage);

    return NextResponse.json({ success: true, newConversationId: currentConversationId }, { status: 200 });

  } catch (error: any) {
    console.error('Error in POST /api/stream-chat:', error);
    // Provide a more detailed error response in development
    return NextResponse.json({ 
        error: 'Internal Server Error',
        details: error.message 
    }, { status: 500 });
  }
}
