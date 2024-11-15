import { Env } from '../types/email';
import { generateToken } from '../utils/jwt';

interface LoginCredentials {
  username: string;
  password: string;
}

export async function handleLogin(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  console.log(`[${requestId}] 处理登录请求`);

  try {
    const credentials = await request.json() as LoginCredentials;

    if (credentials.username === env.USER_NAME && credentials.password === env.PASSWORD) {
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
    console.error(`[${requestId}] 登录处理失败:`, error);
    throw error;
  }
}
