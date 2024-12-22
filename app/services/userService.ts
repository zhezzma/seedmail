import { eq, desc, and, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { users } from '../db/schema';
import { D1Database } from '@cloudflare/workers-types';

/**
 * 更新用户列表
 */
export async function updateUsersList(
  db: D1Database,
  email: string,
  requestId: string
): Promise<void> {
  const d1 = drizzle(db);
  const existingUser = await d1.select().from(users).where(eq(users.email, email));

  if (existingUser.length === 0) {
    await d1.insert(users).values({
      email,
      createdAt: new Date().toISOString()
    });
    console.log(`[${requestId}] 新用户已添加: ${email}`);
  }
}

/**
 * 分页获取用户列表
 */
export async function listUsers(
  db: D1Database,
  page: number,
  pageSize: number
): Promise<{
  users: string[];
  total: number;
  totalPages: number;
}> {
  const d1 = drizzle(db);
  const offset = (page - 1) * pageSize;

  const [usersList, totalCount] = await Promise.all([
    d1.select().from(users).limit(pageSize).offset(offset),
    d1.select({ count: sql`count(*)` }).from(users)
  ]);

  const total = Number(totalCount[0].count);

  return {
    users: usersList.map(u => u.email),
    total,
    totalPages: Math.ceil(total / pageSize)
  };
}

/**
 * 删除用户
 */
export async function deleteUser(
  db: D1Database,
  email: string
): Promise<boolean> {
  const d1 = drizzle(db);
  const result = await d1.delete(users).where(eq(users.email, email));
  return result.changes > 0;
}
