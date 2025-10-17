'use server';

// A map to store active stream writers, keyed by a unique stream ID.
const activeStreams = new Map<string, TransformStreamDefaultWriter>();

// Helper to send a message to all active streams.
function broadcast(message: string) {
  const formattedMessage = `data: ${message}\n\n`;
  for (const writer of activeStreams.values()) {
    try {
      writer.write(new TextEncoder().encode(formattedMessage));
    } catch (e) {
      console.error('Error writing to a stream:', e);
    }
  }
}

/**
 * Handles GET requests to establish a new streaming connection.
 */
export async function GET(req: Request) {
  const transformStream = new TransformStream();
  const writer = transformStream.writable.getWriter();
  const streamId = crypto.randomUUID();

  // Store the writer in the map of active streams.
  activeStreams.set(streamId, writer);
  console.log(`Stream ${streamId} connected. Total streams: ${activeStreams.size}`);

  // Send a welcome message to the new client.
  writer.write(new TextEncoder().encode('data: Connection established. Welcome!\n\n'));

  // Handle client disconnection.
  req.signal.onabort = () => {
    activeStreams.delete(streamId);
    console.log(`Stream ${streamId} disconnected. Total streams: ${activeStreams.size}`);
    try {
        writer.close();
    } catch (e) {
        // Ignore errors from closing an already closed stream.
    }
  };

  // Return a streaming response.
  return new Response(transformStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Stream-Id': streamId, // Send the unique ID back to the client.
    },
  });
}

/**
 * Handles POST requests to send a message to all active streams.
 */
export async function POST(req: Request) {
    try {
        const { message, streamId } = await req.json();

        if (!message || !streamId) {
            return new Response('Missing message or streamId', { status: 400 });
        }

        console.log(`Received message from ${streamId}: ${message}`);
        
        // Broadcast the message to all clients.
        broadcast(`来自 ${streamId.substring(0, 6)}: ${message}`);
        
        return new Response('Message sent', { status: 200 });

    } catch (error) {
        console.error('Error processing POST request:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}