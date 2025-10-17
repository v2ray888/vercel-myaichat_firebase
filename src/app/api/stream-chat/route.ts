'use server';

// A simple duplex streaming API route.
// The client can send data to the server, and the server can send data back.
// This is a simple echo server that prepends "Echo: " to each message.

export async function POST(req: Request) {
  const transformStream = new TransformStream();
  const writer = transformStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Read from the request stream and echo back.
  (async () => {
    if (req.body) {
      const reader = req.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          // For this demo, we'll just log the client message
          const clientMessage = new TextDecoder().decode(value);
          console.log('Received from client:', clientMessage);

          // And echo it back
          await writer.write(
            encoder.encode(`data: Echo: ${clientMessage}\n\n`)
          );
        }
      } catch (error) {
        console.error('Error reading from request stream:', error);
      } finally {
        // Close the writable stream when the request stream is finished.
        writer.close();
      }
    }
  })();
  
  // We send a ping every few seconds to keep the connection alive.
  const intervalId = setInterval(() => {
    writer.write(encoder.encode(`data: ping\n\n`));
  }, 3000);


  writer.closed.then(() => {
    clearInterval(intervalId);
  });

  return new Response(transformStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
