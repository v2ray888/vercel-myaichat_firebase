import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { desc, eq, and, ne, count } from 'drizzle-orm';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';

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

const userUpdateSchema = z.object({
  id: z.string().uuid('无效的用户ID'),
  name: z.string().min(2, "姓名至少需要2个字符"),
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少需要6个字符").optional().or(z.literal('')),
});


// PUT (update) a user
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    // Admin editing a specific user
    let validation;
    let idToUpdate;
    
    // If an ID is passed, it's an admin editing. Otherwise, a user is editing their own profile.
    if (body.id) {
        validation = userUpdateSchema.safeParse(body);
        if (!validation.success) {
             return NextResponse.json({ error: '无效的数据', details: validation.error.flatten() }, { status: 400 });
        }
        idToUpdate = validation.data.id;
    } else {
        // User editing their own profile
        const selfUpdateSchema = userUpdateSchema.omit({ id: true });
        validation = selfUpdateSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: '无效的数据', details: validation.error.flatten() }, { status: 400 });
        }
        idToUpdate = session.userId;
    }


    const { name, email, password } = validation.data;

    const updateData: { name: string; email: string; passwordHash?: string, updatedAt: Date } = {
        name,
        email,
        updatedAt: new Date(),
    };

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }
    
    const targetUser = await db.query.users.findFirst({
        where: eq(users.id, idToUpdate),
    });

    if (!targetUser) {
         return NextResponse.json({ error: '用户未找到' }, { status: 404 });
    }

    // Check if new email is already taken by another user
    if (email !== targetUser.email) {
        const existingUser = await db.query.users.findFirst({
            where: and(eq(users.email, email), ne(users.id, idToUpdate)),
        });
        if(existingUser) {
            return NextResponse.json({ error: { email: ['该邮箱已被其他用户注册'] }}, { status: 409 });
        }
    }

    const updatedUser = await db.update(users)
      .set(updateData)
      .where(eq(users.id, idToUpdate))
      .returning({
         id: users.id,
         name: users.name,
         email: users.email,
         createdAt: users.createdAt,
      });

    return NextResponse.json(updatedUser[0]);
  } catch (error: any) {
    console.error('Failed to update user:', error);
    if (error.code === '23505') { // Postgres unique violation
        return NextResponse.json({ error: { email: ['该邮箱已被注册'] } }, { status: 409 });
    }
    return NextResponse.json({ error: '更新用户失败' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const idToDelete = searchParams.get('id');

  if (!idToDelete) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const userCountResult = await db.select({ value: count() }).from(users);
    const userCount = userCountResult[0].value;

    if (userCount <= 1) {
      return NextResponse.json({ error: '无法删除最后一个用户' }, { status: 400 });
    }
    
    if (idToDelete === session.userId) {
      return NextResponse.json({ error: '无法删除您自己的账户' }, { status: 400 });
    }

    const deletedUser = await db.delete(users).where(eq(users.id, idToDelete)).returning({ id: users.id });

    if (deletedUser.length === 0) {
      return NextResponse.json({ error: '用户未找到' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: deletedUser[0].id });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json({ error: '删除用户失败' }, { status: 500 });
  }
}
