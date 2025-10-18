import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';
import { quickReplies } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';


const quickReplySchema = z.object({
  content: z.string().min(1, '内容不能为空'),
});

// GET all quick replies for the user
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const replies = await db.query.quickReplies.findMany({
      where: eq(quickReplies.userId, session.userId),
      orderBy: (replies, { desc }) => [desc(replies.createdAt)],
    });
    return NextResponse.json(replies);
  } catch (error) {
    console.error('Failed to fetch quick replies:', error);
    // Return an empty array but with a server error status
    // This prevents the entire page from crashing on the frontend
    return NextResponse.json([], { status: 500, statusText: 'Failed to fetch quick replies' });
  }
}

// POST a new quick reply
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validation = quickReplySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid data', details: validation.error.flatten() }, { status: 400 });
    }

    const { content } = validation.data;
    
    const newReplyData = {
        id: uuidv4(),
        userId: session.userId,
        content: content,
        createdAt: new Date(),
        updatedAt: new Date(),
    }

    // Insert into the database.
    await db.insert(quickReplies).values(newReplyData);
    
    // Return the manually constructed object. This is an optimistic response.
    // The frontend can use this to update the UI immediately.
    return NextResponse.json(newReplyData, { status: 201 });

  } catch (error) {
    console.error('Failed to create quick reply:', error);
    return NextResponse.json({ error: 'Failed to create quick reply' }, { status: 500 });
  }
}

// PUT (update) an existing quick reply
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, ...data } = await req.json();
    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    const validation = quickReplySchema.safeParse(data);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid data', details: validation.error.flatten() }, { status: 400 });
    }

    const { content } = validation.data;

    const updatedReply = await db.update(quickReplies)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(and(eq(quickReplies.id, id), eq(quickReplies.userId, session.userId)))
      .returning();

    if (updatedReply.length === 0) {
        return NextResponse.json({ error: 'Quick reply not found or you do not have permission to edit it.' }, { status: 404 });
    }

    return NextResponse.json(updatedReply[0]);
  } catch (error) {
    console.error('Failed to update quick reply:', error);
    return NextResponse.json({ error: 'Failed to update quick reply' }, { status: 500 });
  }
}

// DELETE a quick reply
export async function DELETE(req: NextRequest) {
    const session = await getSession();
    if (!session?.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    try {
        const deletedReply = await db.delete(quickReplies)
            .where(and(eq(quickReplies.id, id), eq(quickReplies.userId, session.userId)))
            .returning();
        
        if (deletedReply.length === 0) {
            return NextResponse.json({ error: 'Quick reply not found or you do not have permission to delete it.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error('Failed to delete quick reply:', error);
        return NextResponse.json({ error: 'Failed to delete quick reply' }, { status: 500 });
    }
}
