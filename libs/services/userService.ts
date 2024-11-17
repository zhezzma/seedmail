import { KVNamespace } from '@cloudflare/workers-types';

// 常量定义
const USERS_KEY = 'users';

/**
 * 更新用户列表
 */
export async function updateUsersList(
  kv: KVNamespace,
  email: string,
  requestId: string
): Promise<void> {
  const users = await kv.get(USERS_KEY, 'json') as string[] || [];
  if (!users.includes(email)) {
    users.push(email);
    await kv.put(USERS_KEY, JSON.stringify(users));
    console.log(`[${requestId}] 新用户已添加: ${email}`);
  }
}

/**
 * 分页获取用户列表
 */
export async function listUsers(
  kv: KVNamespace,
  page: number,
  pageSize: number
): Promise<{
  users: string[];
  total: number;
  totalPages: number;
}> {
  const users = await kv.get(USERS_KEY, 'json') as string[] || [];

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedUsers = users.slice(start, end);

  return {
    users: paginatedUsers,
    total: users.length,
    totalPages: Math.ceil(users.length / pageSize)
  };
}

/**
 * 删除用户
 */
export async function deleteUser(
  kv: KVNamespace,
  email: string
): Promise<boolean> {
  const users = await kv.get(USERS_KEY, 'json') as string[] || [];
  const index = users.indexOf(email);
  
  if (index === -1) {
    return false;
  }

  users.splice(index, 1);
  await kv.put(USERS_KEY, JSON.stringify(users));
  return true;
}
