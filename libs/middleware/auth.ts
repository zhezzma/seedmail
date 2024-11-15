import { Env } from '../types/email';
import { verifyToken } from '../utils/jwt';

/**
 * 认证中间件
 * @param request 请求对象
 * @param env 环境变量
 * @param requestId 请求ID
 * @returns 如果认证失败返回错误响应，否则返回 null
 */
export async function authMiddleware(
  request: Request, 
  env: Env, 
  requestId: string
): Promise<Response | null> {
  if (request.url.endsWith('/api/login')) {
    return null;
  }

  const isValid = await verifyToken(request, env.JWT_SECRET);
  if (!isValid) {
    console.log(`[${requestId}] 认证失败`);
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }), 
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return null;
}