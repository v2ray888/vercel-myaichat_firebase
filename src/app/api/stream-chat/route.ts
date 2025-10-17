'use server';

// A simple duplex streaming API route.
// The client can send data to the server, and the server can send data back.
// This is a simple echo server that prepends "Echo: " to each message.

export async function POST(req: Request) {
  const transformStream = new TransformStream();
  const writer = transformStream.writable.getWriter();
  const encoder = new TextEncoder();

  // We are not reading from the request body anymore to avoid immediate close.
  // The server will just keep the connection alive and send pings.
  // The client will handle sending messages via a separate mechanism if needed,
  // but for this test, we are focusing on server-to-client streaming.

  // We send a ping every few seconds to keep the connection alive.
  const intervalId = setInterval(() => {
    try {
      writer.write(encoder.encode(`data: ping\n\n`));
    } catch (e) {
      console.error('Error writing ping:', e);
      clearInterval(intervalId);
    }
  }, 3000);


  // When the client closes the connection, we get an error on write.
  // We can also use req.signal to detect closure.
  req.signal.onabort = () => {
    clearInterval(intervalId);
    try {
      writer.close();
    } catch (e) {
      console.error('Error closing writer on abort:', e);
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
