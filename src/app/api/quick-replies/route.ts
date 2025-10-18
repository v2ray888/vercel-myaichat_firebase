import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';
import { quickReplies as quickRepliesTable } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const quickReplySchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100, '标题不能超过100个字符'),
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
      where: eq(quickRepliesTable.userId, session.userId),
      orderBy: (quickReplies, { desc }) => [desc(quickReplies.createdAt)],
    });
    return NextResponse.json(replies);
  } catch (error) {
    console.error('Failed to fetch quick replies:', error);
    return NextResponse.json({ error: 'Failed to fetch quick replies' }, { status: 500 });
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

    const { title, content } = validation.data;

    const newReply = await db.insert(quickRepliesTable).values({
      userId: session.userId,
      title,
      content,
    }).returning();

    return NextResponse.json(newReply[0], { status: 201 });
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

    const { title, content } = validation.data;

    const updatedReply = await db.update(quickRepliesTable)
      .set({
        title,
        content,
        updatedAt: new Date(),
      })
      .where(and(eq(quickRepliesTable.id, id), eq(quickRepliesTable.userId, session.userId)))
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
        const deletedReply = await db.delete(quickRepliesTable)
            .where(and(eq(quickRepliesTable.id, id), eq(quickRepliesTable.userId, session.userId)))
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
