
'use server';

// A Map to store active stream writers, keyed by a unique stream ID.
// The value will be an object containing the writer, role, and conversationId
const activeStreams = new Map<string, {
  writer: WritableStreamDefaultWriter<Uint8Array>,
  role: 'agent' | 'customer',
  conversationId?: string | null
}>();

// A Map to store conversations. In a real app, this would be a database.
const conversations = new Map<string, { id: string; name: string; messages: any[] }>();

function broadcast(message: object, targetRole?: 'agent' | 'customer', targetConversationId?: string) {
  const messageStr = `data: ${JSON.stringify(message)}\n\n`;
  const encodedMessage = new TextEncoder().encode(messageStr);

  for (const [id, stream] of activeStreams.entries()) {
    let shouldSend = false;
    
    // Agent should receive all non-ping messages to update their conversation list.
    if (stream.role === 'agent' && (message as any).type !== 'ping') {
        shouldSend = true;
    }
    // If a specific target role is defined, only send to that role.
    else if (targetRole && stream.role === targetRole) {
      // If a specific conversation ID is also defined, only send to streams matching both.
       if (targetConversationId) {
         if(stream.conversationId === targetConversationId) {
           shouldSend = true;
         }
       } else {
          // If no conversation ID is specified, send to all streams with the target role.
          shouldSend = true;
       }
    } else if (!targetRole) {
        // If no target role is specified, broadcast to everyone.
        shouldSend = true;
    }

    if (shouldSend) {
      try {
        stream.writer.write(encodedMessage);
      } catch (e) {
        console.error('Error writing to a stream for client:', id, e);
        // Clean up broken streams
        activeStreams.delete(id);
      }
    }
  }
}

// Periodically send a ping to keep connections alive
setInterval(() => {
  // SSE comments are used for pings
  const pingMessage = new TextEncoder().encode(': ping\n\n');
  for (const [id, stream] of activeStreams.entries()) {
      try {
        stream.writer.write(pingMessage);
      } catch (e) {
        console.error('Error pinging stream for client:', id, e);
        activeStreams.delete(id);
      }
  }
}, 10000);


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role') as 'agent' | 'customer' || 'customer';
  let conversationId = searchParams.get('conversationId');

  const transformStream = new TransformStream();
  const writer = transformStream.writable.getWriter();
  const streamId = crypto.randomUUID();

  // Store the writer, role, and conversationId
  activeStreams.set(streamId, { writer, role, conversationId });
  console.log(`Stream ${streamId} (${role}${conversationId ? ' - ' + conversationId : ''}) connected. Total streams: ${activeStreams.size}`);

  const initialMessage = { type: 'connected', streamId };
  writer.write(new TextEncoder().encode(`data: ${JSON.stringify(initialMessage)}\n\n`));

  // When an agent connects, send them the list of current conversations
  if (role === 'agent') {
     writer.write(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'conversationList', conversations: Array.from(conversations.values()) })}\n\n`));
  }

  req.signal.onabort = () => {
    activeStreams.delete(streamId);
    console.log(`Stream ${streamId} (${role}) disconnected. Total streams: ${activeStreams.size}`);
    try {
      writer.close();
    } catch (e) {
      // Ignore errors if the writer is already closed
    }
    
    // If a customer disconnects, notify agents
    if (role === 'customer' && conversationId) {
        broadcast({ type: 'customerLeft', conversationId }, 'agent');
    }
  };

  return new Response(transformStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}


export async function POST(req: Request) {
  try {
    const { message, conversationId, role, senderName, streamId } = await req.json();

    if (!message || !role) {
      return new Response('Missing message or role', { status: 400 });
    }

    let currentConversationId = conversationId;

    // If it's a new customer message without a conversation ID, create one.
    if (role === 'customer' && !currentConversationId) {
      currentConversationId = crypto.randomUUID();
      const newConversation = {
        id: currentConversationId,
        name: senderName || `访客 ${currentConversationId.substring(0, 6)}`,
        messages: [],
      };
      conversations.set(currentConversationId, newConversation);
      // Notify agents of the new conversation
      broadcast({ type: 'newConversation', conversation: newConversation }, 'agent');
    }
    
    if (!currentConversationId || !conversations.has(currentConversationId)) {
        return new Response('Conversation not found', { status: 404 });
    }

    const newMessage = {
      id: crypto.randomUUID(),
      text: message,
      sender: role,
      senderStreamId: streamId, // Include sender's streamId
      conversationId: currentConversationId,
      timestamp: new Date().toISOString(),
    };
    
    // Store message
    const conversation = conversations.get(currentConversationId);
    if (conversation) {
        conversation.messages.push(newMessage);
    }

    // Broadcast message to relevant parties
    if (role === 'customer') {
      // Customer message goes to all agents
      broadcast({ type: 'newMessage', message: newMessage }, 'agent');
    } else if (role === 'agent') {
      // Agent message goes to the specific customer
      broadcast({ type: 'newMessage', message: newMessage }, 'customer', currentConversationId);
    }
    
    // Also send the message back to the original sender to confirm it was sent
    // and to handle UI updates consistently. The client will filter it if it's an optimistic update.
    const senderStream = activeStreams.get(streamId);
    if (senderStream) {
      try {
        senderStream.writer.write(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'newMessage', message: newMessage })}\n\n`));
      } catch (e) {
        console.error('Error writing back to sender:', e);
        activeStreams.delete(streamId);
      }
    }
    
    return new Response(JSON.stringify({ newConversationId: currentConversationId }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error processing POST request:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
