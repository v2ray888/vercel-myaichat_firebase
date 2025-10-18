import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { desc } from 'drizzle-orm';

// GET all users
export async function GET(req: NextRequest) {
  const session = await getSession();
  // In a real app, you'd want to check for an admin role here.
  // For now, we'll just check if the user is logged in.
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allUsers = await db.query.users.findMany({
        columns: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
        },
        orderBy: [desc(users.createdAt)],
    });
    return NextResponse.json(allUsers);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
