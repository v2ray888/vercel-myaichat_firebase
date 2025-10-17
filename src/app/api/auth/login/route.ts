import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createSession } from '@/lib/session';

const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(1, "密码不能为空"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { email, password } = validation.data;

    const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email),
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: { form: ['邮箱或密码错误'] } }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json({ error: { form: ['邮箱或密码错误'] } }, { status: 401 });
    }

    await createSession(user.id, user.email, user.name);

    return NextResponse.json({ message: '登录成功' }, { status: 200 });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: { form: ['登录失败，请稍后重试'] } }, { status: 500 });
  }
}
