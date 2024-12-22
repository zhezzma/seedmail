import { Env } from '../types/email';
import { generateToken } from '../utils/jwt';

/**
 * 登录凭证接口
 */
interface LoginCredentials {
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
}

/**
 * 处理用户登录请求
 * @param request HTTP请求对象
 * @param env 环境变量
 * @param requestId 请求ID，用于日志追踪
 * @returns HTTP响应，包含登录结果和JWT令牌
 */
export async function handleLogin(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  console.log(`[${requestId}] 处理登录请求`);

  try {
    // 解析登录凭证
    const credentials = await request.json() as LoginCredentials;

    // 验证用户名和密码
    if (credentials.username === env.USER_NAME && credentials.password === env.PASSWORD) {
      // 生成JWT令牌
      const token = await generateToken(credentials.username, env.JWT_SECRET);

      console.log(`[${requestId}] 用户登录成功: ${credentials.username}`);
      return new Response(
        JSON.stringify({
          success: true,
          token,
          user: { username: credentials.username }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 登录失败: 无效的凭证
    console.log(`[${requestId}] 登录失败: 无效的凭证`);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid credentials'
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    // 登录处理失败
    console.error(`[${requestId}] 登录处理失败:`, error);
    throw error;
  }
}
