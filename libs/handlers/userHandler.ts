import { Env } from '../types/email';
import * as userService from '../services/userService';

/**
 * 处理获取用户列表的请求
 */
export async function handleListUsers(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');

  try {
    const result = await userService.listUsers(env.EMAILS, page, pageSize);

    return new Response(
      JSON.stringify({
        recipients: result.users,
        total: result.total,
        page,
        pageSize,
        totalPages: result.totalPages
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[${requestId}] 获取用户列表失败:`, error);
    throw error;
  }
}

/**
 * 处理删除用户的请求
 */
export async function handleDeleteUser(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  const url = new URL(request.url);
  const email = url.pathname.split('/').pop();

  if (!email) {
    return new Response(
      JSON.stringify({ error: 'Email is required' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const success = await userService.deleteUser(env.EMAILS, email);
    
    if (!success) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ message: 'User deleted successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error(`[${requestId}] 删除用户失败:`, error);
    throw error;
  }
}
