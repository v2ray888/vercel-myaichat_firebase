
import { NextRequest, NextResponse } from 'next/server';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true
});

export async function POST(req: NextRequest) {
  try {
    const data = await req.text();
    const [socketId, channelName] = data.split('&').map(p => p.split('=')[1]);

    // For this demo, we are allowing any authenticated user.
    // In a production app, you should add logic here to verify 
    // that the user has permission to access the channel.
    // For example, check if the user is the customer in the conversation
    // or an assigned agent.
    const user = {
      user_id: `user-${Date.now()}`, // Replace with actual user ID
      user_info: { name: 'Test User' },
    };
    
    const authResponse = pusher.authorizeChannel(socketId, channelName, user);
    
    return new NextResponse(JSON.stringify(authResponse), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Pusher auth error:', error);
    return new NextResponse('Forbidden', { status: 403 });
  }
}
