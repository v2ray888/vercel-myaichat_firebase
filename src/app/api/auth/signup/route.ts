import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createSession } from '@/lib/session';

const signupSchema = z.object({
  name: z.string().min(2, "姓名至少需要2个字符"),
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少需要6个字符"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = signupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const { name, email, password } = validation.data;

    const existingUser = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json({ error: { email: ['该邮箱已被注册'] } }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    const newUser = await db.insert(users).values({
        name,
        email,
        passwordHash,
    }).returning({
        id: users.id,
        name: users.name,
        email: users.email
    });

    const user = newUser[0];

    await createSession(user.id, user.email, user.name);

    return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: { form: ['注册失败，请稍后重试'] } }, { status: 500 });
  }
}
