
import { NextRequest, NextResponse } from 'next/server';
import Pusher from 'pusher';
import { getSession } from '@/lib/session';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true
});

export async function POST(req: NextRequest) {
  const session = await getSession();

  // For private channels, user must be authenticated
  if (!session?.userId) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const data = await req.text();
    const [socketId, channelName] = data.split('&').map(p => p.split('=')[1]);

    // In a production app, you should add logic here to verify 
    // that the user has permission to access the channel.
    // e.g. check if user ID from session matches the ID in the channel name
    const user = {
      user_id: session.userId,
      user_info: { 
        name: session.name,
        email: session.email,
      },
    };
    
    const authResponse = pusher.authorizeChannel(socketId, channelName, user);
    
    return new NextResponse(JSON.stringify(authResponse), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Pusher auth error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
