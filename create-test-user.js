import bcrypt from 'bcryptjs';
import { db } from './src/lib/db.js';
import { users } from './drizzle/schema.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

async function createTestUser() {
  try {
    const hashedPassword = await bcrypt.hash('test123', 10);
    const result = await db.insert(users).values({
      email: 'test@example.com',
      passwordHash: hashedPassword,
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    console.log('Test user created:', result);
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

createTestUser();